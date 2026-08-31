'use server';

import { getDefaultUserId } from '../auth-user';
import { ClassificationRuleEngine } from '../services/rules/classification-rule-engine';
import { RuleMatchType, TransactionNature } from '@prisma/client';

/**
 * Server Action para calcular a prévia de quantos lançamentos pendentes serão afetados por uma regra antes de confirmá-la
 */
export async function countMatchingPendingTransactionsAction(params: {
  accountId?: string;
  direction?: 'CREDIT' | 'DEBIT';
  matchType?: RuleMatchType;
  matchValue: string;
  assetId?: string;
  liabilityId?: string;
}): Promise<{ success: boolean; affectedCount?: number; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    const affectedCount = await ClassificationRuleEngine.countMatchingPendingTransactions(userId, params);

    return { success: true, affectedCount };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao calcular prévia de lançamentos afetados.' };
  }
}

/**
 * Server Action para criar uma nova regra e opcionalmente aplicar a lançamentos pendentes
 */
export async function createClassificationRuleAction(params: {
  name?: string;
  accountId?: string;
  direction?: 'CREDIT' | 'DEBIT';
  matchType?: RuleMatchType;
  matchValue: string;
  nature?: TransactionNature;
  categoryId?: string;
  subcategoryId?: string;
  counterparty?: string;
  assetId?: string;
  liabilityId?: string;
  priority?: number;
  applyToExistingPending?: boolean;
}) {
  try {
    const userId = await getDefaultUserId();

    const result = await ClassificationRuleEngine.createRuleAndApply({
      ...params,
      userId,
    });

    return { success: true, rule: result.rule, affectedCount: result.affectedCount };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao criar regra de classificação.' };
  }
}

/**
 * Server Action para rodar o motor de classificação em todas as pendências (safeOptions: overrideConfirmed=false)
 */
export async function classifyPendingTransactionsAction() {
  try {
    const userId = await getDefaultUserId();

    const result = await ClassificationRuleEngine.classifyAllPendingTransactions(userId, { overrideConfirmed: false });

    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao reclassificar pendências.' };
  }
}
