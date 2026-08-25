"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { Decimal } from "@/lib/decimal";

const refresh = () => ["/", "/compromissos", "/contas", "/cartoes", "/transacoes", "/resultado-mes", "/meu-patrimonio"].forEach(revalidatePath);

function dateAtNoon(value: string) {
  return new Date(value + "T12:00:00");
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

async function validateInput(accountId: string, categoryId: string | undefined, userId: string) {
  const account = await db.account.findFirst({ where: { id: accountId, userId, active: true } });
  if (!account) throw new Error("Conta ou cartão não encontrado.");
  if (categoryId) {
    const category = await db.category.findFirst({ where: { id: categoryId, userId, deletedAt: null } });
    if (!category) throw new Error("Categoria inválida.");
  }
}

export async function createRecurringCommitment(input: {
  accountId: string;
  categoryId?: string;
  description: string;
  amount: number;
  firstDueDate: string;
  notes?: string;
}) {
  const userId = await getDefaultUserId();
  if (!input.description.trim()) throw new Error("Informe a descrição.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Informe um valor maior que zero.");
  await validateInput(input.accountId, input.categoryId, userId);

  await db.$transaction(async (tx) => {
    const startDate = dateAtNoon(input.firstDueDate);
    const rule = await tx.recurringRule.create({
      data: {
        userId, accountId: input.accountId, categoryId: input.categoryId || null,
        description: input.description.trim(), amount: new Decimal(input.amount),
        startDate, notes: input.notes?.trim() || null,
      },
    });

    await tx.scheduledCommitment.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        userId, accountId: input.accountId, categoryId: input.categoryId || null,
        recurringRuleId: rule.id, description: input.description.trim(),
        amount: new Decimal(input.amount), dueDate: addMonths(startDate, index),
        sourceType: "RECURRING",
      })),
    });
  });

  refresh();
}

export async function createInstallmentCommitment(input: {
  accountId: string;
  categoryId?: string;
  description: string;
  totalAmount: number;
  installments: number;
  firstDueDate: string;
}) {
  const userId = await getDefaultUserId();
  if (!input.description.trim()) throw new Error("Informe a descrição.");
  if (!Number.isFinite(input.totalAmount) || input.totalAmount <= 0) throw new Error("Informe o valor total.");
  if (!Number.isInteger(input.installments) || input.installments < 2 || input.installments > 120) throw new Error("Informe entre 2 e 120 parcelas.");
  await validateInput(input.accountId, input.categoryId, userId);

  const groupId = randomUUID();
  const firstDate = dateAtNoon(input.firstDueDate);
  const cents = Math.round(input.totalAmount * 100);
  const baseCents = Math.floor(cents / input.installments);
  const remainder = cents - baseCents * input.installments;

  await db.scheduledCommitment.createMany({
    data: Array.from({ length: input.installments }, (_, index) => ({
      userId, accountId: input.accountId, categoryId: input.categoryId || null,
      description: input.description.trim(),
      amount: new Decimal((baseCents + (index < remainder ? 1 : 0)) / 100),
      dueDate: addMonths(firstDate, index), sourceType: "INSTALLMENT", groupId,
      installmentNumber: index + 1, totalInstallments: input.installments,
    })),
  });

  refresh();
}

export async function confirmScheduledCommitment(id: string) {
  const userId = await getDefaultUserId();

  await db.$transaction(async (tx) => {
    const commitment = await tx.scheduledCommitment.findFirst({
      where: { id, userId, status: "PENDING" },
      include: { account: true, recurringRule: true },
    });
    if (!commitment) throw new Error("Compromisso não encontrado ou já confirmado.");

    const transaction = await tx.transaction.create({
      data: {
        userId, accountId: commitment.accountId, date: commitment.dueDate,
        amount: commitment.amount, direction: "DEBIT", transactionType: "EXPENSE",
        categoryId: commitment.categoryId, description: commitment.description,
        source: "SCHEDULED",
        allocations: { create: [{ allocationType: "EXPENSE", amount: commitment.amount, categoryId: commitment.categoryId }] },
      },
    });

    await tx.account.update({
      where: { id: commitment.accountId },
      data: { calculatedBalance: { decrement: commitment.amount } },
    });

    await tx.scheduledCommitment.update({
      where: { id: commitment.id },
      data: { status: "POSTED", transactionId: transaction.id },
    });

    if (commitment.recurringRule?.active) {
      const existing = await tx.scheduledCommitment.findFirst({
        where: { recurringRuleId: commitment.recurringRuleId! },
        orderBy: { dueDate: "desc" },
      });
      const nextDueDate = addMonths(existing!.dueDate, 1);
      if (!commitment.recurringRule.endDate || nextDueDate <= commitment.recurringRule.endDate) {
        await tx.scheduledCommitment.create({
          data: {
            userId, accountId: commitment.accountId, categoryId: commitment.categoryId,
            recurringRuleId: commitment.recurringRuleId, description: commitment.description,
            amount: commitment.amount, dueDate: nextDueDate, sourceType: "RECURRING",
          },
        });
      }
    }
  });

  refresh();
}

export async function skipScheduledCommitment(id: string) {
  const userId = await getDefaultUserId();
  await db.scheduledCommitment.updateMany({ where: { id, userId, status: "PENDING" }, data: { status: "SKIPPED" } });
  refresh();
}
