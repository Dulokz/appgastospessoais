"use server";

import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { revalidatePath } from "next/cache";

export type QuickFlow = "GASTEI" | "RECEBI" | "TRANSFERI" | "COMPREI_BEM" | "PAGUEI_FATURA";

export async function createQuickTransactionV2(data: {
  flow: QuickFlow;
  amount: number;
  sourceAccountId: string;
  destAccountId?: string;
  categoryId?: string;
  description: string;
  treatAs?: "EXPENSE" | "ASSET";
  assetName?: string;
  assetCategory?: string;
}) {
  const userId = await getDefaultUserId();

  if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error("Informe um valor válido.");

  await db.$transaction(async (tx) => {
    const source = await tx.account.findFirst({ where: { id: data.sourceAccountId, userId, active: true } });
    if (!source) throw new Error("Conta/cartão de origem não encontrado.");

    const isCard = source.type === "CREDIT_CARD";

    if (data.flow === "GASTEI") {
      await tx.transaction.create({
        data: {
          userId,
          accountId: source.id,
          amount: data.amount,
          direction: "DEBIT",
          transactionType: "EXPENSE",
          categoryId: data.categoryId || null,
          description: data.description || "Despesa",
          allocations: { create: [{ allocationType: "EXPENSE", amount: data.amount, categoryId: data.categoryId || null }] },
        },
      });
      await tx.account.update({ where: { id: source.id }, data: { calculatedBalance: { decrement: data.amount } } });
    }

    if (data.flow === "RECEBI") {
      if (isCard) throw new Error("Receitas devem entrar em uma conta financeira, não diretamente no cartão.");
      await tx.transaction.create({
        data: {
          userId,
          accountId: source.id,
          amount: data.amount,
          direction: "CREDIT",
          transactionType: "INCOME",
          categoryId: data.categoryId || null,
          description: data.description || "Receita",
          allocations: { create: [{ allocationType: "INCOME", amount: data.amount, categoryId: data.categoryId || null }] },
        },
      });
      await tx.account.update({ where: { id: source.id }, data: { calculatedBalance: { increment: data.amount } } });
    }

    if (data.flow === "TRANSFERI" || data.flow === "PAGUEI_FATURA") {
      if (!data.destAccountId || data.destAccountId === source.id) throw new Error("Escolha uma conta de destino diferente.");
      const dest = await tx.account.findFirst({ where: { id: data.destAccountId, userId, active: true } });
      if (!dest) throw new Error("Conta/cartão de destino não encontrado.");

      if (data.flow === "PAGUEI_FATURA") {
        if (source.type === "CREDIT_CARD") throw new Error("O pagamento da fatura deve sair de uma conta bancária.");
        if (dest.type !== "CREDIT_CARD") throw new Error("O destino do pagamento deve ser um cartão de crédito.");
      }

      await tx.transaction.create({
        data: {
          userId,
          accountId: source.id,
          destinationAccountId: dest.id,
          amount: data.amount,
          direction: "DEBIT",
          transactionType: data.flow === "PAGUEI_FATURA" ? "CARD_PAYMENT" : "TRANSFER",
          description: data.description || (data.flow === "PAGUEI_FATURA" ? `Pagamento de fatura: ${dest.name}` : "Transferência"),
          allocations: { create: [{ allocationType: "TRANSFER", amount: data.amount }] },
        },
      });

      await tx.account.update({ where: { id: source.id }, data: { calculatedBalance: { decrement: data.amount } } });
      await tx.account.update({ where: { id: dest.id }, data: { calculatedBalance: { increment: data.amount } } });
    }

    if (data.flow === "COMPREI_BEM") {
      const treatAs = data.treatAs || "ASSET";

      if (treatAs === "EXPENSE") {
        await tx.transaction.create({
          data: {
            userId,
            accountId: source.id,
            amount: data.amount,
            direction: "DEBIT",
            transactionType: "EXPENSE",
            categoryId: data.categoryId || null,
            description: data.description || data.assetName || "Compra",
            allocations: { create: [{ allocationType: "EXPENSE", amount: data.amount, categoryId: data.categoryId || null }] },
          },
        });
        await tx.account.update({ where: { id: source.id }, data: { calculatedBalance: { decrement: data.amount } } });
      } else {
        if (!data.assetName?.trim()) throw new Error("Informe o nome do bem patrimonial.");

        const asset = await tx.asset.create({
          data: {
            userId,
            name: data.assetName.trim(),
            category: data.assetCategory || "OTHER",
            entryMethod: isCard ? "PURCHASE_FINANCED" : "PURCHASE_CASH",
            acquisitionValue: data.amount,
            currentValue: data.amount,
            acquisitionMode: isCard ? "FINANCED" : "FULL_OWNERSHIP",
            valuations: { create: [{ value: data.amount, source: "MANUAL", notes: "Valor de aquisição" }] },
          },
        });

        await tx.transaction.create({
          data: {
            userId,
            accountId: source.id,
            amount: data.amount,
            direction: "DEBIT",
            transactionType: "ASSET_PURCHASE",
            description: data.description || `Aquisição: ${asset.name}`,
            allocations: { create: [{ allocationType: "ASSET_INCREASE", amount: data.amount, assetId: asset.id }] },
          },
        });

        await tx.account.update({ where: { id: source.id }, data: { calculatedBalance: { decrement: data.amount } } });
      }
    }
  });

  ["/", "/contas", "/patrimonio", "/meu-patrimonio", "/transacoes", "/resultado-mes", "/dividas"].forEach(revalidatePath);
}
