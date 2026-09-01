"use server";

import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { toDecimal } from "@/lib/decimal";
import { FinancialCommandService } from "@/lib/services/financial-command.service";
import { revalidatePath } from "next/cache";

function refresh(paths: string[]) { paths.forEach((path) => revalidatePath(path)); }

export async function updateAccountProfile(input: { id: string; name: string; institutionName?: string }) {
  const userId = await getDefaultUserId();
  if (!input.name.trim()) throw new Error("Informe o nome da conta.");
  await db.$transaction(async tx => {
    const account = await tx.account.findFirst({ where: { id: input.id, userId, active: true } });
    if (!account) throw new Error("Conta não encontrada.");
    let financialInstitutionId = account.financialInstitutionId;
    if (input.institutionName?.trim()) {
      const existing = await tx.financialInstitution.findFirst({ where: { userId, name: input.institutionName.trim(), active: true } });
      financialInstitutionId = existing?.id || (await tx.financialInstitution.create({ data: { userId, name: input.institutionName.trim() } })).id;
    }
    await tx.account.update({ where: { id: account.id }, data: { name: input.name.trim(), financialInstitutionId } });
  });
  refresh(["/", "/contas", "/transacoes"]);
}

export async function correctAccountOpeningBalance(input: { id: string; balance: number }) {
  if (!Number.isFinite(input.balance)) throw new Error("Informe um saldo válido.");
  const userId = await getDefaultUserId();
  await FinancialCommandService.correctInitialBalance({ userId, accountId: input.id, newInitialBalance: input.balance });
}

export async function updateAssetProfile(input: { id: string; name: string; category: string; currentValue: number; notes?: string; considerInNetWorth: boolean }) {
  const userId = await getDefaultUserId();
  if (!input.name.trim() || !input.category || input.currentValue < 0) throw new Error("Preencha os dados do bem corretamente.");
  await db.$transaction(async tx => {
    const asset = await tx.asset.findFirst({ where: { id: input.id, userId, active: true } });
    if (!asset) throw new Error("Bem não encontrado.");
    const value = toDecimal(input.currentValue);
    await tx.asset.update({ where: { id: asset.id }, data: { name: input.name.trim(), category: input.category, currentValue: value, lastValuationDate: new Date(), notes: input.notes?.trim() || null, considerInNetWorth: input.considerInNetWorth } });
    await tx.assetValuation.create({ data: { assetId: asset.id, value, source: "MANUAL", notes: "Reavaliação manual" } });
  });
  refresh(["/", "/patrimonio", "/meu-patrimonio", "/relatorios"]);
}

export async function archiveAsset(id: string) {
  const userId = await getDefaultUserId();
  await db.asset.updateMany({ where: { id, userId, active: true }, data: { active: false, deletedAt: new Date() } });
  refresh(["/", "/patrimonio", "/meu-patrimonio", "/relatorios"]);
}

export async function updateLiabilityProfile(input: { id: string; name: string; institution?: string; type: string; associatedAssetId?: string | null; currentBalance?: number }) {
  const userId = await getDefaultUserId();
  if (!input.name.trim()) throw new Error("Informe o nome da dívida.");
  await db.$transaction(async tx => {
    const liability = await tx.liability.findFirst({ where: { id: input.id, userId, active: true } });
    if (!liability) throw new Error("Dívida não encontrada.");
    if (input.associatedAssetId) {
      const asset = await tx.asset.findFirst({ where: { id: input.associatedAssetId, userId, active: true } });
      if (!asset) throw new Error("Bem associado inválido.");
    }
    const data:any = { name: input.name.trim(), institution: input.institution?.trim() || null, type: input.type, associatedAssetId: input.associatedAssetId || null };
    if (liability.isInitialPosition && input.currentBalance !== undefined) data.currentBalance = toDecimal(input.currentBalance);
    await tx.liability.update({ where: { id: liability.id }, data });
  });
  refresh(["/", "/dividas", "/meu-patrimonio", "/relatorios"]);
}

export async function archiveLiability(id: string) {
  const userId = await getDefaultUserId();
  const liability = await db.liability.findFirst({ where: { id, userId, active: true } });
  if (!liability) throw new Error("Dívida não encontrada.");
  if (toDecimal(liability.currentBalance).gt(0)) throw new Error("Não arquive uma dívida com saldo. Primeiro registre a quitação ou ajuste o saldo inicial.");
  await db.liability.update({ where: { id }, data: { active: false, deletedAt: new Date() } });
  refresh(["/", "/dividas", "/meu-patrimonio", "/relatorios"]);
}
