'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { getDefaultUserId } from '../auth-user';

/**
 * Server Action para expurgo total de transações de teste no banco PostgreSQL com revalidação de cache do Next.js
 */
export async function purgeAllTestTransactionsAction(): Promise<{
  success: boolean;
  deletedTxsCount: number;
  deletedBatchesCount: number;
  error?: string;
}> {
  try {
    const userId = await getDefaultUserId();

    const result = await db.$transaction(async (tx) => {
      const deletedTxs = await tx.transaction.deleteMany({
        where: { userId },
      });

      const deletedBatches = await tx.importBatch.deleteMany({
        where: { userId },
      });

      return {
        deletedTxsCount: deletedTxs.count,
        deletedBatchesCount: deletedBatches.count,
      };
    });

    // Revalidar todas as rotas do Next.js
    revalidatePath('/transacoes');
    revalidatePath('/transacoes/pendentes');
    revalidatePath('/');
    revalidatePath('/contas');

    return {
      success: true,
      deletedTxsCount: result.deletedTxsCount,
      deletedBatchesCount: result.deletedBatchesCount,
    };
  } catch (err: any) {
    console.error('[purgeAllTestTransactionsAction] Erro ao expurgar:', err);
    return {
      success: false,
      deletedTxsCount: 0,
      deletedBatchesCount: 0,
      error: err.message || 'Erro ao expurgar transações.',
    };
  }
}
