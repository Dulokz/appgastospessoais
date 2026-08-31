import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { StatementImportClient } from "@/components/imports/StatementImportClient";

export default async function ImportarPage() {
  const userId = await getDefaultUserId();
  const [accounts, categories, rules] = await Promise.all([
    db.account.findMany({
      where: { userId, active: true },
      include: { financialInstitution: { select: { name: true } } },
      orderBy: [{ financialInstitution: { name: "asc" } }, { name: "asc" }],
    }),
    db.category.findMany({
      where: { userId, deletedAt: null },
      include: { parent: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    db.importClassificationRule.findMany({ where: { userId, active: true } }),
  ]);

  return (
    <StatementImportClient
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        institutionName: account.financialInstitution?.name || null,
      }))}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        parentName: category.parent?.name || null,
      }))}
      rules={rules.filter((rule) => rule.action === "TRANSFER_IN" || rule.action === "TRANSFER_OUT").map((rule) => ({ matchText: rule.matchText, action: rule.action as "TRANSFER_IN" | "TRANSFER_OUT", counterpartAccountId: rule.counterpartAccountId }))}
    />
  );
}
