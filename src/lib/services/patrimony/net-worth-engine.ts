import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface NetWorthBreakdownResult {
  date: Date;
  liquidAssets: number;
  investmentAssets: number;
  physicalAssets: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidNetWorth: number;
  byInstitution: Array<{ name: string; type: string; total: number }>;
  byAssetCategory: Array<{ category: string; total: number }>;
  byLiabilityType: Array<{ type: string; total: number }>;
}

export interface GoalStatusResult {
  targetNetWorth: number;
  currentNetWorth: number;
  netWorthProgressPercentage: number;
  targetPassiveIncome: number;
  projectedMonthlyPassiveIncome: number;
  passiveIncomeProgressPercentage: number;
  annualYieldRate: number;
  requiredCapitalForPassiveIncome: number;
}

export class NetWorthEngine {
  /**
   * Apura o patrimônio líquido atual com detalhamento por instituição, ativos e passivos
   */
  static async calculateCurrentNetWorth(userId: string): Promise<NetWorthBreakdownResult> {
    const now = new Date();

    // 1. Contas de Liquidez Impar (Checking, Savings, Cash)
    const liquidAccounts = await prisma.account.findMany({
      where: {
        userId,
        active: true,
        deletedAt: null,
        type: { in: ['CHECKING', 'SAVINGS', 'CASH'] },
      },
      include: { financialInstitution: true },
    });

    // 2. Contas e Posições de Investimento
    const investmentAccounts = await prisma.account.findMany({
      where: {
        userId,
        active: true,
        deletedAt: null,
        type: { in: ['BROKERAGE', 'INVESTMENT'] },
      },
      include: { financialInstitution: true },
    });

    const investmentPositions = await prisma.investmentPosition.findMany({
      where: {
        userId,
        active: true,
        deletedAt: null,
      },
      include: {
        account: { include: { financialInstitution: true } },
      },
    });

    // 3. Ativos Físicos / Imóveis / Veículos
    const physicalAssetsList = await prisma.asset.findMany({
      where: {
        userId,
        active: true,
        considerInNetWorth: true,
        deletedAt: null,
      },
    });

    // 4. Passivos e Dívidas
    const liabilitiesList = await prisma.liability.findMany({
      where: {
        userId,
        active: true,
        deletedAt: null,
      },
    });

    let liquidAssets = 0;
    const instMap = new Map<string, { type: string; total: number }>();

    for (const acc of liquidAccounts) {
      const bal = Number(acc.calculatedBalance);
      liquidAssets += bal;

      const instName = acc.financialInstitution?.name || acc.name;
      const existing = instMap.get(instName) || { type: 'BANCO', total: 0 };
      instMap.set(instName, { type: existing.type, total: existing.total + bal });
    }

    let investmentAssets = 0;
    for (const acc of investmentAccounts) {
      const bal = Number(acc.calculatedBalance);
      investmentAssets += bal;

      const instName = acc.financialInstitution?.name || acc.name;
      const existing = instMap.get(instName) || { type: 'CORRETORA', total: 0 };
      instMap.set(instName, { type: existing.type, total: existing.total + bal });
    }

    for (const pos of investmentPositions) {
      const val = Number(pos.currentValue);
      investmentAssets += val;

      const instName = pos.account?.financialInstitution?.name || pos.account?.name || 'Investimentos';
      const existing = instMap.get(instName) || { type: 'CORRETORA', total: 0 };
      instMap.set(instName, { type: existing.type, total: existing.total + val });
    }

    let physicalAssets = 0;
    const catMap = new Map<string, number>();

    for (const ast of physicalAssetsList) {
      const val = Number(ast.currentValue);
      physicalAssets += val;
      catMap.set(ast.category, (catMap.get(ast.category) || 0) + val);
    }

    let totalLiabilities = 0;
    const liabMap = new Map<string, number>();

    for (const liab of liabilitiesList) {
      const bal = Number(liab.currentBalance);
      totalLiabilities += bal;
      liabMap.set(liab.type, (liabMap.get(liab.type) || 0) + bal);
    }

    const totalAssets = liquidAssets + investmentAssets + physicalAssets;
    const netWorth = totalAssets - totalLiabilities;
    const liquidNetWorth = liquidAssets + investmentAssets - totalLiabilities;

    return {
      date: now,
      liquidAssets,
      investmentAssets,
      physicalAssets,
      totalAssets,
      totalLiabilities,
      netWorth,
      liquidNetWorth,
      byInstitution: Array.from(instMap.entries()).map(([name, data]) => ({
        name,
        type: data.type,
        total: data.total,
      })),
      byAssetCategory: Array.from(catMap.entries()).map(([category, total]) => ({
        category,
        total,
      })),
      byLiabilityType: Array.from(liabMap.entries()).map(([type, total]) => ({
        type,
        total,
      })),
    };
  }

