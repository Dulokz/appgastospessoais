import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  console.log('=== USERS IN DATABASE ===');
  console.dir(users, { depth: null });

  const accounts = await prisma.account.findMany({
    where: { deletedAt: null },
    select: { id: true, userId: true, name: true, type: true },
  });

  console.log('=== ACCOUNTS IN DATABASE ===');
  console.dir(accounts, { depth: null });

  const transactions = await prisma.transaction.findMany({
    select: {
      id: true,
      userId: true,
      accountId: true,
      description: true,
      originalDescription: true,
      amount: true,
      direction: true,
      fitId: true,
      classificationStatus: true,
      deletedAt: true,
      importBatchId: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`=== ALL TRANSACTIONS IN DATABASE (${transactions.length}) ===`);
  console.dir(transactions, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
