import { PrismaClient, TransactionNature, ClassificationStatus, TransactionOrigin, TransactionPeriodType } from '@prisma/client';

const prisma = new PrismaClient();

export interface MonthlyFinancialOSResult {
  yearMonth: string;
  controlStartDate: Date | null;
  activeAccountsCount: number;
  isEmptyState: boolean;
  receitaReal: number;
  consumoPessoal: number;
  formacaoPatrimonial: number;
  desperdicioFinanceiro: number;
  sobraInvestivel: number;
  aporteReal: number;
  gapAporte: number;
  eficienciaPatrimonial: number;
  details: {
    incomeBreakdown: Array<{ name: string; amount: number }>;
    expenseBreakdown: Array<{ name: string; amount: number }>;
    patrimonyBreakdown: Array<{ name: string; amount: number }>;
    wasteBreakdown: Array<{ name: string; amount: number }>;
  };
}

export class FinancialOSEngine {
  /**
   * Apura as métricas mensais do Sistema Operacional Financeiro Pessoal para uma competência (AAAA-MM)
   * FALLBACK IMEDIATO: Se 0 contas ativas, retorna o estado vazio em < 10ms sem travar em consultas pesadas.
   */
  static async getMonthlyResult(
    userId: string,
    yearMonth: string
  ): Promise<MonthlyFinancialOSResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { controlStartDate: true },
      });

      // 1. Contagem Rápida de Contas Ativas
      const activeAccountsCount = await prisma.account.count({
        where: { userId, active: true, deletedAt: null },
      });

      // FALLBACK RÁPIDO: Se 0 contas, retorna estado vazio em < 10ms
      if (activeAccountsCount === 0) {
        return {
          yearMonth,
          controlStartDate: user?.controlStartDate || null,
          activeAccountsCount: 0,
          isEmptyState: true,
          receitaReal: 0,
          consumoPessoal: 0,
          formacaoPatrimonial: 0,
          desperdicioFinanceiro: 0,
          sobraInvestivel: 0,
          aporteReal: 0,
          gapAporte: 0,
          eficienciaPatrimonial: 0,
          details: {
            incomeBreakdown: [],
            expenseBreakdown: [],
            patrimonyBreakdown: [],
            wasteBreakdown: [],
          },
        };
      }

      const [yearStr, monthStr] = yearMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;

      const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          deletedAt: null,
          classificationStatus: { notIn: [ClassificationStatus.IGNORED] },
          OR: [
            { competenceDate: { gte: startDate, lte: endDate } },
            { competenceDate: null, date: { gte: startDate, lte: endDate } },
          ],
        },
        include: {
          category: true,
          account: true,
        },
      });

      let receitaReal = 0;
      let consumoPessoal = 0;
      let formacaoPatrimonial = 0;
      let desperdicioFinanceiro = 0;
      let aporteReal = 0;

      const incomeMap = new Map<string, number>();
      const expenseMap = new Map<string, number>();
      const patrimonyMap = new Map<string, number>();
      const wasteMap = new Map<string, number>();

      for (const tx of transactions) {
        if (
          tx.origin === TransactionOrigin.OPENING_BALANCE ||
          tx.periodType === TransactionPeriodType.OPENING_BALANCE ||
          tx.description.includes('SALDO DE ABERTURA')
        ) {
          continue;
        }

        const amt = Math.abs(Number(tx.amount));
        const catName = tx.category?.name || tx.description || 'Outros';

        switch (tx.nature) {
          case TransactionNature.INCOME:
            receitaReal += amt;
            incomeMap.set(catName, (incomeMap.get(catName) || 0) + amt);
            break;

          case TransactionNature.EXPENSE:
          case TransactionNature.CREDIT_CARD_PURCHASE:
          case TransactionNature.THIRD_PARTY_EXPENSE:
            consumoPessoal += amt;
            expenseMap.set(catName, (expenseMap.get(catName) || 0) + amt);
            break;

          case TransactionNature.REFUND:
            consumoPessoal = Math.max(0, consumoPessoal - amt);
            break;

          case TransactionNature.INVESTMENT_CONTRIBUTION:
            aporteReal += amt;
            formacaoPatrimonial += amt;
            patrimonyMap.set(`Aporte: ${catName}`, (patrimonyMap.get(`Aporte: ${catName}`) || 0) + amt);
            break;

          case TransactionNature.ASSET_ACQUISITION:
          case TransactionNature.DEBT_PRINCIPAL:
            formacaoPatrimonial += amt;
            patrimonyMap.set(`Amortização: ${catName}`, (patrimonyMap.get(`Amortização: ${catName}`) || 0) + amt);
            break;

          case TransactionNature.DEBT_INTEREST:
            desperdicioFinanceiro += amt;
            wasteMap.set(catName, (wasteMap.get(catName) || 0) + amt);
            break;

          case TransactionNature.CREDIT_CARD_PAYMENT:
          case TransactionNature.INTERNAL_TRANSFER:
          case TransactionNature.UNCLASSIFIED:
          default:
            break;
        }
      }

      const sobraInvestivel = Math.max(0, receitaReal - consumoPessoal - desperdicioFinanceiro);
      const gapAporte = sobraInvestivel - aporteReal;

      const eficienciaPatrimonial = receitaReal > 0
        ? Math.round((formacaoPatrimonial / receitaReal) * 1000) / 10
        : 0;

      return {
        yearMonth,
        controlStartDate: user?.controlStartDate || null,
        activeAccountsCount,
        isEmptyState: receitaReal === 0 && consumoPessoal === 0 && formacaoPatrimonial === 0,
        receitaReal,
        consumoPessoal,
        formacaoPatrimonial,
        desperdicioFinanceiro,
        sobraInvestivel,
        aporteReal,
        gapAporte,
        eficienciaPatrimonial,
        details: {
          incomeBreakdown: Array.from(incomeMap.entries()).map(([name, amount]) => ({ name, amount })),
          expenseBreakdown: Array.from(expenseMap.entries()).map(([name, amount]) => ({ name, amount })),
          patrimonyBreakdown: Array.from(patrimonyMap.entries()).map(([name, amount]) => ({ name, amount })),
          wasteBreakdown: Array.from(wasteMap.entries()).map(([name, amount]) => ({ name, amount })),
        },
      };
    } catch (err: any) {
      console.error('[FinancialOSEngine] ERRO REAL NA CONSULTA DO DASHBOARD:', err);
      throw err;
    }
  }

  /**
   * Gera o histórico comparativo dos últimos N meses
   */
  static async getHistoricalTrend(userId: string, monthsCount: number = 12): Promise<MonthlyFinancialOSResult[]> {
    const results: MonthlyFinancialOSResult[] = [];
    const now = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const yearMonth = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const res = await this.getMonthlyResult(userId, yearMonth);
      results.push(res);
    }

    return results;
  }
}
