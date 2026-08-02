import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { InvestimentosClient } from "./InvestimentosClient";

export const dynamic = "force-dynamic";

async function getInvestimentosData() {
  try {
    const userId = await getDefaultUserId();

    const accounts = await db.account.findMany({
      where: { userId, active: true },
      include: { financialInstitution: true },
      orderBy: { createdAt: "asc" },
    });

    const positions = await db.investmentPosition.findMany({
      where: { userId, active: true },
      include: {
        account: {
          include: { financialInstitution: true },
        },
        instrument: true,
        events: {
          orderBy: { date: "desc" },
          take: 10,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const events = await db.investmentEvent.findMany({
      where: { userId },
      include: {
        investmentPosition: {
          include: { instrument: true },
        },
      },
      orderBy: { date: "desc" },
      take: 50,
    });

    return { accounts, positions, events };
  } catch (error) {
    console.error("Erro ao carregar dados de investimentos:", error);
    return { accounts: [], positions: [], events: [] };
  }
}

export default async function InvestimentosPage() {
  const { accounts, positions, events } = await getInvestimentosData();

  const formattedAccounts = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    calculatedBalance: a.calculatedBalance.toNumber(),
    financialInstitutionId: a.financialInstitutionId || "OTHER_INST",
    financialInstitutionName: a.financialInstitution?.name || "Outras Custódias / Dinheiro",
  }));

  const formattedPositions = positions.map((p) => ({
    id: p.id,
    instrumentName: p.instrument.name,
    instrumentSymbol: p.instrument.symbol,
    instrumentType: p.instrument.instrumentType,
    quantity: p.quantity ? p.quantity.toNumber() : null,
    averageCost: p.averageCost ? p.averageCost.toNumber() : null,
    currentValue: p.currentValue.toNumber(),
    acquisitionValue: p.acquisitionValue.toNumber(),
    accountId: p.accountId,
    financialInstitutionId: p.account.financialInstitutionId || "OTHER_INST",
    financialInstitutionName: p.account.financialInstitution?.name || "Outras Custódias / Carteira",
  }));

  const formattedEvents = events.map((e) => ({
    id: e.id,
    type: e.type,
    amount: e.amount.toNumber(),
    dateStr: new Date(e.date).toLocaleDateString("pt-BR"),
    instrumentName: e.investmentPosition.instrument.name,
    notes: e.notes,
  }));

  return (
    <InvestimentosClient
      initialAccounts={formattedAccounts}
      initialPositions={formattedPositions}
      initialEvents={formattedEvents}
    />
  );
}
