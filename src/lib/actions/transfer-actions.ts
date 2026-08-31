'use server';

import { getDefaultUserId } from '../auth-user';
import {
  InternalTransferMatchingEngine,
  TransferPairCandidate,
} from '../services/conciliation/internal-transfer-engine';

/**
 * Server Action para listar sugestões de transferências internas não pareadas
 */
export async function getSuggestedTransferPairsAction(
  maxDateDiffDays: number = 3
): Promise<{ success: boolean; data?: TransferPairCandidate[]; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    const data = await InternalTransferMatchingEngine.findSuggestedTransferPairs(userId, {
      maxDateDiffDays,
    });

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao buscar sugestões de transferências.' };
  }
}

/**
 * Server Action para confirmar o pareamento de duas transações como transferência interna
 */
export async function confirmTransferPairAction(
  outboundTransactionId: string,
  inboundTransactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    await InternalTransferMatchingEngine.confirmTransferPair(
      userId,
      outboundTransactionId,
      inboundTransactionId
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao confirmar pareamento de transferência.' };
  }
}

/**
 * Server Action para desfazer/desparear uma transferência interna (reversível)
 */
export async function unpairTransferAction(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    await InternalTransferMatchingEngine.unpairTransfer(userId, transactionId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao desfazer pareamento de transferência.' };
  }
}
