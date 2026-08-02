import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { LIABILITY_TYPE_LABELS } from "@/lib/translations";
import { DividasClient } from "./DividasClient";

export const dynamic = "force-dynamic";

async function getDividasData() {
  try {
    const userId = await getDefaultUserId();

    const liabilities = await db.liability.findMany({
      where: { userId, active: true },
      include: { associatedAsset: true },
      orderBy: { createdAt: "asc" },
    });

    const assets = await db.asset.findMany({
      where: { userId, active: true },
      select: { id: true, name: true, currentValue: true },
    });

    return { liabilities, assets };
  } catch (error) {
    console.error("Erro ao carregar passivos:", error);
    return { liabilities: [], assets: [] };
  }
}

export default async function DividasPage() {
  const { liabilities, assets } = await getDividasData();

  const formattedLiabilities = liabilities.map((l) => ({
    id: l.id,
    name: l.name,
    institution: l.institution,
    type: l.type,
    typeLabel: LIABILITY_TYPE_LABELS[l.type] || l.type,
    originalValue: l.originalValue.toNumber(),
    currentBalance: l.currentBalance.toNumber(),
    associatedAsset: l.associatedAsset
      ? {
          name: l.associatedAsset.name,
          currentValue: l.associatedAsset.currentValue.toNumber(),
        }
      : null,
  }));

  const formattedAssets = assets.map((a) => ({
    id: a.id,
    name: a.name,
  }));

  return <DividasClient initialLiabilities={formattedLiabilities} assets={formattedAssets} />;
}
