import { PrismaClient, TransactionPeriodType, TransactionOrigin, ClassificationStatus, Prisma } from '@prisma/client';
import { parseOfxContent, ParsedOfxResult, ParsedOfxTransaction } from './ofx-parser';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface OfxPreviewTransactionItem {
  index: number;
  fitId?: string;
  date: Date;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  description: string;
  originalDescription: string;
  periodType: TransactionPeriodType;
  status: 'NEW' | 'STRONG_DUPLICATE' | 'FLAGGED_DUPLICATE';
  possibleDuplicateOfId?: string;
  isProbableTransfer?: boolean;
  isProbableCardPayment?: boolean;
}

export interface ExtractedOfxMetadata {
  identifiedInstitution: string;
  maskedAccount: string;
  bankId: string;
  acctId: string;
  isInstitutionDivergent: boolean;
  targetAccountInstitution?: string;
  divergenceMessage?: string;
}

export interface OfxPreviewResult {
  filename: string;
  accountId: string;
  accountName: string;
  extractedMetadata: ExtractedOfxMetadata;
  period: {
    minDate: Date | null;
    maxDate: Date | null;
  };
  totals: {
    totalRecords: number;
    newRecords: number;
    duplicateRecords: number;
    flaggedDuplicatesCount: number;
    creditsCount: number;
    creditsSum: number;
    debitsCount: number;
    debitsSum: number;
  };
  categoriesSummary: {
    newRecords: number;
    duplicateRecords: number;
    probableTransfers: number;
    probableCardPayments: number;
    triageItems: number;
  };
  transactions: OfxPreviewTransactionItem[];
  sampleTransactions: OfxPreviewTransactionItem[];
  parseErrors: string[];
}

export interface OfxImportExecutionResult {
  batchId: string;
  filename: string;
  importedAt: Date;
  totalRecords: number;
  newRecords: number;
  duplicateRecords: number;
  pendingRecords: number;
  flaggedDuplicates: number;
  periodType: TransactionPeriodType;
  parseErrors: string[];
}

export function identifyInstitutionFromBankId(bankId?: string, rawContent?: string): string {
  if (!bankId && !rawContent) return 'Instituição não identificada';

  const cleanBankId = (bankId || '').trim();
  const upperContent = (rawContent || '').toUpperCase();

  if (cleanBankId === '001' || upperContent.includes('BANCO DO BRASIL') || upperContent.includes('BRASIL')) {
    return 'Banco do Brasil';
  }
  if (cleanBankId === '756' || upperContent.includes('SICOOB')) {
    return 'Sicoob';
  }
  if (cleanBankId === '341' || upperContent.includes('ITAU') || upperContent.includes('ITAÚ')) {
    return 'Itaú Unibanco';
  }
  if (cleanBankId === '237' || upperContent.includes('BRADESCO')) {
    return 'Bradesco';
  }
  if (cleanBankId === '033' || upperContent.includes('SANTANDER')) {
    return 'Santander';
  }
  if (cleanBankId === '104' || upperContent.includes('CAIXA')) {
    return 'Caixa Econômica Federal';
  }
  if (cleanBankId === '260' || upperContent.includes('NUBANK')) {
    return 'Nubank';
  }
  if (cleanBankId === '077' || upperContent.includes('INTER')) {
    return 'Banco Inter';
  }

  return cleanBankId ? `Banco Código ${cleanBankId}` : 'Instituição Extrato';
}

export function maskAccountNumber(acctId?: string): string {
  if (!acctId) return '***';
  const clean = acctId.trim();
  if (clean.length <= 4) return `***${clean}`;
  return `***${clean.substring(clean.length - 4)}`;
}

