"use server";
import { revalidatePath } from "next/cache";
import { getDefaultUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";

export type ImportRuleAction = "TRANSFER_IN" | "TRANSFER_OUT" | "INVESTMENT_CONTRIBUTION" | "INVESTMENT_WITHDRAWAL";

export async function saveImportClassificationRule(input: { id?: string; matchText: string; action: ImportRuleAction; targetType: "ACCOUNT" | "INVESTMENT"; targetId: string }) {
  const userId = await getDefaultUserId();
  if (!input.matchText.trim()) throw new Error("Informe o texto que aparece no extrato.");
  if (input.targetType === "ACCOUNT") {
    if (!await db.account.findFirst({ where: { id: input.targetId, userId, active: true } })) throw new Error("A conta selecionada não é válida.");
  } else if (!await db.investmentPosition.findFirst({ where: { id: input.targetId, userId, active: true } })) throw new Error("O investimento selecionado não é válido.");
  const data = { financialInstitution: "BANCO_DO_BRASIL", matchText: input.matchText.trim(), action: input.action, counterpartAccountId: input.targetType === "ACCOUNT" ? input.targetId : null, investmentPositionId: input.targetType === "INVESTMENT" ? input.targetId : null, categoryId: null, active: true };
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
