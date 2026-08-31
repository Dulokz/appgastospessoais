import { PrismaClient, TransactionNature, ClassificationStatus, Prisma, Transaction } from '@prisma/client';

const prisma = new PrismaClient();

export interface CardPurchaseInput {
  userId: string;
  creditCardId: string;
  date: Date;
  description: string;
  totalAmount: number;
  categoryId?: string;
  subcategoryId?: string;
  installments?: number; // 1 para à vista, > 1 para parcelado
}

export interface ProcessInvoicePaymentInput {
  userId: string;
  creditCardId: string;
  bankAccountId: string;
  paymentDate: Date;
  amount: number;
  competence: string; // Ex: "2025-01"
  bankTransactionId?: string; // Se já existir transação no extrato bancário
}

export interface InvoiceDetailResult {
  invoiceId: string;
  creditCardId: string;
  competence: string;
  closingDate: Date;
  dueDate: Date;
  purchasesTotal: number;
  refundsTotal: number;
  interestTotal: number;
  paymentsTotal: number;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  status: 'OPEN' | 'CLOSED' | 'PAID' | 'PARTIALLY_PAID';
  transactions: Array<{
    id: string;
    date: Date;
    competenceDate?: Date | null;
    description: string;
    amount: number;
    nature: TransactionNature;
    installmentNumber?: number | null;
    totalInstallments?: number | null;
  }>;
}

export class CreditCardEngine {
  /**
   * Obtém a competência (AAAA-MM) correspondente a uma data e dia de fechamento
   * Compras após o dia de fechamento pertencem rigorosamente à fatura seguinte.
   */
  static getInvoiceCompetence(date: Date, closingDay: number): string {
    const d = new Date(date);
    const day = d.getUTCDate();
    let month = d.getUTCMonth();
    let year = d.getUTCFullYear();

    if (day > closingDay) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }

