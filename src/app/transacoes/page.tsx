import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { TransactionsClient } from "@/components/transactions/TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransacoesPage() {
  const userId = await getDefaultUserId();
  const [transactions, categories, accounts] = await Promise.all([
    db.transaction.findMany({
      where: { userId, deletedAt: null },
      orderBy: { date: "desc" },
      take: 200,
      include: { account: true, destinationAccount: true, category: true, allocations: { include: { category: true, asset: true, liability: true } } },
    }),
    db.category.findMany({ where: { userId, deletedAt: null }, include: { parent: true }, orderBy: { name: "asc" } }),
    db.account.findMany({ where: { userId, active: true }, include: { financialInstitution: true }, orderBy: { name: "asc" } }),
  ]);

  return <TransactionsClient
    initialTransactions={transactions.map((tx) => ({
      id: tx.id, description: tx.description, amount: Number(tx.amount), date: tx.date.toISOString(), direction: tx.direction,
      transactionType: tx.transactionType, accountName: tx.account.name, destinationAccountName: tx.destinationAccount?.name,
      categoryId: tx.categoryId, categoryName: tx.category?.name, notes: tx.notes,
      allocations: tx.allocations.map((a) => ({ id: a.id, allocationType: a.allocationType, amount: Number(a.amount), label: a.category?.name || a.asset?.name || a.liability?.name || a.allocationType })),
    }))}
    categories={categories.map((c) => ({ id: c.id, name: c.name, parentName: c.parent?.name }))}
    accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, institutionName: a.financialInstitution?.name || null }))}
  />;
}