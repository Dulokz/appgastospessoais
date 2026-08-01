"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const DEFAULT_USER_EMAIL = "usuario@patrimonio.com";

async function getDefaultUserId(): Promise<string> {
  const user = await db.user.findFirst({
    where: { email: DEFAULT_USER_EMAIL },
  });
  if (user) return user.id;

  const newUser = await db.user.create({
    data: {
      name: "Usuário Principal",
      email: DEFAULT_USER_EMAIL,
    },
  });
  return newUser.id;
}

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

  let institutionId: string | undefined;
  if (data.institutionName) {
    let inst = await db.financialInstitution.findFirst({
      where: { userId, name: data.institutionName },
    });
    if (!inst) {
      inst = await db.financialInstitution.create({
        data: { userId, name: data.institutionName },
      });
    }
    institutionId = inst.id;
  }

  const newAccount = await db.account.create({
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
  return newAccount;
}

export async function archiveAccount(id: string) {
  await db.account.update({
    where: { id },
    data: { active: false },
  });
  revalidatePath("/");
  revalidatePath("/contas");
}

// ----------------------------------------------------
// ATIVOS
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
  category: "REAL_ESTATE" | "VEHICLE" | "EQUIPMENT" | "CORPORATE_SHARE" | "FINANCIAL_TICKER" | "FIXED_INCOME" | "FUNDS" | "OTHER";
  acquisitionValue: number;
  currentValue: number;
  considerInNetWorth?: boolean;
  notes?: string;
}) {
  const userId = await getDefaultUserId();
  const asset = await db.asset.create({
    data: {
      userId,
      name: data.name,
      category: data.category,
      acquisitionValue: data.acquisitionValue,
      currentValue: data.currentValue,
      considerInNetWorth: data.considerInNetWorth ?? true,
      notes: data.notes,
      valuations: {
        create: [
          { value: data.currentValue, notes: "Avaliação inicial" },
        ],
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/patrimonio");
  return asset;
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

  if (data.flow === "GASTEI") {
    // 1. Criar Transação de Despesa
    const tx = await db.transaction.create({
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

    // 2. Atualizar Saldo Calculado da Conta
    const account = await db.account.findUnique({ where: { id: data.sourceAccountId } });
    if (account) {
      await db.account.update({
        where: { id: data.sourceAccountId },
        data: {
          calculatedBalance: account.calculatedBalance.sub(data.amount),
        },
      });
    }
  } else if (data.flow === "RECEBI") {
    // 1. Criar Transação de Receita
    const tx = await db.transaction.create({
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

    // 2. Atualizar Saldo Calculado da Conta
    const account = await db.account.findUnique({ where: { id: data.sourceAccountId } });
    if (account) {
      await db.account.update({
        where: { id: data.sourceAccountId },
        data: {
          calculatedBalance: account.calculatedBalance.add(data.amount),
        },
      });
    }
  } else if (data.flow === "TRANSFERI") {
    if (!data.destAccountId || data.sourceAccountId === data.destAccountId) {
      throw new Error("Conta de origem e destino devem ser diferentes.");
    }

    // 1. Criar Transação de Transferência
    const tx = await db.transaction.create({
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

    // 2. Atualizar ambas as contas
    const srcAccount = await db.account.findUnique({ where: { id: data.sourceAccountId } });
    const dstAccount = await db.account.findUnique({ where: { id: data.destAccountId } });

    if (srcAccount) {
      await db.account.update({
        where: { id: data.sourceAccountId },
        data: { calculatedBalance: srcAccount.calculatedBalance.sub(data.amount) },
      });
    }
    if (dstAccount) {
      await db.account.update({
        where: { id: data.destAccountId },
        data: { calculatedBalance: dstAccount.calculatedBalance.add(data.amount) },
      });
    }
  } else if (data.flow === "COMPREI_BEM") {
    if (data.treatAs === "ASSET") {
      // Criar Novo Asset e Deduzir da Conta sem afetar PL inicial
      const newAsset = await db.asset.create({
        data: {
          userId,
          name: data.assetName || data.description,
          category: (data.assetCategory as any) || "EQUIPMENT",
          acquisitionValue: data.amount,
          currentValue: data.amount,
          considerInNetWorth: true,
        },
      });

      await db.transaction.create({
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

      const account = await db.account.findUnique({ where: { id: data.sourceAccountId } });
      if (account) {
        await db.account.update({
          where: { id: data.sourceAccountId },
          data: { calculatedBalance: account.calculatedBalance.sub(data.amount) },
        });
      }
    } else {
      // Tratar como Despesa
      await createQuickTransaction({
        flow: "GASTEI",
        amount: data.amount,
        sourceAccountId: data.sourceAccountId,
        description: data.description || data.assetName || "Compra de bem (gasto)",
        categoryId: data.categoryId,
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/contas");
  revalidatePath("/patrimonio");
  revalidatePath("/transacoes");
  revalidatePath("/relatorios");
  revalidatePath("/meu-patrimonio");
  revalidatePath("/resultado-mes");
}

// ----------------------------------------------------
// POSIÇÕES DE INVESTIMENTO
// ----------------------------------------------------
export async function getInvestmentPositions() {
  const userId = await getDefaultUserId();
  return db.investmentPosition.findMany({
    where: { userId, active: true },
    include: { account: true, instrument: true },
    orderBy: { createdAt: "asc" },
  });
}
