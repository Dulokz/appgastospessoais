"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { Decimal } from "@/lib/decimal";

function refresh() {
  ["/", "/contas", "/cartoes", "/transacoes", "/resultado-mes", "/meu-patrimonio"].forEach(revalidatePath);
}

export async function payCreditCardInvoice(input: {
  cardId: string;
  sourceAccountId: string;
  invoiceKey: string;
  amount: number;
  paymentDate: string;
}) {
  const userId = await getDefaultUserId();
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Informe um valor de pagamento válido.");
  if (input.cardId === input.sourceAccountId) throw new Error("A conta de pagamento deve ser diferente do cartão.");

  await db.$transaction(async (tx) => {
    const [card, source] = await Promise.all([
      tx.account.findFirst({ where: { id: input.cardId, userId, active: true } }),
      tx.account.findFirst({ where: { id: input.sourceAccountId, userId, active: true } }),
    ]);
    if (!card || card.type !== "CREDIT_CARD") throw new Error("Cartão não encontrado.");
    if (!source) throw new Error("Conta de pagamento não encontrada.");
    if (source.type === "CREDIT_CARD") throw new Error("A fatura deve ser paga por uma conta, não por outro cartão.");

    await tx.transaction.create({
      data: {
        userId,
        accountId: source.id,
        destinationAccountId: card.id,
        date: new Date(input.paymentDate + "T12:00:00"),
        amount: new Decimal(input.amount),
        direction: "DEBIT",
        transactionType: "CARD_PAYMENT",
        description: `Pagamento da fatura ${input.invoiceKey} — ${card.name}`,
        cardInvoiceKey: input.invoiceKey,
        allocations: { create: [{ allocationType: "CARD_PAYMENT", amount: new Decimal(input.amount) }] },
      },
    });

    await tx.account.update({ where: { id: source.id }, data: { calculatedBalance: { decrement: input.amount } } });
    await tx.account.update({ where: { id: card.id }, data: { calculatedBalance: { increment: input.amount } } });
  });

  refresh();
  revalidatePath(`/cartoes/${input.cardId}`);
}


export async function updateCreditCardBillingCycle(input: { cardId: string; closingDay: number; dueDay: number }) {
  const userId = await getDefaultUserId();
  if (![input.closingDay, input.dueDay].every((day) => Number.isInteger(day) && day >= 1 && day <= 31)) {
    throw new Error("Informe dias entre 1 e 31.");
  }
  const result = await db.account.updateMany({
    where: { id: input.cardId, userId, active: true, type: "CREDIT_CARD" },
    data: { creditCardClosingDay: input.closingDay, creditCardDueDay: input.dueDay },
  });
  if (!result.count) throw new Error("Cartão não encontrado.");
  refresh();
  revalidatePath(`/cartoes/${input.cardId}`);
}
