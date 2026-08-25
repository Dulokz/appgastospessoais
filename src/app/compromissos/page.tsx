import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { CompromissosClient } from "./CompromissosClient";

export const dynamic = "force-dynamic";

export default async function CompromissosPage() {
  const userId = await getDefaultUserId();
  const [accounts, categories] = await Promise.all([
    db.account.findMany({ where: { userId, active: true }, include: { financialInstitution: true }, orderBy: { createdAt: "asc" } }),
    db.category.findMany({ where: { userId, deletedAt: null }, include: { parent: true }, orderBy: { name: "asc" } }),
  ]);

  let commitments: Awaited<ReturnType<typeof db.scheduledCommitment.findMany>> = [];
  let loadError: string | null = null;

  try {
    commitments = await db.scheduledCommitment.findMany({
      where: { userId, status: "PENDING" },
      include: { account: { include: { financialInstitution: true } }, category: { include: { parent: true } } },
      orderBy: { dueDate: "asc" },
      take: 80,
    });
  } catch (error) {
    console.error("Erro ao carregar compromissos programados:", error);
    loadError = "A estrutura de compromissos ainda não está sincronizada no banco.";
  }

  return <CompromissosClient
    loadError={loadError}
    accounts={accounts.map((account) => ({ id: account.id, name: account.name, type: account.type, institution: account.financialInstitution?.name || "Instituição manual" }))}
    categories={categories.map((category) => ({ id: category.id, label: category.parent ? `${category.parent.name} › ${category.name}` : category.name }))}
    initialCommitments={commitments.map((item) => ({ id: item.id, description: item.description, amount: Number(item.amount), dueDate: item.dueDate.toISOString(), accountName: item.account.name, institution: item.account.financialInstitution?.name || "Instituição manual", categoryName: item.category ? (item.category.parent ? `${item.category.parent.name} › ${item.category.name}` : item.category.name) : null, sourceType: item.sourceType, installmentNumber: item.installmentNumber, totalInstallments: item.totalInstallments }))}
  />;
}
