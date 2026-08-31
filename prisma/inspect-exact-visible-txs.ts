import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectAndPurgeAllTxs() {
  console.log('================================================================');
  console.log('   INSPEÇÃO E EXPURGO TOTAL DE TODAS AS TRANSAÇÕES NO BANCO    ');
  console.log('================================================================\n');

  const allTxs = await prisma.transaction.findMany({
    include: { account: true, importBatch: true, user: true },
  });

  console.log(`Total de transações encontradas no banco PostgreSQL: ${allTxs.length}\n`);

  for (const tx of allTxs) {
    console.log(`[ID: ${tx.id}]`);
    console.log(`  - Descrição: "${tx.description}"`);
    console.log(`  - OriginalDesc: "${tx.originalDescription}"`);
    console.log(`  - Amount: R$ ${tx.amount}`);
    console.log(`  - Origin: ${tx.origin}`);
    console.log(`  - PeriodType: ${tx.periodType}`);
    console.log(`  - Source: ${tx.source}`);
    console.log(`  - Account: ${tx.account?.name} (${tx.accountId})`);
    console.log(`  - User: ${tx.user?.name} | Email: ${tx.user?.email}`);
    console.log(`  - Batch: ${tx.importBatch?.filename || 'Nenhum'}`);
    console.log(`  - DeletedAt: ${tx.deletedAt}`);
    console.log('----------------------------------------------------------------');
  }

  // AGORA, EXECUTAR O PURGE TOTAL TRANSACIONAL DE TODAS AS TRANSAÇÕES E LOTES
  console.log('\n--- EXECUTANDO EXPURGO TOTAL TRANSACIONAL (prisma.$transaction) ---');

  const res = await prisma.$transaction(async (tx) => {
    const deletedTxs = await tx.transaction.deleteMany({});
    const deletedBatches = await tx.importBatch.deleteMany({});
    return { deletedTxsCount: deletedTxs.count, deletedBatchesCount: deletedBatches.count };
  });

  console.log(`✅ DELETADOS: ${res.deletedTxsCount} transações e ${res.deletedBatchesCount} lotes de importação.`);

  const remainingTxs = await prisma.transaction.count();
  console.log(`\n• Transações restantes no banco de dados: ${remainingTxs} (Esperado: 0)`);

  console.log('\n================================================================');
  console.log('🎉 BANCO DE DADOS 100% LIMPO E ZERADO DE TRANSAÇÕES!              ');
  console.log('================================================================\n');
}

inspectAndPurgeAllTxs()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
