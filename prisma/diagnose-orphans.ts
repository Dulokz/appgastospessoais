import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseDatabase() {
  console.log('=== DIAGNÓSTICO DE TRANSAÇÕES E LONTES NO BANCO DE DADOS ===\n');

  const totalTxs = await prisma.transaction.count();
  const deletedTxs = await prisma.transaction.count({ where: { deletedAt: { not: null } } });
  const activeTxs = await prisma.transaction.count({ where: { deletedAt: null } });

  console.log(`Total Transações: ${totalTxs} (Ativas: ${activeTxs}, Deletadas/Inativas: ${deletedTxs})`);

  const orphanAccountId = await prisma.transaction.count({
    where: { accountId: '' },
  });

  const orphanBatchId = await prisma.transaction.count({
    where: { origin: 'BANK_IMPORT', importBatchId: null },
  });

  console.log(`Transações sem accountId válido: ${orphanAccountId}`);
  console.log(`Transações BANK_IMPORT sem importBatchId: ${orphanBatchId}`);

  const txsByStatus = await prisma.transaction.groupBy({
    by: ['classificationStatus'],
    _count: { id: true },
  });

  console.log('\nTransações por Status de Classificação:');
  for (const group of txsByStatus) {
    console.log(`  - ${group.classificationStatus}: ${group._count.id}`);
  }

  const txsByOrigin = await prisma.transaction.groupBy({
    by: ['origin'],
    _count: { id: true },
  });

  console.log('\nTransações por Origem (TransactionOrigin):');
  for (const group of txsByOrigin) {
    console.log(`  - ${group.origin}: ${group._count.id}`);
  }

  const txsByPeriod = await prisma.transaction.groupBy({
    by: ['periodType'],
    _count: { id: true },
  });

  console.log('\nTransações por Tipo de Período (TransactionPeriodType):');
  for (const group of txsByPeriod) {
    console.log(`  - ${group.periodType}: ${group._count.id}`);
  }

  // Listar últimos 10 lançamentos ativos
  const sampleTxs = await prisma.transaction.findMany({
    where: { deletedAt: null },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { account: true, importBatch: true },
  });

  console.log('\nAmostra das 10 últimas transações ativas:');
  for (const tx of sampleTxs) {
    console.log(`  [${tx.id.substring(0, 8)}] ${tx.date.toISOString().split('T')[0]} | Account: ${tx.account?.name || 'NULA/ÓRFÃ'} | Origin: ${tx.origin} | Status: ${tx.classificationStatus} | Batch: ${tx.importBatch?.filename || 'SEM BATCH'} | Amount: R$ ${tx.amount}`);
  }

  console.log('\n=== FIM DO DIAGNÓSTICO ===');
}

diagnoseDatabase()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
