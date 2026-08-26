import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { ACCOUNT_TYPE_LABELS } from "@/lib/translations";
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

async function getInvestmentPositionsData() {
  try {
    const userId = await getDefaultUserId();
    return db.investmentPosition.findMany({
      where: { userId, active: true },
      include: {
        instrument: true,
        events: {
          where: { type: { in: ["APPRECIATION", "DEPRECIATION"] } },
          orderBy: { date: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error("Erro ao carregar investimentos das contas:", error);
    return [];
  }
}

export default async function ContasPage() {
  const [dbAccounts, dbPositions] = await Promise.all([getAccountsData(), getInvestmentPositionsData()]);

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

  const investmentPositions = dbPositions.map((position) => ({
    id: position.id,
    accountId: position.accountId,
    name: position.instrument.name,
    currentValue: position.currentValue.toNumber(),
    acquisitionValue: position.acquisitionValue.toNumber(),
    latestVariation: position.events[0] ? (position.events[0].type === "DEPRECIATION" ? -position.events[0].amount.toNumber() : position.events[0].amount.toNumber()) : null,
    latestVariationDate: position.events[0]?.date.toISOString() ?? null,
  }));

  return <ContasClient initialAccounts={accounts} initialInvestmentPositions={investmentPositions} />;
}