  /**
   * Cria um snapshot patrimonial imutável na data informada
   */
  static async createSnapshot(userId: string, date: Date = new Date()) {
    const current = await this.calculateCurrentNetWorth(userId);

    const snapshot = await prisma.netWorthSnapshot.create({
      data: {
        userId,
        date,
        liquidAssets: new Prisma.Decimal(current.liquidAssets),
        investmentAssets: new Prisma.Decimal(current.investmentAssets),
        physicalAssets: new Prisma.Decimal(current.physicalAssets),
        totalAssets: new Prisma.Decimal(current.totalAssets),
        totalLiabilities: new Prisma.Decimal(current.totalLiabilities),
        netWorth: new Prisma.Decimal(current.netWorth),
        liquidNetWorth: new Prisma.Decimal(current.liquidNetWorth),
      },
    });

    return snapshot;
  }

  /**
   * Registra o reajuste manual de valor de mercado de um ativo físico com histórico auditável
   */
  static async updateAssetValuation(params: {
    userId: string;
    assetId: string;
    newValue: number;
    source?: string;
    notes?: string;
    date?: Date;
  }) {
    const { userId, assetId, newValue, source = 'MANUAL', notes, date = new Date() } = params;

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, userId, deletedAt: null },
    });
    if (!asset) throw new Error('Ativo não encontrado.');

    // 1. Registrar histórico de avaliação
    const valuation = await prisma.assetValuation.create({
      data: {
        assetId: asset.id,
        date,
        value: new Prisma.Decimal(newValue),
        source,
        notes,
      },
    });

    // 2. Atualizar valor atual e data no ativo
    const updatedAsset = await prisma.asset.update({
      where: { id: asset.id },
      data: {
        currentValue: new Prisma.Decimal(newValue),
        lastValuationDate: date,
      },
    });

    return { asset: updatedAsset, valuation };
  }

  /**
   * Obtém a meta financeira e a projeção de renda passiva com base em taxa de rendimento configurável
   */
  static async getGoalStatus(userId: string, annualYieldRate: number = 0.06): Promise<GoalStatusResult> {
    let goal = await prisma.financialGoal.findUnique({
      where: { userId },
    });

    if (!goal) {
      goal = await prisma.financialGoal.create({
        data: {
          userId,
          targetNetWorth: new Prisma.Decimal(5000000.00),
          targetPassiveIncome: new Prisma.Decimal(10000.00),
        },
      });
    }

    const current = await this.calculateCurrentNetWorth(userId);

    const targetNetWorth = Number(goal.targetNetWorth);
    const targetPassiveIncome = Number(goal.targetPassiveIncome);

    const netWorthProgressPercentage = targetNetWorth > 0
      ? Math.min(100, Math.round((current.netWorth / targetNetWorth) * 1000) / 10)
      : 0;

    // Capital investível para renda passiva (líquidos + investimentos)
    const investableCapital = current.liquidAssets + current.investmentAssets;

    // Projeção de Renda Passiva Mensal (Isolada, não apresentada como patrimônio atual!)
    const monthlyRate = annualYieldRate / 12;
    const projectedMonthlyPassiveIncome = investableCapital * monthlyRate;

    const passiveIncomeProgressPercentage = targetPassiveIncome > 0
      ? Math.min(100, Math.round((projectedMonthlyPassiveIncome / targetPassiveIncome) * 1000) / 10)
      : 0;

    const requiredCapitalForPassiveIncome = (targetPassiveIncome * 12) / annualYieldRate;

    return {
      targetNetWorth,
      currentNetWorth: current.netWorth,
      netWorthProgressPercentage,
      targetPassiveIncome,
      projectedMonthlyPassiveIncome,
      passiveIncomeProgressPercentage,
      annualYieldRate,
      requiredCapitalForPassiveIncome,
    };
  }
}
