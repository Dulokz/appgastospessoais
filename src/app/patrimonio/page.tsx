import { getAssets, getAccounts } from "@/lib/actions/db-actions";
import { ASSET_CATEGORY_OPTIONS } from "@/lib/asset-categories";
import { PatrimonioClient } from "./PatrimonioClient";

export const dynamic = "force-dynamic";

export default async function PatrimonioPage() {
  const [dbAssets, dbAccounts] = await Promise.all([getAssets(), getAccounts()]);

  const formattedAssets = dbAssets.map((a) => ({
    id: a.id, name: a.name, category: a.category, entryMethod: a.entryMethod,
    acquisitionValue: a.acquisitionValue.toNumber(), currentValue: a.currentValue.toNumber(), considerInNetWorth: a.considerInNetWorth,
  }));

  const formattedAccounts = dbAccounts.map((acc) => ({
    id: acc.id, name: `${acc.name} ${acc.financialInstitution ? `(${acc.financialInstitution.name})` : ""}`,
  }));

  // Catálogo exclusivo para Bens: despesas e receitas não participam deste seletor.
  const assetCategories = Array.from(new Set(ASSET_CATEGORY_OPTIONS.map((item) => item.group))).map((group) => ({
    id: `asset-group:${group}`,
    name: group,
    subcategories: ASSET_CATEGORY_OPTIONS.filter((item) => item.group === group).map((item) => ({ id: item.value, name: item.label })),
  }));

  return <PatrimonioClient initialAssets={formattedAssets} accounts={formattedAccounts} categories={assetCategories} />;
}