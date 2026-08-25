import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { formatCurrencyBRL } from "@/lib/decimal";
import { ACCOUNT_TYPE_LABELS } from "@/lib/translations";
import { Wallet, Plus, Building2, Scale } from "lucide-react";
import { ContasClient } from "./ContasClient";

export const dynamic = "force-dynamic";

async function getAccountsData() {
  try {
    const userId = await getDefaultUserId();
    return db.account.findMany({
      where: { userId, active: true },
      include: { financialInstitution: true },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error("Erro ao carregar contas:", error);
    return [];
  }
}

export default async function ContasPage() {
  const dbAccounts = await getAccountsData();

  const accounts = dbAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    institution: a.financialInstitution?.name || "Instituição manual",
    type: a.type,
    typeLabel: ACCOUNT_TYPE_LABELS[a.type] || a.type,
    balance: a.calculatedBalance.toNumber(),
    initialBalance: a.initialBalance.toNumber(),
    confirmed: a.confirmedBalance ? a.confirmedBalance.toNumber() : a.calculatedBalance.toNumber(),
    diff: a.reconciliationDiff.toNumber(),
  }));

  return <ContasClient initialAccounts={accounts} />;
}
