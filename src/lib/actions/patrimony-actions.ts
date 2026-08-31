'use server';

import { getDefaultUserId } from '../auth-user';
import { NetWorthEngine } from '../services/patrimony/net-worth-engine';

/**
 * Server Action para obter a apuração patrimonial atual
 */
export async function getCurrentNetWorthAction() {
  try {
    const userId = await getDefaultUserId();
    const data = await NetWorthEngine.calculateCurrentNetWorth(userId);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao carregar patrimônio líquido.' };
  }
}

/**
 * Server Action para criar um snapshot patrimonial imutável
 */
export async function createNetWorthSnapshotAction() {
  try {
    const userId = await getDefaultUserId();
    const snapshot = await NetWorthEngine.createSnapshot(userId);
    return { success: true, snapshot };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao criar snapshot patrimonial.' };
  }
}

/**
 * Server Action para registrar reajuste manual de valor de mercado de um ativo físico
 */
export async function updateAssetValuationAction(params: {
  assetId: string;
  newValue: number;
  source?: string;
  notes?: string;
}) {
  try {
    const userId = await getDefaultUserId();
    const result = await NetWorthEngine.updateAssetValuation({
      userId,
      ...params,
    });
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar avaliação de mercado.' };
  }
}

/**
 * Server Action para buscar o progresso contra as metas financeiras
 */
export async function getGoalStatusAction(annualYieldRate: number = 0.06) {
  try {
    const userId = await getDefaultUserId();
    const data = await NetWorthEngine.getGoalStatus(userId, annualYieldRate);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao buscar progresso das metas.' };
  }
}
