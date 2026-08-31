import { PrismaClient, TransactionNature, ClassificationStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface TransferPairCandidate {
  id: string; // ID único da sugestão
  score: number; // 0.0 a 1.0 (confiança da sugestão)
  outboundTransaction: {
    id: string;
    accountId: string;
    accountName: string;
    date: Date;
    amount: number;
    description: string;
    originalDescription?: string | null;
  };
  inboundTransaction: {
    id: string;
    accountId: string;
    accountName: string;
    date: Date;
    amount: number;
    description: string;
    originalDescription?: string | null;
  };
  dateDiffDays: number;
}

export interface FindTransferPairsOptions {
  maxDateDiffDays?: number; // Padrão: 3 dias
}

const FORBIDDEN_TRANSFER_NATURES: TransactionNature[] = [
  TransactionNature.CREDIT_CARD_PURCHASE,
  TransactionNature.CREDIT_CARD_PAYMENT,
  TransactionNature.INVESTMENT_CONTRIBUTION,
  TransactionNature.INVESTMENT_REDEMPTION,
];

export class InternalTransferMatchingEngine {
  /**
   * Localiza candidatos a transferências entre contas próprias do mesmo usuário
   */
  static async findSuggestedTransferPairs(
    userId: string,
    options: FindTransferPairsOptions = {}
  ): Promise<TransferPairCandidate[]> {
    const maxDays = options.maxDateDiffDays ?? 3;

    // Buscar transações de saída (DEBIT) elegíveis sem par e sem vínculo de cartão/investimento
    const debits = await prisma.transaction.findMany({
      where: {
        userId,
        direction: 'DEBIT',
        transferPairId: null,
        creditCardId: null,
        deletedAt: null,
        nature: { notIn: FORBIDDEN_TRANSFER_NATURES },
        classificationStatus: { notIn: [ClassificationStatus.IGNORED] },
      },
      include: { account: true },
      orderBy: { date: 'asc' },
    });

    // Buscar transações de entrada (CREDIT) elegíveis sem par e sem vínculo de cartão/investimento
    const credits = await prisma.transaction.findMany({
      where: {
        userId,
        direction: 'CREDIT',
        transferPairId: null,
        creditCardId: null,
        deletedAt: null,
        nature: { notIn: FORBIDDEN_TRANSFER_NATURES },
        classificationStatus: { notIn: [ClassificationStatus.IGNORED] },
      },
      include: { account: true },
      orderBy: { date: 'asc' },
    });

    const candidates: TransferPairCandidate[] = [];
    const pairedCreditIds = new Set<string>();

    for (const debit of debits) {
      const debitAmount = Math.abs(Number(debit.amount));
      const debitTime = debit.date.getTime();

      let bestMatch: (typeof credits)[0] | null = null;
      let minDateDiffDays = Infinity;

      for (const credit of credits) {
        if (credit.accountId === debit.accountId) continue; // Deve ser entre contas diferentes
        if (pairedCreditIds.has(credit.id)) continue;

        const creditAmount = Math.abs(Number(credit.amount));

        if (Math.abs(debitAmount - creditAmount) < 0.001) {
          const diffMs = Math.abs(credit.date.getTime() - debitTime);
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (diffDays <= maxDays && diffDays < minDateDiffDays) {
            minDateDiffDays = diffDays;
            bestMatch = credit;
          }
        }
      }

      if (bestMatch) {
        pairedCreditIds.add(bestMatch.id);

        let score = 1.0;
        if (minDateDiffDays > 0) score -= minDateDiffDays * 0.1;

        candidates.push({
          id: `suggestion_${debit.id}_${bestMatch.id}`,
          score: Math.max(0.5, score),
          dateDiffDays: Math.round(minDateDiffDays * 10) / 10,
          outboundTransaction: {
            id: debit.id,
            accountId: debit.accountId,
            accountName: debit.account.name,
            date: debit.date,
            amount: Number(debit.amount),
            description: debit.description,
            originalDescription: debit.originalDescription,
          },
          inboundTransaction: {
            id: bestMatch.id,
            accountId: bestMatch.accountId,
            accountName: bestMatch.account.name,
            date: bestMatch.date,
            amount: Number(bestMatch.amount),
            description: bestMatch.description,
            originalDescription: bestMatch.originalDescription,
          },
        });
      }
    }

    return candidates;
  }

  /**
   * Confirma o pareamento de duas transações com o MESMO UUID compartilhado de par e validações estritas
   */
  static async confirmTransferPair(
    userId: string,
    outboundTransactionId: string,
    inboundTransactionId: string
  ): Promise<{ success: boolean; sharedPairId: string; outboundId: string; inboundId: string }> {
    const outbound = await prisma.transaction.findFirst({
      where: { id: outboundTransactionId, userId },
    });
    const inbound = await prisma.transaction.findFirst({
      where: { id: inboundTransactionId, userId },
    });

    if (!outbound || !inbound) {
      throw new Error('Uma ou ambas as transações do par não foram encontradas.');
    }

    // 1. Impedir se já estiverem anuladas (deletedAt)
    if (outbound.deletedAt || inbound.deletedAt) {
      throw new Error('Não é possível parear transações que foram anuladas/excluídas.');
    }

    // 2. Impedir se já estiverem pareadas
    if (outbound.transferPairId || inbound.transferPairId) {
      throw new Error('Uma das transações já se encontra vinculada a um par de transferência.');
    }

    // 3. Impedir se vinculadas a cartão ou investimento
    if (outbound.creditCardId || inbound.creditCardId) {
      throw new Error('Transações de cartão de crédito não podem ser pareadas como transferência interna.');
    }

    if (
      FORBIDDEN_TRANSFER_NATURES.includes(outbound.nature) ||
      FORBIDDEN_TRANSFER_NATURES.includes(inbound.nature)
    ) {
      throw new Error('Transações de cartão ou investimento não podem ser pareadas como transferência interna.');
    }

    // Criar um UUID compartilhado exato para ambas as pontas
    const sharedPairId = crypto.randomUUID();

    // Salvar estados anteriores nas notas para restauração ao desparear
    const outboundBackupNote = `[PREV_STATE:${outbound.nature}:${outbound.classificationStatus}]`;
    const inboundBackupNote = `[PREV_STATE:${inbound.nature}:${inbound.classificationStatus}]`;

    await prisma.$transaction([
      prisma.transaction.update({
        where: { id: outbound.id },
        data: {
          transferPairId: sharedPairId,
          destinationAccountId: inbound.accountId,
          nature: TransactionNature.INTERNAL_TRANSFER,
          classificationStatus: ClassificationStatus.CONFIRMED,
          notes: outbound.notes ? `${outbound.notes} ${outboundBackupNote}` : outboundBackupNote,
        },
      }),
      prisma.transaction.update({
        where: { id: inbound.id },
        data: {
          transferPairId: sharedPairId,
          destinationAccountId: outbound.accountId,
          nature: TransactionNature.INTERNAL_TRANSFER,
          classificationStatus: ClassificationStatus.CONFIRMED,
          notes: inbound.notes ? `${inbound.notes} ${inboundBackupNote}` : inboundBackupNote,
        },
      }),
    ]);

    return {
      success: true,
      sharedPairId,
      outboundId: outbound.id,
      inboundId: inbound.id,
    };
  }

  /**
   * Desfaz (despareia) a transferência interna restaurando a classificação/natureza anterior registrada
   */
  static async unpairTransfer(
    userId: string,
    transactionId: string
  ): Promise<{ success: boolean; unlinkedIds: string[] }> {
    const tx = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!tx) {
      throw new Error(`Transação de ID ${transactionId} não encontrada.`);
    }

    const pairId = tx.transferPairId;
    if (!pairId) {
      throw new Error('A transação fornecida não possui um par vinculado para desfazer.');
    }

    // Buscar todas as transações que compartilham este mesmo transferPairId
    const pairedTransactions = await prisma.transaction.findMany({
      where: { transferPairId: pairId, userId },
    });

    const unlinkedIds: string[] = [];

    for (const pairedTx of pairedTransactions) {
      unlinkedIds.push(pairedTx.id);

      // Restaurar estado prévio registrado nas notas se existente
      let restoredNature: TransactionNature = TransactionNature.UNCLASSIFIED;
      let restoredStatus: ClassificationStatus = ClassificationStatus.PENDING;
      let updatedNotes = pairedTx.notes || '';

      const matchState = updatedNotes.match(/\[PREV_STATE:([A-Z_]+):([A-Z_]+)\]/);
      if (matchState) {
        restoredNature = matchState[1] as TransactionNature;
        restoredStatus = matchState[2] as ClassificationStatus;
        updatedNotes = updatedNotes.replace(/\[PREV_STATE:[A-Z_]+:[A-Z_]+\]/, '').trim();
      }

      await prisma.transaction.update({
        where: { id: pairedTx.id },
        data: {
          transferPairId: null,
          destinationAccountId: null,
          nature: restoredNature,
          classificationStatus: restoredStatus,
          notes: updatedNotes || null,
        },
      });
    }

    return {
      success: true,
      unlinkedIds,
    };
  }
}
