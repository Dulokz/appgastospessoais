import { PrismaClient, TransactionNature, ClassificationStatus, TransactionOrigin } from '@prisma/client';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface BbAutoRedemptionSuggestion {
  transactionId: string;
  matchedTransactionId?: string;
  matchedTransactionDescription?: string;
  amount: number;
  date: Date;
  description: string;
  suggestionMessage: string;
  sourceAccountId: string;
  sourceAccountName: string;
  suggestedTargetAccountName: string;
  targetAccountExists: boolean;
  existingTargetAccountId?: string;
  isConsolidatedSumMatch?: boolean;
}

export class BbAutoRedemptionEngine {
  /**
   * Normaliza strings removendo acentos e convertendo para caixa alta
   */
  static normalizeText(text?: string | null): string {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }

  /**
   * Identifica se uma descrição corresponde a um resgate ou aplicação automática (Banco do Brasil e similares)
   * NOTA: OUROCAP removido pois é título de capitalização.
   */
  static isBbAutoRedemptionOrApplication(description?: string | null): boolean {
    const norm = this.normalizeText(description);
    if (!norm) return false;

    // Se for Ourocap, NÃO é resgate automático de poupança
    if (norm.includes('OUROCAP')) return false;

    const keywords = [
      'RESGATE POUPANCA',
      'RESGATE POUP',
      'RESGATE APLICACAO',
      'RESGATE APLIC',
      'RESG AUTOM',
      'RESG.AUTOM',
      'RESG. AUTOM',
      'RESGATE AUTOMATICO',
      'SALDO RESG',
      'APLICACAO AUTOMATICA',
      'APLICACAO FINANCEIRA',
      'APLIC AUTOM',
      'APLIC.AUTOM',
      'APLIC POUPANCA',
    ];

    return keywords.some((kw) => norm.includes(kw));
  }

