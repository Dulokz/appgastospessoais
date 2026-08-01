import { db } from "@/lib/db";
import { ASSET_CATEGORY_LABELS } from "@/lib/translations";
import { PatrimonioClient } from "./PatrimonioClient";

export const dynamic = "force-dynamic";

async function getAssetsData() {
  try {
    const user = await db.user.findFirst({
      include: {
        assets: {
          where: { active: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return user?.assets || [];
  } catch (error) {
    console.error("Erro ao carregar ativos:", error);
    return [];
  }
}

export default async function PatrimonioPage() {
  const dbAssets = await getAssetsData();

  const assets = dbAssets.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    categoryLabel: ASSET_CATEGORY_LABELS[a.category] || a.category,
    acqValue: a.acquisitionValue.toNumber(),
    currentValue: a.currentValue.toNumber(),
    inNetWorth: a.considerInNetWorth,
  }));

  return <PatrimonioClient initialAssets={assets} />;
}
