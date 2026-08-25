"use server";

import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { Decimal } from "@/lib/decimal";
import { revalidatePath } from "next/cache";

const EDITABLE_TYPES = new Set(["INCOME", "EXPENSE", "REFUND", "INTEREST_INCOME", "INTEREST_EXPENSE", "FEE", "OTHER"]);

function refreshViews() {
  ["/", "/transacoes", "/contas", "/resultado-mes", "/relatorios", "/meu-patrimonio"].forEach(revalidatePath);
}

async function getEditableTransaction(id: string) {
  const userId = await getDefaultUserId();
  const transaction = await db.transaction.findFirst({
    where: { id, userId, deletedAt: null },
    include: { allocations: true },
  });
  if (!transaction) throw new Error("Lançamento não encontrado.");
  if (!EDITABLE_TYPES.has(transaction.transactionType)) {
    throw new Error("Esta operação tem efeitos patrimoniais vinculados. Use o fluxo específico de estorno, que será disponibilizado em seguida.");
  }
  if (transaction.allocations.some((item) => item.assetId || item.liabilityId)) {
    throw new Error("Este lançamento está vinculado a bem ou dívida e não pode ser alterado por aqui.");
  }
  return transaction;
}

export async function updateSimpleTransaction(input: {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId?: string | null;
  notes?: string | null;
}) {
  if (!input.description.trim()) throw new Error("Informe uma descrição.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Informe um valor maior que zero.");

  const transaction = await getEditableTransaction(input.id);
  const userId = await getDefaultUserId();
  if (input.categoryId) {
    const category = await db.category.findFirst({ where: { id: input.categoryId, userId, deletedAt: null } });
    if (!category) throw new Error("Categoria inválida.");
  }

  await db.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        description: input.description.trim(),
        amount: new Decimal(input.amount),
        date: new Date(input.date + "T12:00:00"),
        categoryId: input.categoryId || null,
        notes: input.notes?.trim() || null,
      },
    });
    if (transaction.allocations.length === 1) {
      await tx.transactionAllocation.update({
        where: { id: transaction.allocations[0].id },
        data: { amount: new Decimal(input.amount), categoryId: input.categoryId || null },
      });
    }
    if (transaction.allocations.length > 1) {
      throw new Error("Lançamentos rateados devem ser ajustados pelo editor de rateio.");
    }
  });

  refreshViews();
}

export async function deleteSimpleTransaction(id: string) {
  const transaction = await getEditableTransaction(id);
  if (transaction.allocations.length > 1) {
    throw new Error("Lançamentos rateados devem ser estornados pelo editor de rateio.");
  }

  await db.$transaction(async (tx) => {
    const reverse = transaction.direction === "CREDIT"
      ? new Decimal(transaction.amount).negated()
      : new Decimal(transaction.amount);
    await tx.account.update({ where: { id: transaction.accountId }, data: { calculatedBalance: { increment: reverse } } });
    await tx.transaction.delete({ where: { id: transaction.id } });
  });

  refreshViews();
}