  /**
   * Detecta todas as transações elegíveis para sugestão de Resgate/Aplicação Automática BB,
   * suportando tanto correspondência 1-para-1 quanto resgate consolidado de soma das saídas.
   */
  static async detectSuggestions(userId: string): Promise<BbAutoRedemptionSuggestion[]> {
    const pendingTxs = await prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        classificationStatus: { in: [ClassificationStatus.PENDING, ClassificationStatus.FLAGGED_DUPLICATE] },
      },
      include: { account: true },
      orderBy: { date: 'desc' },
    });

    const suggestions: BbAutoRedemptionSuggestion[] = [];

    for (const tx of pendingTxs) {
      if (!this.isBbAutoRedemptionOrApplication(tx.description || tx.originalDescription)) {
        continue;
      }

      const txAmt = Math.abs(Number(tx.amount));

      // 1. Tentar encontrar lançamento oposto 1-para-1 (mesmo valor exato)
      const candidateOneToOne = pendingTxs.find((cand) => {
        if (cand.id === tx.id) return false;
        const candAmt = Math.abs(Number(cand.amount));
        if (Math.abs(candAmt - txAmt) > 0.01) return false; // Valores iguais
        if (cand.direction === tx.direction) return false; // Direção oposta

        const diffMs = Math.abs(cand.date.getTime() - tx.date.getTime());
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays <= 1.0;
      });

      let matchedDesc: string | undefined = undefined;
      let matchedId: string | undefined = undefined;
      let isConsolidatedSumMatch = false;

      if (candidateOneToOne) {
        matchedId = candidateOneToOne.id;
        matchedDesc = candidateOneToOne.originalDescription || candidateOneToOne.description;
      } else {
        // 2. Tentar encontrar resgate consolidado (soma das saídas do período cobrindo este resgate)
        const oppositeTxs = pendingTxs.filter(
          (c) => c.id !== tx.id && c.direction !== tx.direction
        );

        const debitsSum = oppositeTxs.reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);

        if (oppositeTxs.length > 0 && Math.abs(debitsSum - txAmt) <= 5.0) {
          isConsolidatedSumMatch = true;
          matchedDesc = `Resgate consolidado do BB (R$ ${txAmt.toFixed(2)}) cobrindo a soma das saídas do período (${oppositeTxs.length} saídas de R$ ${debitsSum.toFixed(2)})`;
        }
      }

      const savingsAccount = await prisma.account.findFirst({
        where: {
          userId,
          deletedAt: null,
          name: { contains: 'Poupança', mode: 'insensitive' },
        },
      });

      const descText = tx.originalDescription || tx.description;
      let msg = `Detectamos um possível resgate/aplicação automática do BB (${descText} no valor de R$ ${txAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Isso parece ser uma transferência entre seu dinheiro, não uma receita. Confirmar?`;

      if (isConsolidatedSumMatch) {
        msg = `Detectamos que este crédito de ${descText} (R$ ${txAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) é um resgate automático consolidado do BB cobrindo as saídas do período. Isso é uma transferência entre seu próprio dinheiro e não infla sua receita. Confirmar?`;
      }

      suggestions.push({
        transactionId: tx.id,
        matchedTransactionId: matchedId,
        matchedTransactionDescription: matchedDesc,
        amount: Math.abs(Number(tx.amount)),
        date: tx.date,
        description: descText,
        suggestionMessage: msg,
        sourceAccountId: tx.accountId,
        sourceAccountName: tx.account.name,
        suggestedTargetAccountName: 'Poupança / Aplicação BB',
        targetAccountExists: Boolean(savingsAccount),
        existingTargetAccountId: savingsAccount?.id,
        isConsolidatedSumMatch,
      });
    }

    return suggestions;
  }

  /**
   * Confirma e classifica o resgate/aplicação como Transferência Própria (INTERNAL_TRANSFER),
   * garantindo ISOLAMENTO TOTAL da DRE (não entra em receitas, despesas ou aporte).
   */
  static async confirmPair(params: {
    userId: string;
    transactionId: string;
    matchedTransactionId?: string;
    targetAccountId?: string;
    createSavingsAccountIfMissing?: boolean;
  }) {
    const { userId, transactionId, matchedTransactionId, targetAccountId, createSavingsAccountIfMissing } = params;

    const tx1 = await prisma.transaction.findFirst({
      where: { id: transactionId, userId, deletedAt: null },
      include: { account: true },
    });
    if (!tx1) throw new Error(`Transação ${transactionId} não encontrada.`);

    let destAccId = targetAccountId;

    if (!destAccId && createSavingsAccountIfMissing) {
      let savingsAcc = await prisma.account.findFirst({
        where: { userId, name: 'Poupança / Aplicação BB', deletedAt: null },
      });

      if (!savingsAcc) {
        savingsAcc = await prisma.account.create({
          data: {
            userId,
            name: 'Poupança / Aplicação BB',
            type: 'SAVINGS',
          },
        });
      }
      destAccId = savingsAcc.id;
    }

    return await prisma.$transaction(async (txPrisma) => {
      // 1. Classificar o Resgate Poupança como INTERNAL_TRANSFER
      await txPrisma.transaction.update({
        where: { id: tx1.id },
        data: {
          nature: TransactionNature.INTERNAL_TRANSFER,
          transactionType: 'TRANSFER',
          classificationStatus: ClassificationStatus.CONFIRMED,
          destinationAccountId: destAccId || null,
          counterpartyName: 'Poupança / Aplicação BB (Resgate Automático)',
        },
      });

      // 2. Se houver transação oposta 1-para-1, atualizar também
      if (matchedTransactionId) {
        const tx2 = await txPrisma.transaction.findFirst({
          where: { id: matchedTransactionId, userId, deletedAt: null },
        });

        if (tx2) {
          await txPrisma.transaction.update({
            where: { id: tx2.id },
            data: {
              nature: TransactionNature.INTERNAL_TRANSFER,
              transactionType: 'TRANSFER',
              classificationStatus: ClassificationStatus.CONFIRMED,
              destinationAccountId: destAccId || tx1.accountId,
              counterpartyName: 'Resgate Automático BB',
            },
          });
        }
      }

      return {
        success: true,
        transactionId: tx1.id,
        matchedTransactionId,
        classifiedAs: TransactionNature.INTERNAL_TRANSFER,
        destinationAccountId: destAccId,
      };
    });
  }

  /**
   * Reverte totalmente a confirmação de resgate/aplicação, voltando os itens para PENDING / UNCLASSIFIED
   */
  static async unpair(userId: string, transactionId: string) {
    const tx1 = await prisma.transaction.findFirst({
      where: { id: transactionId, userId, deletedAt: null },
    });
    if (!tx1) throw new Error(`Transação ${transactionId} não encontrada.`);

    return await prisma.$transaction(async (txPrisma) => {
      await txPrisma.transaction.update({
        where: { id: tx1.id },
        data: {
          nature: TransactionNature.UNCLASSIFIED,
          transactionType: tx1.direction === 'CREDIT' ? 'INCOME' : 'EXPENSE',
          classificationStatus: ClassificationStatus.PENDING,
          destinationAccountId: null,
          counterpartyName: null,
        },
      });

      return { success: true, transactionId: tx1.id, status: 'REVERTED' };
    });
  }
}
