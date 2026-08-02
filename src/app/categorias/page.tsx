import { getCategories } from "@/lib/actions/db-actions";
import { CategoriasClient } from "./CategoriasClient";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const dbCategories = await getCategories();

  const formattedCategories = dbCategories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    subcategories: c.subcategories.map((sub) => ({
      id: sub.id,
      name: sub.name,
    })),
  }));

  return <CategoriasClient initialCategories={formattedCategories} />;
}
