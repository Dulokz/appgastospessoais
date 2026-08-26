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
    include: { allocations: true, account: true },
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

  const newAmount = new Decimal(input.amount);
  const newDate = new Date(input.date + "T12:00:00");
  const amountDifference = newAmount.minus(transaction.amount);

  await db.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        description: input.description.trim(),
        amount: newAmount,
        date: newDate,
        categoryId: input.categoryId || null,
        notes: input.notes?.trim() || null,
        // Uma despesa no cartão pertence à fatura definida pela data da compra.
        cardInvoiceKey: transaction.account.type === "CREDIT_CARD" && transaction.direction === "DEBIT"
          ? getInvoiceKeyForDate(newDate, transaction.account.creditCardClosingDay)
          : transaction.cardInvoiceKey,
      },
    });

    // Corrige somente a diferença. Ex.: R$ 10 alterado para R$ 15 reduz mais R$ 5 do saldo.
    if (!amountDifference.isZero()) {
      const balanceChange = transaction.direction === "CREDIT" ? amountDifference : amountDifference.negated();
      await tx.account.update({
        where: { id: transaction.accountId },
        data: { calculatedBalance: { increment: balanceChange } },
      });
    }
    if (transaction.allocations.length === 1) {
      await tx.transactionAllocation.update({
        where: { id: transaction.allocations[0].id },
        data: { amount: newAmount, categoryId: input.categoryId || null },
      });
    }
    if (transaction.allocations.length > 1) {
      throw new Error("Lançamentos rateados devem ser ajustados pelo editor de rateio.");
    }
  });

  refreshViews();
  revalidatePath("/cartoes");
  if (transaction.account.type === "CREDIT_CARD") revalidatePath(`/cartoes/${transaction.accountId}`);
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
  revalidatePath("/cartoes");
  if (transaction.account.type === "CREDIT_CARD") revalidatePath(`/cartoes/${transaction.accountId}`);
}


function getInvoiceKeyForDate(date: Date, closingDay?: number | null) {
  const reference = new Date(date);
  if (reference.getDate() > (closingDay || 25)) reference.setMonth(reference.getMonth() + 1);
  return `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Entrada manual única para as três operações cotidianas.
 * Não cria lançamentos previstos: cada confirmação representa um fato que já ocorreu.
 */
export async function createGuidedTransaction(input: {
  kind: "EXPENSE" | "INCOME" | "TRANSFER";
  description: string;
  amount: number;
  date: string;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  notes?: string | null;
}) {
  const userId = await getDefaultUserId();
  const description = input.description.trim();
  if (!description) throw new Error("Dê um nome ao lançamento para reconhecê-lo depois.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Informe um valor maior que zero.");
  const date = new Date(`${input.date}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Informe uma data válida.");

  await db.$transaction(async (tx) => {
    const account = await tx.account.findFirst({ where: { id: input.accountId, userId, active: true } });
    if (!account) throw new Error("Escolha uma conta ou cartão ativo.");

    if (input.categoryId) {
      const category = await tx.category.findFirst({ where: { id: input.categoryId, userId, deletedAt: null } });
      if (!category) throw new Error("A categoria escolhida não é válida.");
    }

    if (input.kind === "TRANSFER") {
      if (!input.destinationAccountId || input.destinationAccountId === input.accountId) {
        throw new Error("Escolha uma conta de destino diferente da origem.");
      }
      const destination = await tx.account.findFirst({ where: { id: input.destinationAccountId, userId, active: true } });
      if (!destination) throw new Error("A conta de destino não é válida.");

      await tx.transaction.create({
        data: {
          userId, accountId: account.id, destinationAccountId: destination.id,
          amount: new Decimal(input.amount), date, direction: "DEBIT", transactionType: "TRANSFER",
          description, notes: input.notes?.trim() || null,
          allocations: { create: [{ allocationType: "TRANSFER", amount: new Decimal(input.amount) }] },
        },
      });
      await tx.account.update({ where: { id: account.id }, data: { calculatedBalance: { decrement: new Decimal(input.amount) } } });
      await tx.account.update({ where: { id: destination.id }, data: { calculatedBalance: { increment: new Decimal(input.amount) } } });
      return;
    }

    const isExpense = input.kind === "EXPENSE";
    await tx.transaction.create({
      data: {
        userId, accountId: account.id, amount: new Decimal(input.amount), date,
        direction: isExpense ? "DEBIT" : "CREDIT",
        transactionType: isExpense ? "EXPENSE" : "INCOME",
        categoryId: input.categoryId || null, description, notes: input.notes?.trim() || null,
        cardInvoiceKey: isExpense && account.type === "CREDIT_CARD" ? getInvoiceKeyForDate(date, account.creditCardClosingDay) : null,
        allocations: { create: [{ allocationType: isExpense ? "EXPENSE" : "INCOME", amount: new Decimal(input.amount), categoryId: input.categoryId || null }] },
      },
    });
    await tx.account.update({
      where: { id: account.id },
      data: { calculatedBalance: isExpense ? { decrement: new Decimal(input.amount) } : { increment: new Decimal(input.amount) } },
    });
  });

  refreshViews();
  revalidatePath("/cartoes");
  revalidatePath("/cartoes/[id]", "page");
}