export function calculateFingerprint(date: Date, amount: number, description: string): string {
  const dateStr = date.toISOString().split('T')[0];
  const amountStr = amount.toFixed(4);
  const normDesc = description.trim().toLowerCase().replace(/\s+/g, ' ');
  const raw = `${dateStr}_${amountStr}_${normDesc}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Normaliza e gera um FITID único e seguro.
 * Banco do Brasil usa FITIDs genéricos fixos (ex: "148" para todo Resgate Poupança).
 * Esta função anexa a data e o valor ao FITID se for um FITID genérico de lote.
 */
export function buildUniqueFitId(rawFitId: string | undefined | null, date: Date, amount: number, direction: string): string | null {
  if (!rawFitId || rawFitId.trim() === '') return null;
  const clean = rawFitId.trim();

  // FITIDs curtos/estáticos como "148" ou "0" ou "999" usados pelo Banco do Brasil em movimentações de lote
  if (clean.length <= 4 || clean === '148' || clean === '0') {
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const amtStr = Math.abs(amount).toFixed(2).replace('.', '');
    return `${clean}_${dateStr}_${amtStr}_${direction.toLowerCase()}`;
  }

  return clean;
}

export function getPeriodTypeByAccountType(accountType?: string): TransactionPeriodType {
  if (accountType === 'CREDIT_CARD') {
    return TransactionPeriodType.CARD_IMPORT;
  }
  return TransactionPeriodType.BANK_IMPORT;
}

export class OfxImporterService {
  /**
   * Gera uma prévia completa (EM MEMÓRIA, SEM GRAVAR NO BANCO)
   */
  static async previewImport(params: {
    userId: string;
    accountId: string;
    filename: string;
    fileContent: string;
  }): Promise<OfxPreviewResult> {
    const { userId, accountId, filename, fileContent } = params;

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId, active: true, deletedAt: null },
      include: { financialInstitution: true },
    });
    if (!account) {
      throw new Error(`Conta bancária de ID "${accountId}" não foi encontrada ou não está ativa para o usuário.`);
    }

    const { header, transactions, parseErrors } = parseOfxContent(fileContent);
    const targetPeriodType = getPeriodTypeByAccountType(account.type);

    const existingTxs = await prisma.transaction.findMany({
      where: { accountId, deletedAt: null },
      select: { id: true, fitId: true, importHash: true, direction: true, amount: true, date: true },
    });

    const existingFitMap = new Map<string, string>(); // fitId -> direction
    const existingHashMap = new Map<string, string>();

    for (const et of existingTxs) {
      if (et.fitId) {
        existingFitMap.set(et.fitId, et.direction);
      }
      if (et.importHash) {
        existingHashMap.set(et.importHash, et.id);
      }
    }

    const previewItems: OfxPreviewTransactionItem[] = [];

    let creditsCount = 0;
    let creditsSum = 0;
    let debitsCount = 0;
    let debitsSum = 0;
    let duplicateRecords = 0;
    let flaggedDuplicatesCount = 0;
    let newRecords = 0;

    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    let idx = 0;
    for (const tx of transactions) {
      idx++;
      const direction = tx.type === 'CREDIT' ? 'CREDIT' : 'DEBIT';

      if (direction === 'CREDIT') {
        creditsCount++;
        creditsSum += Math.abs(tx.amount);
      } else {
        debitsCount++;
        debitsSum += Math.abs(tx.amount);
      }

      if (!minDate || tx.date < minDate) minDate = tx.date;
      if (!maxDate || tx.date > maxDate) maxDate = tx.date;

      let status: 'NEW' | 'STRONG_DUPLICATE' | 'FLAGGED_DUPLICATE' = 'NEW';
      let possibleDuplicateOfId: string | undefined = undefined;

      const computedFitId = buildUniqueFitId(tx.fitId, tx.date, tx.amount, direction);

      if (computedFitId && existingFitMap.has(computedFitId)) {
        status = 'STRONG_DUPLICATE';
        duplicateRecords++;
      } else {
        const fingerprint = calculateFingerprint(tx.date, tx.amount, tx.description);
        const matchedId = existingHashMap.get(fingerprint);

        if (matchedId && !computedFitId) {
          status = 'FLAGGED_DUPLICATE';
          possibleDuplicateOfId = matchedId;
          flaggedDuplicatesCount++;
        } else {
          newRecords++;
        }
      }

      const isProbableTransfer =
        tx.description.toUpperCase().includes('PIX') ||
        tx.description.toUpperCase().includes('TED') ||
        tx.description.toUpperCase().includes('DOC') ||
        tx.description.toUpperCase().includes('RESGATE');

      const isProbableCardPayment =
        tx.description.toUpperCase().includes('FATURA') ||
        tx.description.toUpperCase().includes('PAGTO CARTAO');

      previewItems.push({
        index: idx,
        fitId: computedFitId || undefined,
        date: tx.date,
        amount: tx.amount,
        direction,
        description: tx.description,
        originalDescription: tx.memo || tx.name || tx.description,
        periodType: targetPeriodType,
        status,
        possibleDuplicateOfId,
        isProbableTransfer,
        isProbableCardPayment,
      });
    }

    const identifiedInstName = identifyInstitutionFromBankId(header.bankId, fileContent);
    const targetInstName = account.financialInstitution?.name || account.name;
    const isDivergent =
      identifiedInstName !== 'Instituição não identificada' &&
      !targetInstName.toLowerCase().includes(identifiedInstName.toLowerCase()) &&
      !identifiedInstName.toLowerCase().includes(targetInstName.toLowerCase());

    return {
      filename,
      accountId,
      accountName: account.name,
      extractedMetadata: {
        identifiedInstitution: identifiedInstName,
        maskedAccount: maskAccountNumber(header.acctId),
        bankId: header.bankId || '',
        acctId: header.acctId || '',
        isInstitutionDivergent: isDivergent,
        targetAccountInstitution: targetInstName,
        divergenceMessage: isDivergent
          ? `Alerta: O arquivo OFX indica "${identifiedInstName}", mas a conta selecionada é "${targetInstName}".`
          : undefined,
      },
      period: { minDate, maxDate },
      totals: {
        totalRecords: transactions.length,
        newRecords,
        duplicateRecords,
        flaggedDuplicatesCount,
        creditsCount,
        creditsSum,
        debitsCount,
        debitsSum,
      },
      categoriesSummary: {
        newRecords,
        duplicateRecords,
        probableTransfers: previewItems.filter((i) => i.isProbableTransfer).length,
        probableCardPayments: previewItems.filter((i) => i.isProbableCardPayment).length,
        triageItems: newRecords + flaggedDuplicatesCount,
      },
      transactions: previewItems,
      sampleTransactions: previewItems.slice(0, 10),
      parseErrors,
    };
  }

  /**
   * Executa a importação definitiva do arquivo OFX garantindo a leitura e gravação de TODOS os resgates do Banco do Brasil
   */
  static async executeImport(params: {
    userId: string;
    accountId: string;
    filename: string;
    fileContent: string;
  }): Promise<OfxImportExecutionResult> {
    const { userId, accountId, filename, fileContent } = params;

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId, active: true, deletedAt: null },
    });
    if (!account) {
      throw new Error(`Importação bloqueada: A conta de destino (ID "${accountId}") não existe ou não é válida para este usuário.`);
    }

    const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    const { transactions, parseErrors } = parseOfxContent(fileContent);

    if (transactions.length === 0) {
      throw new Error('Arquivo OFX sem lançamentos válidos.');
    }

    const targetPeriodType = getPeriodTypeByAccountType(account.type);
    const targetOrigin = account.type === 'CREDIT_CARD' ? TransactionOrigin.CARD_IMPORT : TransactionOrigin.BANK_IMPORT;

    // PRE-FETCH DE FITIDS E HASHES EXISTENTES DA CONTA
    const existingTxs = await prisma.transaction.findMany({
      where: { accountId, deletedAt: null },
      select: { id: true, fitId: true, importHash: true, direction: true },
    });

    const usedFitSet = new Set<string>();
    const existingFitDirectionMap = new Map<string, string>();
    const existingHashMap = new Map<string, string>();

    for (const et of existingTxs) {
      if (et.fitId) {
        usedFitSet.add(et.fitId);
        existingFitDirectionMap.set(et.fitId, et.direction);
      }
      if (et.importHash) {
        existingHashMap.set(et.importHash, et.id);
      }
    }

    const txsToCreate: Prisma.TransactionCreateManyInput[] = [];
    let duplicateRecords = 0;
    let pendingRecords = 0;
    let flaggedDuplicates = 0;

    for (const tx of transactions) {
      const direction = tx.type === 'CREDIT' ? 'CREDIT' : 'DEBIT';

      let finalFitId = buildUniqueFitId(tx.fitId, tx.date, tx.amount, direction);

      if (finalFitId) {
        if (usedFitSet.has(finalFitId)) {
          duplicateRecords++;
          continue;
        }

        usedFitSet.add(finalFitId);
        existingFitDirectionMap.set(finalFitId, direction);
      }

      const fingerprint = calculateFingerprint(tx.date, tx.amount, tx.description);
      const matchedId = existingHashMap.get(fingerprint);

      let status: ClassificationStatus = ClassificationStatus.PENDING;
      let possibleDuplicateOfId: string | undefined = undefined;

      if (matchedId && !finalFitId) {
        status = ClassificationStatus.FLAGGED_DUPLICATE;
        possibleDuplicateOfId = matchedId;
        flaggedDuplicates++;
      }

      txsToCreate.push({
        userId,
        accountId,
        date: tx.date,
        amount: new Prisma.Decimal(tx.amount),
        direction,
        description: tx.description,
        originalDescription: tx.memo || tx.name || tx.description,
        transactionType: tx.type === 'CREDIT' ? 'INCOME' : 'EXPENSE',
        nature: 'UNCLASSIFIED',
        origin: targetOrigin,
        periodType: targetPeriodType,
        source: account.type === 'CREDIT_CARD' ? 'CARD_IMPORT' : 'OFX_IMPORT',
        fitId: finalFitId,
        importHash: fingerprint,
        classificationStatus: status,
        possibleDuplicateOfId: possibleDuplicateOfId || null,
      });

      pendingRecords++;
    }

    // GRAVAÇÃO ATÔMICA DA TRANSAÇÃO NO POSTGRESQL
    return await prisma.$transaction(async (txPrisma) => {
      const batch = await txPrisma.importBatch.create({
        data: {
          userId,
          accountId,
          filename,
          fileHash,
          totalRecords: transactions.length,
          newRecords: txsToCreate.length,
          duplicateRecords,
          pendingRecords,
          periodType: targetPeriodType,
          status: 'COMPLETED',
        },
      });

      const finalItemsToCreate = txsToCreate.map((item) => ({
        ...item,
        importBatchId: batch.id,
      }));

      if (finalItemsToCreate.length > 0) {
        await txPrisma.transaction.createMany({
          data: finalItemsToCreate,
        });
      }

      return {
        batchId: batch.id,
        filename,
        importedAt: batch.importedAt,
        totalRecords: transactions.length,
        newRecords: finalItemsToCreate.length,
        duplicateRecords,
        pendingRecords,
        flaggedDuplicates,
        periodType: targetPeriodType,
        parseErrors,
      };
    });
  }

  /**
   * Reverte logicamente um lote de importação
   */
  static async rollbackImportBatch(batchId: string, userId: string) {
    const batch = await prisma.importBatch.findFirst({
      where: { id: batchId, userId },
    });

    if (!batch) {
      throw new Error(`Lote de importação ${batchId} não encontrado.`);
    }

    if (batch.status === 'ROLLED_BACK') {
      return {
        batchId: batch.id,
        filename: batch.filename,
        accountId: batch.accountId,
        totalRecords: batch.totalRecords,
        newRecords: batch.newRecords,
        duplicateRecords: batch.duplicateRecords,
        status: 'ROLLED_BACK',
        rolledBackCount: 0,
        rolledBackAt: batch.importedAt,
        alreadyRolledBack: true,
      };
    }

    const now = new Date();

    const updateResult = await prisma.transaction.updateMany({
      where: { importBatchId: batch.id, userId },
      data: { deletedAt: now },
    });

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: 'ROLLED_BACK' },
    });

    return {
      batchId: batch.id,
      filename: batch.filename,
      accountId: batch.accountId,
      totalRecords: batch.totalRecords,
      newRecords: batch.newRecords,
      duplicateRecords: batch.duplicateRecords,
      status: 'ROLLED_BACK',
      rolledBackCount: updateResult.count,
      rolledBackAt: now,
      alreadyRolledBack: false,
    };
  }
}
