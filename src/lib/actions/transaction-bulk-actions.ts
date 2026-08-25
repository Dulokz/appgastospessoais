"use server";

import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { revalidatePath } from "next/cache";

export async function recategorizeTransactions(input: { transactionIds: string[]; categoryId: string }) {
  const userId = await getDefaultUserId();
  const ids = [...new Set(input.transactionIds)].filter(Boolean);
  if (!ids.length) throw new Error("Selecione pelo menos um lançamento.");
  const category = await db.category.findFirst({ where: { id: input.categoryId, userId, deletedAt: null } });
  if (!category) throw new Error("Escolha uma categoria válida.");

  await db.$transaction(async (tx) => {
    const owned = await tx.transaction.findMany({
      where: { id: { in: ids }, userId, deletedAt: null },
      select: { id: true },
    });
    if (owned.length !== ids.length) throw new Error("Um ou mais lançamentos não foram encontrados.");

    await tx.transaction.updateMany({ where: { id: { in: ids }, userId }, data: { categoryId: category.id } });
    await tx.transactionAllocation.updateMany({
      where: {
        transactionId: { in: ids },
        assetId: null,
        liabilityId: null,
        allocationType: { in: ["EXPENSE", "INCOME", "INTEREST", "FEE"] },
      },
      data: { categoryId: category.id },
    });
  });

  ["/", "/transacoes", "/categorias", "/resultado-mes", "/relatorios"].forEach(revalidatePath);
}
