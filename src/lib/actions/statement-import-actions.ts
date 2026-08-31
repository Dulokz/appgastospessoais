"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { Decimal } from "@/lib/decimal";

type ImportedEntry = {
  date: string;
  description: string;
  signedAmount: number;
  externalId?: string | null;
  categoryId?: string | null;
  ignored?: boolean;
  importKind?: "TRANSFER";
  sourceAccountId?: string | null;
};

function invoiceKeyForDate(date: Date, closingDay?: number | null) {
  const reference = new Date(date);
  if (reference.getDate() > (closingDay || 25)) reference.setMonth(reference.getMonth() + 1);
  return `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Confirma uma revisão de extrato. Nenhuma linha é lançada antes desta etapa.
 * importHash + externalId tornam a mesma linha idempotente por conta.
 */
export async function commitStatementImport(input: {
  accountId: string;
  sourceName: string;
  entries: ImportedEntry[];
}) {
  const userId = await getDefaultUserId();
  if (!input.entries.length) throw new Error("Não há lançamentos para importar.");

  const account = await db.account.findFirst({
    where: { id: input.accountId, userId, active: true },
    select: { id: true, type: true, creditCardClosingDay: true },
  });
  if (!account) throw new Error("Escolha uma conta ou cartão ativo.");

  const validCategories = new Set(
    (await db.category.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    })).map((category) => category.id),
  );

  let imported = 0;
  let duplicates = 0;
  let ignored = 0;

  for (const [index, entry] of input.entries.entries()) {
    if (entry.ignored) {
      ignored++;
      continue;
    }
    if (!entry.description.trim() || !Number.isFinite(entry.signedAmount) || entry.signedAmount === 0) {
      ignored++;
      continue;
    }
    if (entry.importKind !== "TRANSFER" && entry.categoryId && !validCategories.has(entry.categoryId)) {
      throw new Error("Uma das categorias escolhidas não pertence ao seu cadastro.");
    }

    const date = new Date(entry.date + "T12:00:00");
    if (Number.isNaN(date.getTime())) {
      throw new Error(`A linha ${index + 1} tem uma data inválida.`);
    }

    const stableKey = `${account.id}|${entry.externalId || ""}|${entry.date}|${entry.description.trim().toLowerCase()}|${entry.signedAmount.toFixed(2)}`;
    const importHash = createHash("sha256").update(stableKey).digest("hex");
    const externalId = entry.externalId?.trim() || null;

    const duplicate = await db.transaction.findFirst({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { accountId: account.id, importHash },
          { destinationAccountId: account.id, importHash },
          ...(externalId ? [{ accountId: account.id, externalId }, { destinationAccountId: account.id, externalId }] : []),
        ],
      },
      select: { id: true },
    });
    if (duplicate) {
      duplicates++;
      continue;
    }

    const amount = new Decimal(Math.abs(entry.signedAmount));
    const isCredit = entry.signedAmount > 0;
    const isTransfer = entry.importKind === "TRANSFER";
    if (isTransfer) {
      if (!isCredit) throw new Error(`A linha ${index + 1} marcada como transferência precisa entrar na conta deste extrato.`);
      if (!entry.sourceAccountId || entry.sourceAccountId === account.id) {
        throw new Error(`Escolha a conta/aplicação de origem para “${entry.description.trim()}”.`);
      }
    }
    const isCard = account.type === "CREDIT_CARD";
    const transactionType = isCard && isCredit ? "CARD_PAYMENT" : isCredit ? "INCOME" : "EXPENSE";
    const allocationType = transactionType === "CARD_PAYMENT" ? "CARD_PAYMENT" : isCredit ? "INCOME" : "EXPENSE";

    try {
      await db.$transaction(async (tx) => {
        if (isTransfer) {
          const source = await tx.account.findFirst({
            where: { id: entry.sourceAccountId!, userId, active: true, type: { not: "CREDIT_CARD" } },
            select: { id: true },
          });
          if (!source) throw new Error("A conta/aplicação escolhida para o resgate não está disponível.");

          await tx.transaction.create({
            data: {
              userId,
              accountId: source.id,
              destinationAccountId: account.id,
              date,
              description: entry.description.trim(),
              amount,
              direction: "DEBIT",
              transactionType: "TRANSFER",
              source: "IMPORT",
              externalId,
              importHash,
              notes: `Importado de ${input.sourceName} · Resgate da aplicação`,
              allocations: { create: [{ allocationType: "TRANSFER", amount }] },
            },
          });
          await tx.account.update({ where: { id: source.id }, data: { calculatedBalance: { decrement: amount } } });
          await tx.account.update({ where: { id: account.id }, data: { calculatedBalance: { increment: amount } } });
          return;
        }

        await tx.transaction.create({
          data: {
            userId,
            accountId: account.id,
            date,
            description: entry.description.trim(),
            amount,
            direction: isCredit ? "CREDIT" : "DEBIT",
            transactionType,
            categoryId: transactionType === "CARD_PAYMENT" ? null : entry.categoryId || null,
            source: "IMPORT",
            externalId,
            importHash,
            cardInvoiceKey: isCard ? invoiceKeyForDate(date, account.creditCardClosingDay) : null,
            notes: `Importado de ${input.sourceName}`,
            allocations: {
              create: [{
                allocationType,
                amount,
                categoryId: transactionType === "CARD_PAYMENT" ? null : entry.categoryId || null,
              }],
            },
          },
        });
        await tx.account.update({
          where: { id: account.id },
          data: { calculatedBalance: isCredit ? { increment: amount } : { decrement: amount } },
        });
      });
      imported++;
    } catch (error: any) {
      if (error?.code === "P2002") {
        duplicates++;
        continue;
      }
      throw error;
    }
  }

  ["/", "/transacoes", "/contas", "/cartoes", "/resultado-mes", "/relatorios", "/meu-patrimonio", "/importar"].forEach((path) => revalidatePath(path));
  return { imported, duplicates, ignored };
}
