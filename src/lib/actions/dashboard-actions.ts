'use server';

import { getDefaultUserId } from '../auth-user';
import { FinancialOSEngine, MonthlyFinancialOSResult } from '../services/dashboard/financial-os-engine';
import { serializeDecimal } from '../serializers';

/**
 * Server Action para buscar o resultado mensal do Sistema Operacional Financeiro com serialização DTO limpa
 */
export async function getMonthlyDashboardAction(
  yearMonth: string
): Promise<{ success: boolean; data?: MonthlyFinancialOSResult; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    const rawData = await FinancialOSEngine.getMonthlyResult(userId, yearMonth);
    const data = serializeDecimal(rawData);

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao carregar dados do dashboard.' };
  }
}

/**
 * Server Action para buscar a tendência histórica com serialização DTO limpa
 */
export async function getHistoricalTrendAction(
  monthsCount: number = 12
): Promise<{ success: boolean; data?: MonthlyFinancialOSResult[]; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    const rawData = await FinancialOSEngine.getHistoricalTrend(userId, monthsCount);
    const data = serializeDecimal(rawData);

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao carregar histórico de tendência.' };
  }
}