    const monthStr = String(month + 1).padStart(2, '0');
    return `${year}-${monthStr}`;
  }

  /**
   * Obtém ou cria o cartão de crédito e a dívida de passivo associada
   */
  static async getOrCreateCreditCard(params: {
    userId: string;
    name: string;
    closingDay: number;
    dueDay: number;
    limit?: number;
  }) {
    const { userId, name, closingDay, dueDay, limit } = params;

    let account = await prisma.account.findFirst({
      where: { userId, name, type: 'CREDIT_CARD' },
    });

    if (!account) {
      account = await prisma.account.create({
        data: {
          userId,
          name,
          type: 'CREDIT_CARD',
        },
      });
    }

    let liability = await prisma.liability.findFirst({
      where: { userId, name: `Passivo Cartão ${name}`, type: 'CREDIT_CARD' },
    });

    if (!liability) {
      liability = await prisma.liability.create({
        data: {
          userId,
          name: `Passivo Cartão ${name}`,
          type: 'CREDIT_CARD',
          originalValue: new Prisma.Decimal(limit || 0),
          currentBalance: new Prisma.Decimal(0),
          isInitialPosition: false,
        },
      });
    }

    let card = await prisma.creditCard.findFirst({
      where: { userId, accountId: account.id },
    });

    if (!card) {
      card = await prisma.creditCard.create({
        data: {
          userId,
          accountId: account.id,
          liabilityId: liability.id,
          name,
          closingDay,
          dueDay,
          limit: limit ? new Prisma.Decimal(limit) : null,
        },
      });
    }

    return { card, account, liability };
  }

  /**
   * Registra uma compra (à vista ou parcelada) gerando os lançamentos por competência
   */
  static async registerPurchase(params: CardPurchaseInput) {
    const {
      userId,
      creditCardId,
      date,
      description,
      totalAmount,
      categoryId,
      subcategoryId,
      installments = 1,
    } = params;

    const card = await prisma.creditCard.findFirst({
      where: { id: creditCardId, userId },
    });
    if (!card) throw new Error(`Cartão de crédito de ID ${creditCardId} não encontrado.`);

    const numInstallments = Math.max(1, installments);
    const installmentAmount = totalAmount / numInstallments;

    let parentTxId: string | null = null;
    const createdTransactions: Transaction[] = [];

    let currentCompetenceDate = new Date(date);

    for (let i = 1; i <= numInstallments; i++) {
      const tx: Transaction = await prisma.transaction.create({
        data: {
          userId,
          accountId: card.accountId,
          creditCardId: card.id,
          date, // Data real da compra preservada
          competenceDate: currentCompetenceDate,
          amount: new Prisma.Decimal(-Math.abs(installmentAmount)),
          direction: 'DEBIT',
          description: numInstallments > 1 ? `${description} (${i}/${numInstallments})` : description,
          originalDescription: description,
          transactionType: 'EXPENSE',
          nature: TransactionNature.CREDIT_CARD_PURCHASE,
          categoryId: categoryId || null,
          subcategoryId: subcategoryId || null,
          installmentNumber: numInstallments > 1 ? i : null,
          totalInstallments: numInstallments > 1 ? numInstallments : null,
          linkedTransactionId: parentTxId,
          classificationStatus: ClassificationStatus.CONFIRMED,
        },
      });

      if (i === 1 && numInstallments > 1) {
        parentTxId = tx.id;
      }

      createdTransactions.push(tx);

      // Avançar 1 mês para a próxima parcela
      currentCompetenceDate = new Date(
        Date.UTC(
          currentCompetenceDate.getUTCFullYear(),
          currentCompetenceDate.getUTCMonth() + 1,
          currentCompetenceDate.getUTCDate()
        )
      );
    }

    if (card.liabilityId) {
      await prisma.liability.update({
        where: { id: card.liabilityId },
        data: {
          currentBalance: { increment: new Prisma.Decimal(totalAmount) },
        },
      });
    }

    return {
      parentTransactionId: parentTxId || createdTransactions[0].id,
      installmentCount: createdTransactions.length,
      transactions: createdTransactions,
    };
  }

  /**
   * Calcula e atualiza a fatura de um cartão em uma competência
   */
  static async calculateInvoice(
    userId: string,
    creditCardId: string,
    competence: string
  ): Promise<InvoiceDetailResult> {
    const card = await prisma.creditCard.findFirst({
      where: { id: creditCardId, userId },
    });
    if (!card) throw new Error('Cartão de crédito não encontrado.');

    const [yearStr, monthStr] = competence.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;

    const closingDate = new Date(Date.UTC(year, month, card.closingDay));
    const dueDate = new Date(Date.UTC(year, month, card.dueDay));

    const txs = await prisma.transaction.findMany({
      where: {
        userId,
        creditCardId,
        deletedAt: null,
      },
    });

    const invoiceTxs = txs.filter((t) => {
      const compDate = t.competenceDate || t.date;
      return this.getInvoiceCompetence(compDate, card.closingDay) === competence;
    });

    let purchasesTotal = 0;
    let refundsTotal = 0;
    let interestTotal = 0;

    for (const t of invoiceTxs) {
      const amt = Math.abs(Number(t.amount));
      if (t.nature === TransactionNature.CREDIT_CARD_PURCHASE) {
        purchasesTotal += amt;
      } else if (t.nature === TransactionNature.REFUND) {
        refundsTotal += amt;
      } else if (t.nature === TransactionNature.DEBT_INTEREST) {
        interestTotal += amt;
      }
    }

    const totalAmount = Math.max(0, purchasesTotal + interestTotal - refundsTotal);

    let invoice = await prisma.creditCardInvoice.findFirst({
      where: { creditCardId, competence },
    });

    if (!invoice) {
      invoice = await prisma.creditCardInvoice.create({
        data: {
          creditCardId,
          competence,
          closingDate,
          dueDate,
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(0),
          status: 'OPEN',
        },
      });
    } else {
      invoice = await prisma.creditCardInvoice.update({
        where: { id: invoice.id },
        data: {
          totalAmount: new Prisma.Decimal(totalAmount),
          closingDate,
          dueDate,
        },
      });
    }

    const paidAmount = Number(invoice.paidAmount);
    const remainingBalance = Math.max(0, totalAmount - paidAmount);

    let status: 'OPEN' | 'CLOSED' | 'PAID' | 'PARTIALLY_PAID' = 'OPEN';
    if (paidAmount >= totalAmount && totalAmount > 0) {
      status = 'PAID';
    } else if (paidAmount > 0 && paidAmount < totalAmount) {
      status = 'PARTIALLY_PAID';
    } else if (new Date() > closingDate) {
      status = 'CLOSED';
    }

    if (invoice.status !== status) {
      invoice = await prisma.creditCardInvoice.update({
        where: { id: invoice.id },
        data: { status },
      });
    }

    return {
      invoiceId: invoice.id,
      creditCardId,
      competence,
      closingDate,
      dueDate,
      purchasesTotal,
      refundsTotal,
      interestTotal,
      paymentsTotal: paidAmount,
      totalAmount,
      paidAmount,
      remainingBalance,
      status,
      transactions: invoiceTxs.map((t) => ({
        id: t.id,
        date: t.date,
        competenceDate: t.competenceDate,
        description: t.description,
        amount: Number(t.amount),
        nature: t.nature,
        installmentNumber: t.installmentNumber,
        totalInstallments: t.totalInstallments,
      })),
    };
  }

  /**
   * Processa o pagamento da fatura com transação ATÔMICA, IDEMPOTÊNCIA RÍGIDA e registro de crédito excedente
   */
  static async processInvoicePayment(params: ProcessInvoicePaymentInput) {
    const {
      userId,
      creditCardId,
      bankAccountId,
      paymentDate,
      amount,
      competence,
      bankTransactionId,
    } = params;

    const card = await prisma.creditCard.findFirst({
      where: { id: creditCardId, userId },
      include: { liability: true },
    });
    if (!card) throw new Error('Cartão de crédito não encontrado.');

    const paymentAmount = Math.abs(amount);

    // 1. Checar se a transação bancária já foi previamente processada
    if (bankTransactionId) {
      const existingBankTx = await prisma.transaction.findUnique({
        where: { id: bankTransactionId },
      });

      if (
        existingBankTx &&
        existingBankTx.nature === TransactionNature.CREDIT_CARD_PAYMENT &&
        existingBankTx.classificationStatus === ClassificationStatus.CONFIRMED &&
        existingBankTx.linkedTransactionId
      ) {
        const currentInvoice = await this.calculateInvoice(userId, creditCardId, competence);
        return {
          paymentTransactionId: existingBankTx.id,
          invoiceId: currentInvoice.invoiceId,
          paidAmount: currentInvoice.paidAmount,
          remainingBalance: currentInvoice.remainingBalance,
          excessCreditAmount: 0,
          status: currentInvoice.status,
          alreadyProcessed: true,
        };
      }
    }

    // 2. Executar em transação ATÔMICA
    return await prisma.$transaction(async (txDb) => {
      const [yearStr, monthStr] = competence.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      const closingDate = new Date(Date.UTC(year, month, card.closingDay));
      const dueDate = new Date(Date.UTC(year, month, card.dueDay));

      let invoice = await txDb.creditCardInvoice.findFirst({
        where: { creditCardId, competence },
      });

      if (!invoice) {
        invoice = await txDb.creditCardInvoice.create({
          data: {
            creditCardId,
            competence,
            closingDate,
            dueDate,
            totalAmount: new Prisma.Decimal(0),
            paidAmount: new Prisma.Decimal(0),
            status: 'OPEN',
          },
        });
      }

      const totalInvoiceAmount = Number(invoice.totalAmount);
      const currentPaid = Number(invoice.paidAmount);

      const openBalance = Math.max(0, totalInvoiceAmount - currentPaid);
      const effectiveAppliedPayment = Math.min(paymentAmount, openBalance);
      const excessCreditAmount = Math.max(0, paymentAmount - openBalance); // Valor excedente registrado como crédito

      const newPaidAmount = currentPaid + effectiveAppliedPayment;

      let newStatus = 'OPEN';
      if (newPaidAmount >= totalInvoiceAmount && totalInvoiceAmount > 0) {
        newStatus = 'PAID';
      } else if (newPaidAmount > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      await txDb.creditCardInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: new Prisma.Decimal(newPaidAmount),
          status: newStatus,
        },
      });

      const noteText = excessCreditAmount > 0
        ? `[CRÉDITO_EXCEDENTE_CARTÃO: R$ ${excessCreditAmount.toFixed(2)}]`
        : undefined;

      let bankTx: Transaction;
      if (bankTransactionId) {
        bankTx = await txDb.transaction.update({
          where: { id: bankTransactionId },
          data: {
            nature: TransactionNature.CREDIT_CARD_PAYMENT,
            classificationStatus: ClassificationStatus.CONFIRMED,
            creditCardId: card.id,
            liabilityId: card.liabilityId,
            linkedTransactionId: invoice.id,
            notes: noteText,
          },
        });
      } else {
        bankTx = await txDb.transaction.create({
          data: {
            userId,
            accountId: bankAccountId,
            creditCardId: card.id,
            liabilityId: card.liabilityId,
            linkedTransactionId: invoice.id,
            date: paymentDate,
            amount: new Prisma.Decimal(-paymentAmount),
            direction: 'DEBIT',
            description: `PAGAMENTO FATURA CARTÃO ${card.name} (${competence})`,
            originalDescription: `PAGAMENTO FATURA CARTÃO ${card.name}`,
            transactionType: 'EXPENSE',
            nature: TransactionNature.CREDIT_CARD_PAYMENT,
            classificationStatus: ClassificationStatus.CONFIRMED,
            notes: noteText,
          },
        });
      }

      // Abater saldo devedor do passivo (Liability) pela quantia aplicada
      if (card.liabilityId && effectiveAppliedPayment > 0) {
        await txDb.liability.update({
          where: { id: card.liabilityId },
          data: {
            currentBalance: { decrement: new Prisma.Decimal(effectiveAppliedPayment) },
          },
        });
      }

      return {
        paymentTransactionId: bankTx.id,
        invoiceId: invoice.id,
        paidAmount: newPaidAmount,
        remainingBalance: Math.max(0, totalInvoiceAmount - newPaidAmount),
        excessCreditAmount,
        status: newStatus,
        alreadyProcessed: false,
      };
    });
  }
}
