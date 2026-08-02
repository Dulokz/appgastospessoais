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
  const userId = await getDefaultUserId();
  await db.account.updateMany({
    where: { id, userId },
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
  const categories = await db.category.findMany({
    where: { userId, parentId: null, deletedAt: null },
    include: { subcategories: { where: { deletedAt: null }, orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  if (categories.length === 0) {
    await seedDefaultCategories();
    return db.category.findMany({
      where: { userId, parentId: null, deletedAt: null },
      include: { subcategories: { where: { deletedAt: null }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
  }

  return categories;
}

export async function createCategory(data: {
  name: string;
  parentId?: string;
  icon?: string;
  color?: string;
}) {
  const userId = await getDefaultUserId();

  const category = await db.category.create({
    data: {
      userId,
      name: data.name.trim(),
      parentId: data.parentId || null,
      icon: data.icon || null,
      color: data.color || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/categorias");
  revalidatePath("/transacoes");
  return category;
}

export async function updateCategory(data: {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}) {
  const category = await db.category.update({
    where: { id: data.id },
    data: {
      name: data.name.trim(),
      icon: data.icon,
      color: data.color,
    },
  });

  revalidatePath("/");
  revalidatePath("/categorias");
  revalidatePath("/transacoes");
  return category;
}

export async function deleteCategory(id: string) {
  await db.category.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/categorias");
  revalidatePath("/transacoes");
}

export async function seedDefaultCategories() {
  const userId = await getDefaultUserId();

  const categoriesData = [
    {
      name: "Bens Imóveis",
      icon: "Building",
      subs: [
        "Apartamento",
        "Casa",
        "Terreno / Lote",
        "Imóvel Rural / Sítio / Fazenda",
        "Sala Comercial",
        "Galpão industrial",
        "Vaga de Garagem / Box",
      ],
    },
    {
      name: "Bens Móveis",
      icon: "Car",
      subs: [
        "Veículo (Carro)",
        "Motocicleta",
        "Embarcação / Aeronave",
        "Máquinas e Equipamentos",
        "Semoventes / Gado / Plantio",
        "Móveis e Eletrodomésticos",
        "Jóias, Relógios e Obras de Arte",
      ],
    },
    {
      name: "Intangíveis & Propriedades",
      icon: "FileCheck",
      subs: [
        "Marcas e Patentes",
        "Software / Direitos Autorais",
        "Licenças e Concessões",
        "Domínios e Ativos Digitais",
      ],
    },
    {
      name: "Participação Societária",
      icon: "Briefcase",
      subs: [
        "Participação em Empresa LTDA",
        "Ações de Cia Fechada",
        "Holding Patrimonial",
        "Sociedade em Conta de Participação (SCP)",
      ],
    },
    {
      name: "Cota Capital & Cooperativas",
      icon: "Landmark",
      subs: [
        "Cota Capital em Cooperativa de Crédito",
        "Cota em Cooperativa Agropecuária",
        "Capital Social Integralizado",
      ],
    },
    {
      name: "Investimentos & Custódia",
      icon: "TrendingUp",
      subs: [
        "Renda Fixa (CDB, LCI, LCA)",
        "Tesouro Direto",
        "Ações B3",
        "FIIs (Fundos Imobiliários)",
        "BDRs e Mercado Internacional",
        "Fundos de Investimento",
        "Criptoativos e Web3",
      ],
    },
    {
      name: "Moradia",
      icon: "Home",
      subs: ["Aluguel", "Condomínio", "Energia elétrica", "Água", "Internet", "Manutenção", "Móveis"],
    },
    {
      name: "Alimentação",
      icon: "Utensils",
      subs: ["Supermercado", "Restaurante", "Delivery", "Padaria", "Outros"],
    },
    {
      name: "Transporte",
      icon: "Car",
      subs: ["Combustível", "Manutenção", "Seguro", "IPVA", "Estacionamento", "Pedágio", "Transporte por aplicativo"],
    },
    {
      name: "Saúde",
      icon: "HeartPulse",
      subs: ["Médico", "Dentista", "Farmácia", "Exames", "Plano de saúde"],
    },
    {
      name: "Educação",
      icon: "GraduationCap",
      subs: ["Cursos", "Faculdade", "Livros"],
    },
    {
      name: "Lazer",
      icon: "Smile",
      subs: ["Restaurantes/lazer", "Jogos", "Cinema", "Eventos", "Hobbies"],
    },
    {
      name: "Viagens",
      icon: "Plane",
      subs: ["Hospedagem", "Passagens", "Alimentação em viagem", "Passeios"],
    },
    {
      name: "Compras",
      icon: "ShoppingBag",
      subs: ["Eletrônicos", "Vestuário", "Casa", "Presentes", "Outros"],
    },
    {
      name: "Assinaturas",
      icon: "Tv",
      subs: ["Streaming", "Software", "Serviços digitais"],
    },
    {
      name: "Impostos e taxas",
      icon: "FileText",
      subs: ["IPTU", "IRPF", "Taxas diversas"],
    },
    {
      name: "Juros e tarifas",
      icon: "Percent",
      subs: ["Juros de cartão/financiamento", "Tarifa bancária"],
    },
    {
      name: "Família",
      icon: "Users",
      subs: ["Mesada", "Cuidados familiares"],
    },
    {
      name: "Pets",
      icon: "Dog",
      subs: ["Veterinária", "Ração", "Higiene pet"],
    },
    {
      name: "Doações",
      icon: "Gift",
      subs: ["Caridade", "Apoio social"],
    },
    {
      name: "Trabalho",
      icon: "Briefcase",
      subs: ["Ferramentas", "Despesas profissionais"],
    },
    {
      name: "Receitas",
      icon: "TrendingUp",
      subs: [
        "Salário",
        "Honorários",
        "Serviços",
        "Aluguéis",
        "Dividendos",
        "Juros recebidos",
        "Rendimentos",
        "Venda de bens",
        "Reembolsos",
        "Outras receitas",
      ],
    },
  ];

  for (const catData of categoriesData) {
    const parent = await db.category.create({
      data: {
        userId,
        name: catData.name,
        icon: catData.icon,
      },
    });

    for (const subName of catData.subs) {
      await db.category.create({
        data: {
          userId,
          name: subName,
          parentId: parent.id,
        },
      });
    }
  }

  revalidatePath("/categorias");
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
    const sourceAcc = await tx.account.findFirst({
      where: { id: data.sourceAccountId, userId },
    });
    if (!sourceAcc) throw new Error("Conta de origem não pertence ao usuário.");

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

      const destAcc = await tx.account.findFirst({
        where: { id: data.destAccountId, userId },
      });
      if (!destAcc) throw new Error("Conta de destino não pertence ao usuário.");

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
// FASE 3A.1: POSIÇÕES DE INVESTIMENTO & INSTRUMENTOS ROBUSTOS
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
  exchange?: string;
  instrumentType: "STOCK" | "FII" | "BDR" | "ETF" | "TREASURY_BOND" | "INVESTMENT_FUND" | "FIXED_INCOME" | "CRYPTO" | "OTHER";
  quantity?: number;
  averageCost?: number;
  acquisitionValue: number;
  currentValue: number;
  isInitialPosition?: boolean;
}) {
  const userId = await getDefaultUserId();

  return db.$transaction(async (tx) => {
    const targetAccount = await tx.account.findFirst({
      where: { id: data.accountId, userId },
    });
    if (!targetAccount) throw new Error("Conta de custódia não pertence ao usuário.");

    const normSymbol = data.symbol ? data.symbol.trim().toUpperCase() : null;
    const normExchange = data.exchange ? data.exchange.trim().toUpperCase() : "MANUAL";

    let instrument = null;

    if (normSymbol) {
      instrument = await tx.instrument.findFirst({
        where: {
          symbol: normSymbol,
          exchange: normExchange,
        },
      });
    }

    if (!instrument) {
      instrument = await tx.instrument.create({
        data: {
          name: data.instrumentName.trim(),
          symbol: normSymbol,
          exchange: normExchange,
          instrumentType: data.instrumentType,
        },
      });
    }

    const position = await tx.investmentPosition.create({
      data: {
        userId,
        accountId: data.accountId,
        instrumentId: instrument.id,
        quantity: data.quantity || null,
        averageCost: data.averageCost || (data.quantity ? data.acquisitionValue / data.quantity : null),
        acquisitionValue: data.acquisitionValue,
        currentValue: data.currentValue,
        currentPrice: data.quantity ? data.currentValue / data.quantity : null,
      },
    });

    await tx.investmentPositionSnapshot.create({
      data: {
        investmentPositionId: position.id,
        quantity: data.quantity || null,
        unitPrice: data.quantity ? data.currentValue / data.quantity : null,
        currentValue: data.currentValue,
        source: "MANUAL",
      },
    });

    if (data.isInitialPosition) {
      await tx.investmentEvent.create({
        data: {
          userId,
          investmentPositionId: position.id,
          type: "INITIAL_POSITION",
          amount: data.acquisitionValue,
          quantity: data.quantity || null,
          notes: "Reconhecimento de posição patrimonial inicial",
        },
      });
    } else {
      const txRecord = await tx.transaction.create({
        data: {
          userId,
          accountId: data.accountId,
          amount: data.acquisitionValue,
          direction: "DEBIT",
          transactionType: "INVESTMENT_CONTRIBUTION",
          description: `Aporte em investimento: ${instrument.name}`,
          allocations: {
            create: [
              {
                allocationType: "INVESTMENT",
                amount: data.acquisitionValue,
              },
            ],
          },
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: { calculatedBalance: { decrement: data.acquisitionValue } },
      });

      await tx.investmentEvent.create({
        data: {
          userId,
          investmentPositionId: position.id,
          transactionId: txRecord.id,
          type: "CONTRIBUTION",
          amount: data.acquisitionValue,
          quantity: data.quantity || null,
          notes: "Aporte realizado em conta",
        },
      });
    }

    revalidatePath("/");
    revalidatePath("/investimentos");
    revalidatePath("/contas");
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
    const position = await tx.investmentPosition.findFirst({
      where: { id: data.positionId, userId },
    });

    if (!position) throw new Error("Posição de investimento não encontrada ou não pertence ao usuário.");

    const prevValue = position.currentValue.toNumber();
    const diff = data.newCurrentValue - prevValue;
    const eventType = diff >= 0 ? "APPRECIATION" : "DEPRECIATION";

    const updated = await tx.investmentPosition.update({
      where: { id: data.positionId },
      data: {
        currentValue: data.newCurrentValue,
        lastPriceAt: new Date(),
      },
    });

    await tx.investmentPositionSnapshot.create({
      data: {
        investmentPositionId: position.id,
        quantity: position.quantity,
        currentValue: data.newCurrentValue,
        source: "MANUAL",
      },
    });

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
  principalAmount?: number;
  realizedGain?: number;
  realizedLoss?: number;
  accountId?: string;
  notes?: string;
}) {
  const userId = await getDefaultUserId();

  return db.$transaction(async (tx) => {
    const position = await tx.investmentPosition.findFirst({
      where: { id: data.positionId, userId },
      include: { instrument: true },
    });

    if (!position) throw new Error("Posição de investimento não encontrada ou não pertence ao usuário.");

    const eventAccount = data.accountId || position.accountId;

    const acc = await tx.account.findFirst({
      where: { id: eventAccount, userId },
    });
    if (!acc) throw new Error("Conta informada não pertence ao usuário.");

    let createdTxId: string | undefined;

    if (data.eventType === "CONTRIBUTION") {
      await tx.investmentPosition.update({
        where: { id: data.positionId },
        data: {
          currentValue: { increment: data.amount },
          acquisitionValue: { increment: data.amount },
        },
      });

      const txRecord = await tx.transaction.create({
        data: {
          userId,
          accountId: eventAccount,
          amount: data.amount,
          direction: "DEBIT",
          transactionType: "INVESTMENT_CONTRIBUTION",
          description: `Aporte em ${position.instrument.name}`,
          allocations: {
            create: [{ allocationType: "INVESTMENT", amount: data.amount }],
          },
        },
      });
      createdTxId = txRecord.id;

      await tx.account.update({
        where: { id: eventAccount },
        data: { calculatedBalance: { decrement: data.amount } },
      });
    } else if (data.eventType === "WITHDRAWAL") {
      const principalCost = data.principalAmount || data.amount;

      await tx.investmentPosition.update({
        where: { id: data.positionId },
        data: {
          currentValue: { decrement: data.amount },
          acquisitionValue: { decrement: Math.min(principalCost, position.acquisitionValue.toNumber()) },
        },
      });

      const txRecord = await tx.transaction.create({
        data: {
          userId,
          accountId: eventAccount,
          amount: data.amount,
          direction: "CREDIT",
          transactionType: "INVESTMENT_WITHDRAWAL",
          description: `Resgate de ${position.instrument.name}`,
          allocations: {
            create: [{ allocationType: "INVESTMENT", amount: data.amount }],
          },
        },
      });
      createdTxId = txRecord.id;

      await tx.account.update({
        where: { id: eventAccount },
        data: { calculatedBalance: { increment: data.amount } },
      });

      if (data.realizedGain && data.realizedGain > 0) {
        await tx.investmentEvent.create({
          data: {
            userId,
            investmentPositionId: position.id,
            accountId: eventAccount,
            transactionId: createdTxId,
            type: "REALIZED_GAIN",
            amount: data.realizedGain,
            notes: `Ganho realizado em resgate de ${position.instrument.name}`,
          },
        });
      }
    } else if (data.eventType === "INCOME_RECEIVED" || data.eventType === "DIVIDEND" || data.eventType === "JCP") {
      const label = data.eventType === "DIVIDEND" ? "Dividendo" : data.eventType === "JCP" ? "JCP" : "Rendimento";
      const txRecord = await tx.transaction.create({
        data: {
          userId,
          accountId: eventAccount,
          amount: data.amount,
          direction: "CREDIT",
          transactionType: "INCOME",
          description: `${label}: ${position.instrument.name}`,
          allocations: {
            create: [{ allocationType: "INCOME", amount: data.amount }],
          },
        },
      });
      createdTxId = txRecord.id;

      await tx.account.update({
        where: { id: eventAccount },
        data: { calculatedBalance: { increment: data.amount } },
      });
    }

    const event = await tx.investmentEvent.create({
      data: {
        userId,
        investmentPositionId: position.id,
        accountId: eventAccount,
        transactionId: createdTxId || null,
        type: data.eventType,
        amount: data.amount,
        notes: data.notes,
      },
    });

    const updatedPos = await tx.investmentPosition.findUnique({
      where: { id: data.positionId },
    });
    if (updatedPos) {
      await tx.investmentPositionSnapshot.create({
        data: {
          investmentPositionId: updatedPos.id,
          quantity: updatedPos.quantity,
          currentValue: updatedPos.currentValue,
          source: "MANUAL",
        },
      });
    }

    revalidatePath("/");
    revalidatePath("/investimentos");
    revalidatePath("/contas");
    revalidatePath("/transacoes");
    revalidatePath("/resultado-mes");
    revalidatePath("/meu-patrimonio");
    return event;
  });
}
