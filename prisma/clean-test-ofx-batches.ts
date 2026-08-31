import { PrismaClient, TransactionOrigin } from '@prisma/client';
import { getDefaultUserId } from '../src/lib/auth-user';

const prisma = new PrismaClient();

async function cleanTestOfxData() {
  console.log('================================================================');
  console.log('   SANEAMENTO E LIMPEZA AUDITÁVEL DE LOTES E TRANSAÇÕES OFX    ');
  console.log('================================================================\n');

  const userId = await getDefaultUserId();

  // 1. AUDITORIA PRÉVIA DE RECURSOS QUE SERÃO AFETADOS
  const batchesToClean = await prisma.importBatch.findMany({
    where: { userId },
    select: { id: true, filename: true, importedAt: true, newRecords: true },
  });

  const txsToClean = await prisma.transaction.findMany({
    where: {
      userId,
      OR: [
        { importBatchId: { not: null } },
        { origin: { in: [TransactionOrigin.BANK_IMPORT, TransactionOrigin.CARD_IMPORT] } },
      ],
    },
    select: { id: true, description: true, amount: true, classificationStatus: true },
  });

  const pendingTriageCount = txsToClean.filter(
    (t) => t.classificationStatus === 'PENDING' || t.classificationStatus === 'FLAGGED_DUPLICATE'
  ).length;

  console.log('--- 📊 AUDITORIA PRÉVIA (O QUE SERÁ REMOVIDO) ---');
  console.log(`• Lotes de Importação OFX a remover: ${batchesToClean.length}`);
  for (const b of batchesToClean) {
    console.log(`  - [Batch ID: ${b.id.substring(0, 8)}] Arquivo: ${b.filename} | Registros: ${b.newRecords}`);
  }

  console.log(`\n• Total de Transações OFX a remover: ${txsToClean.length}`);
  console.log(`• Itens Pendentes na Fila de Triagem a remover: ${pendingTriageCount}`);

  console.log('\n--- 🛡️ RECURSOS PRESERVADOS (NÃO SERÃO ALTERADOS) ---');
  const accountsCount = await prisma.account.count({ where: { userId, deletedAt: null } });
  const instsCount = await prisma.financialInstitution.count({ where: { userId } });
  const categoriesCount = await prisma.category.count({ where: { userId, deletedAt: null } });
  const assetsCount = await prisma.asset.count({ where: { userId } });
  const liabilitiesCount = await prisma.liability.count({ where: { userId } });

  console.log(`• Contas Cadastradas: ${accountsCount}`);
  console.log(`• Instituições Financeiras: ${instsCount}`);
  console.log(`• Categorias: ${categoriesCount}`);
  console.log(`• Bens / Ativos Físicos & Investimentos: ${assetsCount}`);
  console.log(`• Dívidas / Passivos: ${liabilitiesCount}`);
  console.log(`• Configurações de Usuário & Data-Base: PRESERVADAS`);

  if (txsToClean.length === 0 && batchesToClean.length === 0) {
    console.log('\nNenhum lote ou transação de teste OFX pendente de limpeza.');
    return;
  }

  // 2. EXCLUSÃO TRANSACIONAL ATÔMICA
  console.log('\n--- ⚙️ EXECUTANDO EXCLUSÃO TRANSACIONAL ATÔMICA ($transaction) ---');

  const result = await prisma.$transaction(async (txPrisma) => {
    // A. Anular/remover transações vinculadas a lotes ou origem de importação
    const deletedTxs = await txPrisma.transaction.deleteMany({
      where: {
        userId,
        OR: [
          { importBatchId: { not: null } },
          { origin: { in: [TransactionOrigin.BANK_IMPORT, TransactionOrigin.CARD_IMPORT] } },
        ],
      },
    });

    // B. Remover lotes de importação
    const deletedBatches = await txPrisma.importBatch.deleteMany({
      where: { userId },
    });

    return {
      deletedTxsCount: deletedTxs.count,
      deletedBatchesCount: deletedBatches.count,
    };
  });

  console.log(`✅ EXCLUSÃO CONCLUÍDA COM SUCESSO:`);
  console.log(`- Transações OFX Deletadas: ${result.deletedTxsCount}`);
  console.log(`- Lotes OFX Deletados: ${result.deletedBatchesCount}`);

  // 3. CONFIRMAÇÃO PÓS-LIMPEZA
  console.log('\n--- 🔍 CONFIRMAÇÃO PÓS-LIMPEZA ---');
  const remainingTxs = await prisma.transaction.count({
    where: {
      userId,
      OR: [
        { importBatchId: { not: null } },
        { origin: { in: [TransactionOrigin.BANK_IMPORT, TransactionOrigin.CARD_IMPORT] } },
      ],
    },
  });

  const remainingBatches = await prisma.importBatch.count({ where: { userId } });
  const remainingPendingTriage = await prisma.transaction.count({
    where: {
      userId,
      classificationStatus: { in: ['PENDING', 'FLAGGED_DUPLICATE'] },
      deletedAt: null,
    },
  });

  console.log(`- Transações OFX restantes em /transacoes: ${remainingTxs} (Esperado: 0)`);
  console.log(`- Lotes OFX restantes no banco: ${remainingBatches} (Esperado: 0)`);
  console.log(`- Itens restantes em /transacoes/pendentes: ${remainingPendingTriage} (Esperado: 0)`);

  if (remainingTxs === 0 && remainingBatches === 0 && remainingPendingTriage === 0) {
    console.log('\n================================================================');
    console.log('🎉 BANCO DE DADOS LIMPO E SANEADO COM TOTAL INTEGRIDADE!        ');
    console.log('================================================================\n');
  } else {
    throw new Error('FALHA NO SANEAMENTO: Ainda restam registros não eliminados.');
  }
}

cleanTestOfxData()
  .catch((e) => {
    console.error('❌ ERRO NO SANEAMENTO:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
