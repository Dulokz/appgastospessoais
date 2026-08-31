'use server';

import { revalidatePath } from 'next/cache';
import { getDefaultUserId } from '../auth-user';
import { OfxImporterService, OfxPreviewResult, OfxImportExecutionResult } from '../services/ofx/ofx-importer';
import { serializeDecimal } from '../serializers';

/**
 * Server Action para gerar prévia da importação de um arquivo OFX (SOMENTE EM MEMÓRIA)
 */
export async function previewOfxImportAction(
  accountId: string,
  filename: string,
  fileContent: string
): Promise<{ success: boolean; data?: OfxPreviewResult; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    const rawData = await OfxImporterService.previewImport({
      userId,
      accountId,
      filename,
      fileContent,
    });

    const data = serializeDecimal(rawData);

    return { success: true, data };
  } catch (err: any) {
    console.error('[previewOfxImportAction] Erro real ao gerar prévia:', err);
    return { success: false, error: err.message || 'Erro ao gerar prévia do OFX.' };
  }
}

/**
 * Server Action para executar a importação definitiva do arquivo OFX (ATÔMICA)
 */
export async function executeOfxImportAction(
  accountId: string,
  filename: string,
  fileContent: string
): Promise<{ success: boolean; data?: OfxImportExecutionResult; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    const rawData = await OfxImporterService.executeImport({
      userId,
      accountId,
      filename,
      fileContent,
    });

    const data = serializeDecimal(rawData);

    // Limpar cache de todas as rotas do Next.js
    revalidatePath('/transacoes');
    revalidatePath('/transacoes/pendentes');
    revalidatePath('/');
    revalidatePath('/contas');

    return { success: true, data };
  } catch (err: any) {
    console.error('[executeOfxImportAction] Erro real ao importar OFX:', err);
    return { success: false, error: err.message || 'Erro ao importar OFX.' };
  }
}

/**
 * Server Action para realizar rollback de um lote de importação OFX
 */
export async function rollbackImportBatchAction(
  batchId: string
): Promise<{ success: boolean; affectedCount?: number; error?: string }> {
  try {
    const userId = await getDefaultUserId();

    const result = await OfxImporterService.rollbackImportBatch(batchId, userId);

    // Limpar cache de todas as rotas do Next.js
    revalidatePath('/transacoes');
    revalidatePath('/transacoes/pendentes');
    revalidatePath('/');
    revalidatePath('/contas');

    return { success: true, affectedCount: result.rolledBackCount };
  } catch (err: any) {
    console.error('[rollbackImportBatchAction] Erro real ao reverter lote:', err);
    return { success: false, error: err.message || 'Erro ao reverter lote de importação.' };
  }
}
