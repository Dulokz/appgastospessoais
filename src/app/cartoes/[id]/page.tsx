import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { FaturaClient } from "./FaturaClient";

export const dynamic = "force-dynamic";

export default async function FaturaPage({ params }: { params: { id: string } }) {
  const userId = await getDefaultUserId();
  const card = await db.account.findFirst({
    where: { id: params.id, userId, active: true, type: "CREDIT_CARD" },
    include: { financialInstitution: true },
  });
  if (!card) notFound();

  const [transactions, sourceAccounts] = await Promise.all([
    db.transaction.findMany({
      where: {
        userId,
        OR: [{ accountId: card.id }, { destinationAccountId: card.id }],
      },
      include: { category: true, account: { include: { financialInstitution: true } } },
      orderBy: { date: "desc" },
    }),
    db.account.findMany({
      where: { userId, active: true, type: { not: "CREDIT_CARD" } },
      include: { financialInstitution: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const grouped = new Map<string, { key: string; purchases: any[]; payments: any[] }>();
  const invoiceKeyFor = (date: Date) => {
    const reference = new Date(date);
    if (reference.getDate() > (card.creditCardClosingDay || 25)) reference.setMonth(reference.getMonth() + 1);
    return `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}`;
  };
  for (const transaction of transactions) {
    const key = transaction.cardInvoiceKey || invoiceKeyFor(transaction.date);
    if (!grouped.has(key)) grouped.set(key, { key, purchases: [], payments: [] });
    const target = grouped.get(key)!;
    if (transaction.transactionType === "CARD_PAYMENT" && transaction.destinationAccountId === card.id) {
      target.payments.push({ id: transaction.id, amount: Number(transaction.amount), date: transaction.date.toISOString(), sourceAccountName: transaction.account.name });
    } else if (transaction.accountId === card.id && transaction.direction === "DEBIT") {
      target.purchases.push({ id: transaction.id, description: transaction.description, amount: Number(transaction.amount), date: transaction.date.toISOString(), category: transaction.category?.name || null });
    }
  }

  const invoices = Array.from(grouped.values()).sort((a, b) => b.key.localeCompare(a.key));

  return <FaturaClient
    cardId={card.id}
    cardName={card.name}
    institution={card.financialInstitution?.name || "Instituição não informada"}
    invoices={invoices}
    sourceAccounts={sourceAccounts.map((account) => ({ id: account.id, name: account.name, institution: account.financialInstitution?.name || "Instituição manual" }))}
  />;
}
