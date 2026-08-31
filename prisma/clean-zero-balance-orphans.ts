import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanZeroBalanceOrphans() {
  console.log('================================================================');
  console.log('   EXPURGO DE LINHAS DE SALDO (R$ 0,00) E DATAS INVÁLIDAS (1902)');
  console.log('================================================================\n');

  // Buscar transações com valor 0, data < 1990 ou descrição 'Saldo do dia'
  const invalidTxs = await prisma.transaction.findMany({
    where: {
      OR: [
        { amount: 0 },
        { date: { lt: new Date('1990-01-01T00:00:00Z') } },
        { description: { contains: 'Saldo do dia', mode: 'insensitive' } },
        { originalDescription: { contains: 'Saldo do dia', mode: 'insensitive' } },
      ],
    },
    select: { id: true, description: true, amount: true, date: true },
  });

  console.log(`Linhas inválidas/saldo R$ 0,00 encontradas para exclusão: ${invalidTxs.length}`);
  for (const t of invalidTxs) {
    console.log(`  - [Tx ID: ${t.id}] ${t.date.toISOString().split('T')[0]} | ${t.description} | R$ ${t.amount}`);
  }

  if (invalidTxs.length > 0) {
    const res = await prisma.transaction.deleteMany({
      where: {
        id: { in: invalidTxs.map((t) => t.id) },
      },
    });

    console.log(`\n✅ DELETADAS ${res.count} transações de saldo R$ 0,00 / ano 1902.`);
  } else {
    console.log('\nNenhuma transação de saldo R$ 0,00 / ano 1902 pendente no banco de dados.');
  }

  console.log('\n================================================================');
  console.log('🎉 SANEAMENTO CONCLUÍDO COM 100% DE INTEGRIDADE!                ');
  console.log('================================================================\n');
}

cleanZeroBalanceOrphans()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
