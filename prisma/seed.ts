import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados...");

  // 1. Criar Usuário Principal
  const user = await prisma.user.upsert({
    where: { email: "usuario@patrimonio.com" },
    update: {},
    create: {
      name: "Usuário Principal",
      email: "usuario@patrimonio.com",
    },
  });

  console.log(`Usuário criado: ${user.name} (${user.id})`);

  // 2. Instituições Financeiras
  const bb = await prisma.financialInstitution.create({
    data: {
      userId: user.id,
      name: "Banco do Brasil",
      type: "BANK",
    },
  });

  const sicoob = await prisma.financialInstitution.create({
    data: {
      userId: user.id,
      name: "Sicoob",
      type: "COOPERATIVE",
    },
  });

  const sicredi = await prisma.financialInstitution.create({
    data: {
      userId: user.id,
      name: "Sicredi",
      type: "COOPERATIVE",
    },
  });

  const bradesco = await prisma.financialInstitution.create({
    data: {
      userId: user.id,
      name: "Bradesco",
      type: "BANK",
    },
  });

  const xp = await prisma.financialInstitution.create({
    data: {
      userId: user.id,
      name: "XP Investimentos",
      type: "BROKER",
    },
  });

  // 3. Contas Financeiras
  const accBB = await prisma.account.create({
    data: {
      userId: user.id,
      financialInstitutionId: bb.id,
      name: "Conta Corrente BB",
      type: "CHECKING",
      initialBalance: 15400.0,
      calculatedBalance: 15400.0,
      confirmedBalance: 15400.0,
    },
  });

  const accSicredi = await prisma.account.create({
    data: {
      userId: user.id,
      financialInstitutionId: sicredi.id,
      name: "Conta Salário Sicredi",
      type: "CHECKING",
      initialBalance: 8250.5,
      calculatedBalance: 8250.5,
      confirmedBalance: 8250.5,
    },
  });

  const accSicoob = await prisma.account.create({
    data: {
      userId: user.id,
      financialInstitutionId: sicoob.id,
      name: "Reserva de Emergência Sicoob",
      type: "SAVINGS",
      initialBalance: 25000.0,
      calculatedBalance: 25000.0,
      confirmedBalance: 25000.0,
    },
  });

  const accXP = await prisma.account.create({
    data: {
      userId: user.id,
      financialInstitutionId: xp.id,
      name: "Conta Investimento XP",
      type: "BROKERAGE",
      initialBalance: 1200.0,
      calculatedBalance: 1200.0,
      confirmedBalance: 1200.0,
    },
  });

  // 4. Categorias Hierárquicas
  const catMoradia = await prisma.category.create({
    data: {
      userId: user.id,
      name: "Moradia",
      icon: "Home",
      subcategories: {
        create: [
          { userId: user.id, name: "Aluguel" },
          { userId: user.id, name: "Condomínio" },
          { userId: user.id, name: "Energia" },
          { userId: user.id, name: "Água" },
          { userId: user.id, name: "Internet" },
        ],
      },
    },
  });

  const catAlimentacao = await prisma.category.create({
    data: {
      userId: user.id,
      name: "Alimentação",
      icon: "Utensils",
      subcategories: {
        create: [
          { userId: user.id, name: "Mercado" },
          { userId: user.id, name: "Restaurante" },
          { userId: user.id, name: "Delivery" },
        ],
      },
    },
  });

  const catTransporte = await prisma.category.create({
    data: {
      userId: user.id,
      name: "Transporte",
      icon: "Car",
      subcategories: {
        create: [
          { userId: user.id, name: "Combustível" },
          { userId: user.id, name: "Manutenção" },
          { userId: user.id, name: "Seguro" },
        ],
      },
    },
  });

  const catReceitas = await prisma.category.create({
    data: {
      userId: user.id,
      name: "Receitas",
      icon: "TrendingUp",
      subcategories: {
        create: [
          { userId: user.id, name: "Salário" },
          { userId: user.id, name: "Honorários" },
          { userId: user.id, name: "Dividendos" },
        ],
      },
    },
  });

  // 5. Ativos (Investimentos e Bens Físicos)
  const assetImovel = await prisma.asset.create({
    data: {
      userId: user.id,
      name: "Apartamento 3 Quartos (Jardins)",
      category: "REAL_ESTATE",
      description: "Imóvel residencial 110m²",
      acquisitionValue: 350000.0,
      currentValue: 420000.0,
      considerInNetWorth: true,
      valuations: {
        create: [
          { value: 350000.0, notes: "Valor de aquisição" },
          { value: 420000.0, notes: "Avaliação imobiliária recente" },
        ],
      },
    },
  });

  const assetCarro = await prisma.asset.create({
    data: {
      userId: user.id,
      name: "Toyota Corolla Cross 2023",
      category: "VEHICLE",
      acquisitionValue: 140000.0,
      currentValue: 125000.0,
      considerInNetWorth: true,
    },
  });

  const assetTesouro = await prisma.asset.create({
    data: {
      userId: user.id,
      name: "Tesouro Selic 2029",
      category: "FIXED_INCOME",
      acquisitionValue: 50000.0,
      currentValue: 58400.0,
      considerInNetWorth: true,
    },
  });

  const assetAcoes = await prisma.asset.create({
    data: {
      userId: user.id,
      name: "Carteira de Ações / FIIs",
      category: "FINANCIAL_TICKER",
      acquisitionValue: 30000.0,
      currentValue: 36500.0,
      considerInNetWorth: true,
    },
  });

  // 6. Passivos (Dívidas)
  const liabFinanciamento = await prisma.liability.create({
    data: {
      userId: user.id,
      name: "Financiamento Imobiliário CEF",
      institution: "Caixa Econômica Federal",
      type: "MORTGAGE",
      originalValue: 280000.0,
      currentBalance: 210000.0,
      interestRate: 8.5,
      totalInstallments: 360,
      remainingInstallments: 280,
      installmentValue: 2450.0,
      associatedAssetId: assetImovel.id,
    },
  });

  // 7. Snapshots Históricos para Evolução Patrimonial
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - i);

    // Variação progressiva do patrimônio nos últimos 6 meses
    const factor = 1 - i * 0.03;
    await prisma.netWorthSnapshot.create({
      data: {
        userId: user.id,
        date: d,
        liquidAssets: 48000 * factor,
        investmentAssets: 94000 * factor,
        physicalAssets: 545000,
        totalAssets: (48000 * factor) + (94000 * factor) + 545000,
        totalLiabilities: 210000 + (i * 1200),
        netWorth: ((48000 * factor) + (94000 * factor) + 545000) - (210000 + (i * 1200)),
      },
    });
  }

  console.log("Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
