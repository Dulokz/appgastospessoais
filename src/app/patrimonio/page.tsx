import { getAssets, getAccounts, getCategories } from "@/lib/actions/db-actions";
import { PatrimonioClient } from "./PatrimonioClient";

export const dynamic = "force-dynamic";

export default async function PatrimonioPage() {
  const [dbAssets, dbAccounts, dbCategories] = await Promise.all([
    getAssets(),
    getAccounts(),
    getCategories(),
  ]);

  const formattedAssets = dbAssets.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    entryMethod: a.entryMethod,
    acquisitionValue: a.acquisitionValue.toNumber(),
    currentValue: a.currentValue.toNumber(),
    considerInNetWorth: a.considerInNetWorth,
  }));

  const formattedAccounts = dbAccounts.map((acc) => ({
    id: acc.id,
    name: `${acc.name} ${acc.financialInstitution ? `(${acc.financialInstitution.name})` : ""}`,
  }));

  const formattedCategories = dbCategories.map((c) => ({
    id: c.id,
    name: c.name,
    subcategories: c.subcategories.map((sub) => ({
      id: sub.id,
      name: sub.name,
    })),
  }));

  return (
    <PatrimonioClient
      initialAssets={formattedAssets}
      accounts={formattedAccounts}
      categories={formattedCategories}
    />
  );
}
