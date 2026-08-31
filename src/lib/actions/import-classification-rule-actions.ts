"use server";

import { revalidatePath } from "next/cache";
import { getDefaultUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";

export async function saveImportClassificationRule(input: { id?: string; name: string; matchText: string; action: "TRANSFER_IN" | "TRANSFER_OUT"; counterpartAccountId: string }) {
  const userId = await getDefaultUserId();
  if (!input.name.trim() || !input.matchText.trim()) throw new Error("Informe o nome e o texto do extrato.");
  const account = await db.account.findFirst({ where: { id: input.counterpartAccountId, userId, active: true } });
  if (!account) throw new Error("A conta ou aplicação selecionada não é válida.");
  const data = { financialInstitution: "BANCO_DO_BRASIL", matchText: input.matchText.trim(), action: input.action, counterpartAccountId: account.id, active: true };
  if (input.id) {
    const rule = await db.importClassificationRule.findFirst({ where: { id: input.id, userId } });
    if (!rule) throw new Error("Regra não encontrada.");
    await db.importClassificationRule.update({ where: { id: rule.id }, data });
  } else await db.importClassificationRule.create({ data: { userId, ...data } });
  revalidatePath("/configuracoes"); revalidatePath("/importar");
}

export async function deleteImportClassificationRule(id: string) {
  const userId = await getDefaultUserId();
  await db.importClassificationRule.deleteMany({ where: { id, userId } });
  revalidatePath("/configuracoes"); revalidatePath("/importar");
}
