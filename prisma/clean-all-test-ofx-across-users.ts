import { PrismaClient, TransactionOrigin } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAllTestOfx() {
  console.log('================================================================');
  console.log('   AUDITORIA E SANEAMENTO GLOBAL DE TODOS OS LOTES/TRANSAÇÕES OFX ');
  console.log('================================================================\n');

  const allBatches = await prisma.importBatch.findMany({
    select: { id: true, filename: true, userId: true, newRecords: true, importedAt: true },
  });

  const allOfxTxs = await prisma.transaction.findMany({
    where: {
      OR: [
        { importBatchId: { not: null } },
        { origin: { in: [TransactionOrigin.BANK_IMPORT, TransactionOrigin.CARD_IMPORT] } },
      ],
    },
    select: { id: true, description: true, amount: true, classificationStatus: true, accountId: true, userId: true },
  });

  console.log(`• Total de Lotes OFX em todo o Banco: ${allBatches.length}`);
  for (const b of allBatches) {
    console.log(`  - [Batch ID: ${b.id.substring(0, 8)}] Arquivo: ${b.filename} | User: ${b.userId} | Registros: ${b.newRecords}`);
  }

  console.log(`\n• Total de Transações OFX em todo o Banco: ${allOfxTxs.length}`);
  for (const t of allOfxTxs) {
    console.log(`  - [Tx ID: ${t.id.substring(0, 8)}] ${t.description} | R$ ${t.amount} | Status: ${t.classificationStatus}`);
  }

  if (allBatches.length === 0 && allOfxTxs.length === 0) {
    console.log('\n✅ NENHUM LOTE OU TRANSAÇÃO DE TESTE OFX EXISTE NO BANCO DE DADOS.');
    return;
  }

  // EXCLUSÃO ATÔMICA TRANSACIONAL
  console.log('\n--- EXECUTANDO REMOÇÃO TRANSACIONAL DE TODOS OS REGISTROS DE TESTE OFX ---');
  const res = await prisma.$transaction(async (tx) => {
    const deletedTxs = await tx.transaction.deleteMany({
      where: {
        OR: [
          { importBatchId: { not: null } },
          { origin: { in: [TransactionOrigin.BANK_IMPORT, TransactionOrigin.CARD_IMPORT] } },
        ],
      },
    });

    const deletedBatches = await tx.importBatch.deleteMany({});

    return { deletedTxsCount: deletedTxs.count, deletedBatchesCount: deletedBatches.count };
  });

  console.log(`- Transações Removidas: ${res.deletedTxsCount}`);
  console.log(`- Lotes OFX Removidos: ${res.deletedBatchesCount}`);

  // RE-VERIFICAÇÃO PÓS EXCLUSÃO
  const remainingBatchesCount = await prisma.importBatch.count();
  const remainingOfxTxsCount = await prisma.transaction.count({
    where: {
      OR: [
        { importBatchId: { not: null } },
        { origin: { in: [TransactionOrigin.BANK_IMPORT, TransactionOrigin.CARD_IMPORT] } },
      ],
    },
  });

  console.log(`\n• Lotes restantes no banco: ${remainingBatchesCount}`);
  console.log(`• Transações OFX restantes no banco: ${remainingOfxTxsCount}`);

  if (remainingBatchesCount === 0 && remainingOfxTxsCount === 0) {
    console.log('\n================================================================');
    console.log('🎉 BANCO DE DADOS 100% LIMPO E SANEADO COM INTEGRIDADE TOTAL!    ');
    console.log('================================================================\n');
  }
}

cleanAllTestOfx()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
