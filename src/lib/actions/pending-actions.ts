'use server';

import { getDefaultUserId } from '../auth-user';
import { db } from '../db';
import { ClassificationStatus, TransactionNature, TransactionPeriodType, TransactionOrigin } from '@prisma/client';
import { ClassificationRuleEngine } from '../services/rules/classification-rule-engine';

export interface PendingTransactionsData {
  summary: {
    totalPending: number;
    liveControlCount: number;
    historicalCount: number;
    flaggedDuplicatesCount: number;
    totalDebits: number;
    totalCredits: number;
  };
  transactions: Array<{
    id: string;
    accountId: string;
    accountName: string;
    date: Date;
    amount: number;
    direction: 'CREDIT' | 'DEBIT';
    description: string;
    originalDescription: string | null;
    fitId: string | null;
    nature: TransactionNature;
    origin: TransactionOrigin;
    periodType: TransactionPeriodType;
    categoryId: string | null;
    categoryName: string | null;
    subcategoryId: string | null;
    subcategoryName: string | null;
    counterpartyName: string | null;
    classificationStatus: ClassificationStatus;
    classificationConfidence: number | null;
    classificationRuleId: string | null;
    possibleDuplicateOfId: string | null;
    possibleDuplicateOfDesc?: string | null;
  }>;
  categories: Array<{ id: string; name: string; parentId: string | null }>;
  accounts: Array<{ id: string; name: string; type?: string; institutionName?: string | null }>;
}

/**
 * Busca todas as transações pendentes de classificação para a fila operacional
 */
export async function getPendingTransactionsAction(): Promise<{
  success: boolean;
  data?: PendingTransactionsData;
  error?: string;
}> {
  try {
    const userId = await getDefaultUserId();

    const pendingTxs = await db.transaction.findMany({
      where: {
        userId,
        classificationStatus: { in: [ClassificationStatus.PENDING, ClassificationStatus.FLAGGED_DUPLICATE] },
        deletedAt: null,
      },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    let categories = await db.category.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true, parentId: true },
      orderBy: { name: 'asc' },
    });

    if (categories.length === 0) {
      const defaultCatNames = [
        'Alimentação & Restaurantes',
        'Supermercado & Compras',
        'Moradia & Aluguel',
        'Contas de Casa (Luz, Água, Net)',
        'Transporte & Combustível',
        'Saúde & Farmácia',
        'Lazer & Entretenimento',
        'Educação & Cursos',
        'Vestuário & Cuidados',
        'Serviços & Assinaturas',
        'Impostos & Tarifas Bancárias',
        'Renda / Salário / Pró-Labore',
        'Investimentos & Aportes',
        'Outros',
      ];

      await db.category.createMany({
        data: defaultCatNames.map((name) => ({
          userId,
          name,
        })),
        skipDuplicates: true,
      });

      categories = await db.category.findMany({
        where: { userId, deletedAt: null },
        select: { id: true, name: true, parentId: true },
        orderBy: { name: 'asc' },
      });
    }

    const accountsList = await db.account.findMany({
      where: { userId, active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        type: true,
        financialInstitution: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    let liveControlCount = 0;
    let historicalCount = 0;
    let flaggedDuplicatesCount = 0;
    let totalDebits = 0;
    let totalCredits = 0;

    const formattedTxs = [];

    for (const tx of pendingTxs) {
      const amt = Number(tx.amount);
      if (tx.periodType === TransactionPeriodType.HISTORICAL_IMPORT) {
        historicalCount++;
      } else {
        liveControlCount++;
      }

      if (tx.classificationStatus === ClassificationStatus.FLAGGED_DUPLICATE) {
        flaggedDuplicatesCount++;
      }

      if (tx.direction === 'DEBIT') {
        totalDebits += Math.abs(amt);
      } else {
        totalCredits += amt;
      }

      let dupDesc: string | null = null;
      if (tx.possibleDuplicateOfId) {
        const dupTx = await db.transaction.findUnique({
          where: { id: tx.possibleDuplicateOfId },
          select: { description: true, date: true },
        });
        if (dupTx) {
          dupDesc = `${dupTx.description} (${dupTx.date.toISOString().split('T')[0]})`;
        }
      }

      formattedTxs.push({
        id: tx.id,
        accountId: tx.accountId,
        accountName: tx.account.name,
        date: tx.date,
        amount: amt,
        direction: tx.direction as 'CREDIT' | 'DEBIT',
        description: tx.description,
        originalDescription: tx.originalDescription,
        fitId: tx.fitId,
        nature: tx.nature,
        origin: tx.origin,
        periodType: tx.periodType,
        categoryId: tx.categoryId,
        categoryName: tx.category?.name || null,
        subcategoryId: tx.subcategoryId,
        subcategoryName: tx.subcategory?.name || null,
        counterpartyName: tx.counterpartyName,
        classificationStatus: tx.classificationStatus,
        classificationConfidence: tx.classificationConfidence,
        classificationRuleId: tx.classificationRuleId,
        possibleDuplicateOfId: tx.possibleDuplicateOfId,
        possibleDuplicateOfDesc: dupDesc,
      });
    }

    return {
      success: true,
      data: {
        summary: {
          totalPending: pendingTxs.length,
          liveControlCount,
          historicalCount,
          flaggedDuplicatesCount,
          totalDebits,
          totalCredits,
        },
        transactions: formattedTxs,
        categories,
        accounts: accountsList.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          institutionName: a.financialInstitution?.name || null,
        })),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao carregar fila de transações pendentes.' };
  }
}

/**
 * Confirma individualmente a classificação de um lançamento
 */
export async function confirmTransactionClassificationAction(params: {
  transactionId: string;
  nature: TransactionNature;
  categoryId?: string | null;
  subcategoryId?: string | null;
  counterpartyName?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    const tx = await db.transaction.findFirst({
      where: { id: params.transactionId, userId, deletedAt: null },
    });
    if (!tx) throw new Error('Transação não encontrada.');

    // Validar hierarquia se ambas forem passadas
    if (params.categoryId && params.subcategoryId) {
      await ClassificationRuleEngine.validateCategoryCoherence(params.categoryId, params.subcategoryId);
    }

    await db.transaction.update({
      where: { id: tx.id },
      data: {
        nature: params.nature,
        categoryId: params.categoryId || null,
        subcategoryId: params.subcategoryId || null,
        counterpartyName: params.counterpartyName || tx.counterpartyName,
        classificationStatus: ClassificationStatus.CONFIRMED,
        classificationConfidence: 1.0,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao confirmar classificação.' };
  }
}

/**
 * Anula/Ignora um lançamento da fila (soft-delete + status IGNORED)
 */
export async function ignoreTransactionAction(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    await db.transaction.updateMany({
      where: { id: transactionId, userId },
      data: {
        deletedAt: new Date(),
        classificationStatus: ClassificationStatus.IGNORED,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao ignorar transação.' };
  }
}

/**
 * Reabre uma transação confirmada e envia de volta para a Caixa de Entrada (PENDING)
 */
export async function reopenTransactionToPendingAction(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    await db.transaction.updateMany({
      where: { id: transactionId, userId },
      data: {
        classificationStatus: ClassificationStatus.PENDING,
        classificationConfidence: null,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao reabrir transação para pendentes.' };
  }
}
