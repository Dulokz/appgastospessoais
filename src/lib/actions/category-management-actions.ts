"use server";

import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { revalidatePath } from "next/cache";

export async function archiveCategory(id: string) {
  const userId = await getDefaultUserId();
  const category = await db.category.findFirst({
    where: { id, userId, deletedAt: null },
    include: { subcategories: { where: { deletedAt: null }, select: { id: true } } },
  });
  if (!category) throw new Error("Categoria não encontrada.");

  const ids = [category.id, ...category.subcategories.map((item) => item.id)];
  const [transactions, allocations] = await Promise.all([
    db.transaction.count({ where: { userId, categoryId: { in: ids }, deletedAt: null } }),
    db.transactionAllocation.count({ where: { categoryId: { in: ids } } }),
  ]);
  if (transactions + allocations > 0) {
    throw new Error("Esta categoria já possui lançamentos. Para preservar seu histórico, recategorize os lançamentos antes de arquivá-la.");
  }

  await db.category.updateMany({ where: { userId, id: { in: ids } }, data: { deletedAt: new Date() } });
  ["/", "/categorias", "/transacoes", "/resultado-mes", "/relatorios"].forEach((path) => revalidatePath(path));
}
