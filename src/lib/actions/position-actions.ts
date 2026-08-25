"use server";

import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { revalidatePath } from "next/cache";

function refreshFinancialViews() {
  revalidatePath("/");
  revalidatePath("/contas");
  revalidatePath("/dividas");
  revalidatePath("/patrimonio");
  revalidatePath("/meu-patrimonio");
  revalidatePath("/resultado-mes");
}

/**
 * Registra uma dívida que JÁ EXISTIA antes do início do controle.
 * Não cria transação, não movimenta conta e não entra no resultado do mês.
 * Ela corrige a posição patrimonial atual e passa a compor o PL.
 */
export async function registerPreexistingLiability(data: {
  name: string;
  type: string;
  institution?: string;
  originalValue?: number;
  currentBalance: number;
  associatedAssetId?: string;
  notes?: string;
}) {
  const userId = await getDefaultUserId();

  const liability = await db.liability.create({
    data: {
      userId,
      name: data.name.trim(),
      type: data.type,
      institution: data.institution || null,
      originalValue: data.originalValue || data.currentBalance,
      currentBalance: data.currentBalance,
      associatedAssetId: data.associatedAssetId || null,
      isInitialPosition: true,
      notes: ["AJUSTE_POSICAO_INICIAL", data.notes].filter(Boolean).join(" | "),
    },
  });

  refreshFinancialViews();
  return liability;
}

/**
 * Registra um empréstimo novo recebido em dinheiro depois do início do controle.
 * O caixa sobe e o passivo sobe no mesmo valor: impacto patrimonial inicial = zero.
 * Financiamentos de bens devem nascer pelo fluxo de aquisição do próprio bem.
 */
export async function registerNewCashLoan(data: {
  name: string;
  type: string;
  institution?: string;
  amount: number;
  destinationAccountId: string;
  notes?: string;
}) {
  const userId = await getDefaultUserId();

  return db.$transaction(async (tx) => {
    const account = await tx.account.findFirst({
      where: { id: data.destinationAccountId, userId, active: true },
    });
    if (!account) throw new Error("Conta de destino não encontrada.");

    const liability = await tx.liability.create({
      data: {
        userId,
        name: data.name.trim(),
        type: data.type,
        institution: data.institution || null,
        originalValue: data.amount,
        currentBalance: data.amount,
        isInitialPosition: false,
        notes: data.notes || null,
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        accountId: account.id,
        amount: data.amount,
        direction: "CREDIT",
        transactionType: "LIABILITY_PROCEEDS",
        description: `Entrada de empréstimo: ${liability.name}`,
        source: "MANUAL",
        allocations: {
          create: [{
            allocationType: "LIABILITY_INCREASE",
            amount: data.amount,
            liabilityId: liability.id,
          }],
        },
      },
    });

    await tx.account.update({
      where: { id: account.id },
      data: { calculatedBalance: { increment: data.amount } },
    });

    refreshFinancialViews();
    return { liability, transaction };
  });
}

/**
 * Compra patrimonial à vista depois do início do controle.
 * Converte dinheiro em bem: reduz conta, aumenta ativo e não trata a compra como consumo.
 */
export async function purchasePhysicalAssetCash(data: {
  name: string;
  category: string;
  amount: number;
  sourceAccountId: string;
  acquisitionDate?: string;
  notes?: string;
}) {
  const userId = await getDefaultUserId();

  return db.$transaction(async (tx) => {
    const account = await tx.account.findFirst({
      where: { id: data.sourceAccountId, userId, active: true },
    });
    if (!account) throw new Error("Conta de origem não encontrada.");

    const asset = await tx.asset.create({
      data: {
        userId,
        name: data.name.trim(),
        category: data.category,
        entryMethod: "PURCHASE_CASH",
        acquisitionMode: "FULL_OWNERSHIP",
        acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : new Date(),
        acquisitionValue: data.amount,
        currentValue: data.amount,
        notes: data.notes || null,
        valuations: {
          create: [{ value: data.amount, source: "PURCHASE", notes: "Valor na aquisição" }],
        },
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        accountId: account.id,
        amount: data.amount,
        direction: "DEBIT",
        transactionType: "ASSET_PURCHASE",
        description: `Aquisição patrimonial: ${asset.name}`,
        source: "MANUAL",
        allocations: {
          create: [{
            allocationType: "ASSET_INCREASE",
            amount: data.amount,
            assetId: asset.id,
          }],
        },
      },
    });

    await tx.account.update({
      where: { id: account.id },
      data: { calculatedBalance: { decrement: data.amount } },
    });

    refreshFinancialViews();
    return { asset, transaction };
  });
}
