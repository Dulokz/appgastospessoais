"use server";

import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { revalidatePath } from "next/cache";

// ----------------------------------------------------
// CONTAS
// ----------------------------------------------------
export async function getAccounts() {
  const userId = await getDefaultUserId();
  return db.account.findMany({
    where: { userId, active: true },
    include: { financialInstitution: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createAccount(data: {
  name: string;
  type: "CHECKING" | "SAVINGS" | "CASH" | "BROKERAGE" | "INVESTMENT" | "OTHER";
  institutionName?: string;
  initialBalance: number;
}) {
  const userId = await getDefaultUserId();

  return db.$transaction(async (tx) => {
    let institutionId: string | undefined;
    if (data.institutionName) {
      let inst = await tx.financialInstitution.findFirst({
        where: { userId, name: data.institutionName },
      });
      if (!inst) {
        inst = await tx.financialInstitution.create({
          data: { userId, name: data.institutionName },
        });
      }
      institutionId = inst.id;
    }

    const newAccount = await tx.account.create({
      data: {
        userId,
        financialInstitutionId: institutionId,
        name: data.name,
        type: data.type,
        initialBalance: data.initialBalance,
        calculatedBalance: data.initialBalance,
        confirmedBalance: data.initialBalance,
      },
    });

    revalidatePath("/");
    revalidatePath("/contas");
    revalidatePath("/investimentos");
    return newAccount;
  });
}

export async function archiveAccount(id: string) {
  await db.account.update({
    where: { id },
    data: { active: false },
  });
  revalidatePath("/");
  revalidatePath("/contas");
  revalidatePath("/investimentos");
}

// ----------------------------------------------------
// ATIVOS (BENS PATRIMONIAIS NÃO FINANCEIROS)
// ----------------------------------------------------
export async function getAssets() {
  const userId = await getDefaultUserId();
  return db.asset.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createAsset(data: {
  name: string;
  category: "REAL_ESTATE" | "VEHICLE" | "EQUIPMENT" | "CORPORATE_SHARE" | "OTHER";
  acquisitionValue: number;
  currentValue: number;
  considerInNetWorth?: boolean;
  notes?: string;
}) {
  const userId = await getDefaultUserId();
  return db.$transaction(async (tx) => {
    const asset = await tx.asset.create({
      data: {
        userId,
        name: data.name,
        category: data.category,
        acquisitionValue: data.acquisitionValue,
        currentValue: data.currentValue,
        considerInNetWorth: data.considerInNetWorth ?? true,
        notes: data.notes,
        valuations: {
          create: [{ value: data.currentValue, notes: "Avaliação inicial" }],
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/patrimonio");
    return asset;
  });
}

// ----------------------------------------------------
// DÍVIDAS
// ----------------------------------------------------
export async function getLiabilities() {
  const userId = await getDefaultUserId();
  return db.liability.findMany({
    where: { userId, active: true },
    include: { associatedAsset: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createLiability(data: {
  name: string;
  type: "MORTGAGE" | "VEHICLE_LOAN" | "PERSONAL_LOAN" | "INSTALLMENT" | "CREDIT_CARD" | "OTHER";
  institution?: string;
  originalValue: number;
  currentBalance: number;
  associatedAssetId?: string;
}) {
  const userId = await getDefaultUserId();
  const liability = await db.liability.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      institution: data.institution,
      originalValue: data.originalValue,
      currentBalance: data.currentBalance,
      associatedAssetId: data.associatedAssetId || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/dividas");
  return liability;
}

// ----------------------------------------------------
// CATEGORIAS
// ----------------------------------------------------
export async function getCategories() {
  const userId = await getDefaultUserId();
  return db.category.findMany({
    where: { userId, parentId: null },
    include: { subcategories: true },
    orderBy: { name: "asc" },
  });
}

// ----------------------------------------------------
// TRANSAÇÕES & QUICK REGISTER
// ----------------------------------------------------
export async function getTransactions() {
  const userId = await getDefaultUserId();
  return db.transaction.findMany({
    where: { userId },
    include: {
      account: true,
      destinationAccount: true,
      category: true,
      allocations: {
        include: { category: true, asset: true, liability: true },
      },
    },
    orderBy: { date: "desc" },
    take: 50,
  });
}

export async function createQuickTransaction(data: {
  flow: "GASTEI" | "RECEBI" | "TRANSFERI" | "COMPREI_BEM";
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

  await db.$transaction(async (tx) => {
    if (data.flow === "GASTEI") {
      await tx.transaction.create({
        data: {
          userId,
          accountId: data.sourceAccountId,
          amount: data.amount,
          direction: "DEBIT",
          transactionType: "EXPENSE",
          categoryId: data.categoryId,
          description: data.description,
          allocations: {
            create: [
              {
                allocationType: "EXPENSE",
                amount: data.amount,
                categoryId: data.categoryId,
              },
            ],
          },
        },
      });

      await tx.account.update({
        where: { id: data.sourceAccountId },
        data: { calculatedBalance: { decrement: data.amount } },
      });
    } else if (data.flow === "RECEBI") {
      await tx.transaction.create({
        data: {
          userId,
          accountId: data.sourceAccountId,
          amount: data.amount,
          direction: "CREDIT",
          transactionType: "INCOME",
          categoryId: data.categoryId,
          description: data.description,
          allocations: {
            create: [
              {
                allocationType: "INCOME",
                amount: data.amount,
                categoryId: data.categoryId,
              },
            ],
          },
        },
      });

      await tx.account.update({
        where: { id: data.sourceAccountId },
        data: { calculatedBalance: { increment: data.amount } },
      });
    } else if (data.flow === "TRANSFERI") {
      if (!data.destAccountId || data.sourceAccountId === data.destAccountId) {
        throw new Error("Conta de origem e destino devem ser diferentes.");
      }

      await tx.transaction.create({
        data: {
          userId,
          accountId: data.sourceAccountId,
          destinationAccountId: data.destAccountId,
          amount: data.amount,
          direction: "DEBIT",
          transactionType: "TRANSFER",
          description: data.description,
          allocations: {
            create: [
              {
                allocationType: "TRANSFER",
                amount: data.amount,
              },
            ],
          },
        },
      });

      await tx.account.update({
        where: { id: data.sourceAccountId },
        data: { calculatedBalance: { decrement: data.amount } },
      });

      await tx.account.update({
        where: { id: data.destAccountId },
        data: { calculatedBalance: { increment: data.amount } },
      });
    } else if (data.flow === "COMPREI_BEM") {
      if (data.treatAs === "ASSET") {
        const newAsset = await tx.asset.create({
          data: {
            userId,
            name: data.assetName || data.description,
            category: (data.assetCategory as any) || "EQUIPMENT",
            acquisitionValue: data.amount,
            currentValue: data.amount,
            considerInNetWorth: true,
          },
        });

        await tx.transaction.create({
          data: {
            userId,
            accountId: data.sourceAccountId,
            amount: data.amount,
            direction: "DEBIT",
            transactionType: "ASSET_PURCHASE",
            description: `Compra de Bem: ${newAsset.name}`,
            allocations: {
              create: [
                {
                  allocationType: "ASSET_INCREASE",
                  amount: data.amount,
                  assetId: newAsset.id,
                },
              ],
            },
          },
        });

        await tx.account.update({
          where: { id: data.sourceAccountId },
          data: { calculatedBalance: { decrement: data.amount } },
        });
      } else {
        await tx.transaction.create({
          data: {
            userId,
            accountId: data.sourceAccountId,
            amount: data.amount,
            direction: "DEBIT",
            transactionType: "EXPENSE",
            categoryId: data.categoryId,
            description: data.description || data.assetName || "Compra de bem (gasto)",
            allocations: {
              create: [
                {
                  allocationType: "EXPENSE",
                  amount: data.amount,
                  categoryId: data.categoryId,
                },
              ],
            },
          },
        });

        await tx.account.update({
          where: { id: data.sourceAccountId },
          data: { calculatedBalance: { decrement: data.amount } },
        });
      }
    }
  });

  revalidatePath("/");
  revalidatePath("/contas");
  revalidatePath("/patrimonio");
  revalidatePath("/transacoes");
  revalidatePath("/relatorios");
  revalidatePath("/meu-patrimonio");
  revalidatePath("/resultado-mes");
  revalidatePath("/investimentos");
}

// ----------------------------------------------------
// FASE 3A: POSIÇÕES DE INVESTIMENTO & INSTRUMENTOS
// ----------------------------------------------------
export async function getInvestmentPositions() {
  const userId = await getDefaultUserId();
  return db.investmentPosition.findMany({
    where: { userId, active: true },
    include: {
      account: {
        include: { financialInstitution: true },
      },
      instrument: true,
      events: { orderBy: { date: "desc" }, take: 10 },
      snapshots: { orderBy: { date: "desc" }, take: 30 },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createInvestmentPosition(data: {
  accountId: string;
  instrumentName: string;
  symbol?: string;
  instrumentType: "STOCK" | "FII" | "BDR" | "ETF" | "TREASURY_BOND" | "INVESTMENT_FUND" | "FIXED_INCOME" | "CRYPTO" | "OTHER";
  quantity?: number;
  averageCost?: number;
  acquisitionValue: number;
  currentValue: number;
}) {
  const userId = await getDefaultUserId();

  return db.$transaction(async (tx) => {
    // 1. Localizar ou criar Instrumento
    let instrument = await tx.instrument.findFirst({
      where: {
        symbol: data.symbol ? data.symbol.toUpperCase() : undefined,
        name: data.instrumentName,
      },
    });

    if (!instrument) {
      instrument = await tx.instrument.create({
        data: {
          name: data.instrumentName,
          symbol: data.symbol ? data.symbol.toUpperCase() : null,
          instrumentType: data.instrumentType,
        },
      });
    }

    // 2. Criar Posição de Investimento
    const position = await tx.investmentPosition.create({
      data: {
        userId,
        accountId: data.accountId,
        instrumentId: instrument.id,
        quantity: data.quantity || 1,
        averageCost: data.averageCost || data.acquisitionValue,
        acquisitionValue: data.acquisitionValue,
        currentValue: data.currentValue,
        currentPrice: data.quantity ? data.currentValue / data.quantity : data.currentValue,
      },
    });

    // 3. Criar Snapshot Inicial
    await tx.investmentPositionSnapshot.create({
      data: {
        investmentPositionId: position.id,
        quantity: data.quantity || 1,
        unitPrice: data.quantity ? data.currentValue / data.quantity : data.currentValue,
        currentValue: data.currentValue,
        source: "MANUAL",
      },
    });

    // 4. Criar Evento Inicial de Aporte se houver aquisição inicial
    await tx.investmentEvent.create({
      data: {
        userId,
        investmentPositionId: position.id,
        type: "CONTRIBUTION",
        amount: data.acquisitionValue,
        quantity: data.quantity || 1,
        notes: "Aporte de aquisição inicial da posição",
      },
    });

    revalidatePath("/");
    revalidatePath("/investimentos");
    revalidatePath("/meu-patrimonio");
    return position;
  });
}

export async function updatePositionValue(data: {
  positionId: string;
  newCurrentValue: number;
  notes?: string;
}) {
  const userId = await getDefaultUserId();

  return db.$transaction(async (tx) => {
    const position = await tx.investmentPosition.findUnique({
      where: { id: data.positionId },
    });

    if (!position) throw new Error("Posição de investimento não encontrada.");

    const prevValue = position.currentValue.toNumber();
    const diff = data.newCurrentValue - prevValue;
    const eventType = diff >= 0 ? "APPRECIATION" : "DEPRECIATION";

    // 1. Atualizar Posição
    const updated = await tx.investmentPosition.update({
      where: { id: data.positionId },
      data: {
        currentValue: data.newCurrentValue,
        lastPriceAt: new Date(),
      },
    });

    // 2. Gravar Snapshot
    await tx.investmentPositionSnapshot.create({
      data: {
        investmentPositionId: position.id,
        quantity: position.quantity,
        currentValue: data.newCurrentValue,
        source: "MANUAL",
      },
    });

    // 3. Gravar Evento de Valorização/Desvalorização
    if (Math.abs(diff) > 0.001) {
      await tx.investmentEvent.create({
        data: {
          userId,
          investmentPositionId: position.id,
          type: eventType,
          amount: Math.abs(diff),
          notes: data.notes || "Atualização manual de valorização/desvalorização",
        },
      });
    }

    revalidatePath("/");
    revalidatePath("/investimentos");
    revalidatePath("/relatorios");
    revalidatePath("/meu-patrimonio");
    return updated;
  });
}

export async function recordInvestmentEvent(data: {
  positionId: string;
  eventType: "CONTRIBUTION" | "WITHDRAWAL" | "INCOME_RECEIVED" | "DIVIDEND" | "JCP";
  amount: number;
  accountId?: string; // Conta que recebe crédito financeiro ou de onde sai caixa
  notes?: string;
}) {
  const userId = await getDefaultUserId();

  return db.$transaction(async (tx) => {
    const position = await tx.investmentPosition.findUnique({
      where: { id: data.positionId },
      include: { instrument: true },
    });

    if (!position) throw new Error("Posição de investimento não encontrada.");

    const eventAccount = data.accountId || position.accountId;

    if (data.eventType === "CONTRIBUTION") {
      // Aporte: Aumenta a posição e reduz o caixa da conta
      await tx.investmentPosition.update({
        where: { id: data.positionId },
        data: {
          currentValue: { increment: data.amount },
          acquisitionValue: { increment: data.amount },
        },
      });

      await tx.account.update({
        where: { id: eventAccount },
        data: { calculatedBalance: { decrement: data.amount } },
      });
    } else if (data.eventType === "WITHDRAWAL") {
      // Resgate: Reduz a posição e aumenta o caixa da conta
      await tx.investmentPosition.update({
        where: { id: data.positionId },
        data: {
          currentValue: { decrement: data.amount },
        },
      });

      await tx.account.update({
        where: { id: eventAccount },
        data: { calculatedBalance: { increment: data.amount } },
      });
    } else if (data.eventType === "INCOME_RECEIVED" || data.eventType === "DIVIDEND" || data.eventType === "JCP") {
      // Crédito de Provendos / Rendimentos / Dividendos em dinheiro
      await tx.account.update({
        where: { id: eventAccount },
        data: { calculatedBalance: { increment: data.amount } },
      });

      // Gravar transação de receita financeira para aparecer no Resultado do Mês
      const label = data.eventType === "DIVIDEND" ? "Dividendo" : data.eventType === "JCP" ? "JCP" : "Rendimento";
      await tx.transaction.create({
        data: {
          userId,
          accountId: eventAccount,
          amount: data.amount,
          direction: "CREDIT",
          transactionType: "INCOME",
          description: `${label}: ${position.instrument.name}`,
          allocations: {
            create: [
              {
                allocationType: "INCOME",
                amount: data.amount,
              },
            ],
          },
        },
      });
    }

    // Criar o registro de InvestmentEvent
    const event = await tx.investmentEvent.create({
      data: {
        userId,
        investmentPositionId: position.id,
        accountId: eventAccount,
        type: data.eventType,
        amount: data.amount,
        notes: data.notes,
      },
    });

    revalidatePath("/");
    revalidatePath("/investimentos");
    revalidatePath("/contas");
    revalidatePath("/transacoes");
    revalidatePath("/resultado-mes");
    revalidatePath("/meu-patrimonio");
    return event;
  });
}
