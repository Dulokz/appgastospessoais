import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { LIABILITY_TYPE_LABELS } from "@/lib/translations";
import { DividasClientV2 } from "./DividasClientV2";

export const dynamic = "force-dynamic";

async function getDividasData() {
  try {
    const userId = await getDefaultUserId();

    const [liabilities, assets, accounts] = await Promise.all([
      db.liability.findMany({
        where: { userId, active: true },
        include: { associatedAsset: true },
        orderBy: { createdAt: "asc" },
      }),
      db.asset.findMany({
        where: { userId, active: true },
        select: { id: true, name: true },
      }),
      db.account.findMany({
        where: { userId, active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return { liabilities, assets, accounts };
  } catch (error) {
    console.error("Erro ao carregar passivos:", error);
    return { liabilities: [], assets: [], accounts: [] };
  }
}

export default async function DividasPage() {
  const { liabilities, assets, accounts } = await getDividasData();

  const formattedLiabilities = liabilities.map((l) => ({
    id: l.id,
    name: l.name,
    institution: l.institution,
    type: l.type,
    typeLabel: LIABILITY_TYPE_LABELS[l.type] || l.type,
    originalValue: l.originalValue.toNumber(),
    currentBalance: l.currentBalance.toNumber(),
    isInitialPosition: l.isInitialPosition,
  }));

  return (
    <DividasClientV2
      initialLiabilities={formattedLiabilities}
      assets={assets}
      accounts={accounts}
    />
  );
}
