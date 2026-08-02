import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { formatCurrencyBRL, formatPercent } from "@/lib/decimal";
import { PieChart, TrendingUp, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

async function getRelatorioData() {
  try {
    const userId = await getDefaultUserId();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const user = await db.user.findFirst({
      where: { id: userId },
      include: {
        accounts: { where: { active: true } },
        assets: { where: { active: true } },
        investmentPositions: { where: { active: true } },
        liabilities: { where: { active: true } },
      },
    });

    const monthTransactions = await db.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lt: startOfNextMonth },
      },
      include: { allocations: true },
    });

    let income = 0;
    let expenses = 0;
    let investmentContributions = 0;
    let liabilityPrincipalAmortization = 0;

    for (const tx of monthTransactions) {
      if (tx.transactionType === "INCOME") {
        income += tx.amount.toNumber();
      } else if (tx.transactionType === "EXPENSE") {
        expenses += tx.amount.toNumber();
      } else if (tx.transactionType === "INVESTMENT_CONTRIBUTION") {
        investmentContributions += tx.amount.toNumber();
      } else if (tx.transactionType === "LIABILITY_PAYMENT") {
        if (tx.allocations && tx.allocations.length > 0) {
          for (const alloc of tx.allocations) {
            if (alloc.allocationType === "LIABILITY_REDUCTION") {
              liabilityPrincipalAmortization += alloc.amount.toNumber();
            } else if (
              alloc.allocationType === "EXPENSE" ||
              alloc.allocationType === "INTEREST" ||
              alloc.allocationType === "FEE"
            ) {
              expenses += alloc.amount.toNumber();
            }
          }
        } else {
          expenses += tx.amount.toNumber();
        }
      }
    }

    const totalLiquid = (user?.accounts || []).reduce((acc, a) => acc + a.calculatedBalance.toNumber(), 0);
    const totalInvestments = (user?.investmentPositions || []).reduce((acc, p) => acc + p.currentValue.toNumber(), 0);
    const totalPhysical = (user?.assets || []).reduce((acc, a) => acc + a.currentValue.toNumber(), 0);
    const totalAssets = totalLiquid + totalInvestments + totalPhysical;
    const totalLiabilities = (user?.liabilities || []).reduce((acc, l) => acc + l.currentBalance.toNumber(), 0);
    const currentNetWorth = totalAssets - totalLiabilities;

    // Wealth Building Rate = (Aportes em Investimento + Amortização de Passivos) / Receita Total
    const wealthBuildingAmount = investmentContributions + liabilityPrincipalAmortization;
    const wealthBuildingRate = income > 0 ? (wealthBuildingAmount / income) * 100 : 0;

    const netCashFlow = income - expenses;
    const initialNetWorth = currentNetWorth - netCashFlow;

    return {
      income,
      expenses,
      netCashFlow,
      investmentContributions,
      liabilityPrincipalAmortization,
      wealthBuildingAmount,
      wealthBuildingRate,
      initialNetWorth,
      currentNetWorth,
      hasData: (user?.accounts.length || 0) > 0 || monthTransactions.length > 0,
    };
  } catch (error) {
    console.error("Erro ao carregar relatório:", error);
    return {
      income: 0,
      expenses: 0,
      netCashFlow: 0,
      investmentContributions: 0,
      liabilityPrincipalAmortization: 0,
      wealthBuildingAmount: 0,
      wealthBuildingRate: 0,
      initialNetWorth: 0,
      currentNetWorth: 0,
      hasData: false,
    };
  }
}

export default async function RelatoriosPage() {
  const data = await getRelatorioData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Relatório: "Por que meu patrimônio mudou?"</h1>
        <p className="text-xs text-muted-foreground">Explicabilidade completa da evolução patrimonial sem dupla contagem</p>
      </div>

      {/* Card da Taxa de Construção Patrimonial */}
      <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 border-emerald-500/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Taxa de Construção Patrimonial (Wealth Building Rate)
            </span>
          </div>
          <h2 className="text-4xl font-black text-white">{formatPercent(data.wealthBuildingRate)}</h2>
          <p className="text-xs text-muted-foreground">
            Percentual da sua receita que efetivamente virou patrimônio (Aportes em investimentos + Amortização de principal de dívidas)
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl text-xs space-y-1.5 w-full sm:w-auto">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Aportes em Investimento:</span>
            <span className="font-bold text-emerald-400">{formatCurrencyBRL(data.investmentContributions)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Amortização de Passivos:</span>
            <span className="font-bold text-cyan-400">{formatCurrencyBRL(data.liabilityPrincipalAmortization)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-1">
            <span className="text-muted-foreground">Receita Total no Mês:</span>
            <span className="font-bold text-white">{formatCurrencyBRL(data.income)}</span>
          </div>
        </div>
      </div>

      {/* Conciliação Patrimonial sem Dupla Contagem */}
      <div className="glass-card p-6 rounded-2xl space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <PieChart className="w-5 h-5 text-cyan-400" />
          <span>Conciliação Fechada do Período (Mês Vigente)</span>
        </h3>

        <div className="space-y-3">
          {/* Passo 1: Inicial */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-sm font-semibold text-white">Patrimônio Líquido Estimado Inicial</span>
            <span className="text-base font-bold text-white">{formatCurrencyBRL(data.initialNetWorth)}</span>
          </div>

          {/* Fluxo de Caixa Líquido */}
          <div className="pl-4 space-y-2 border-l-2 border-emerald-500/40">
            <div className="flex items-center justify-between text-xs text-emerald-400">
              <span>(+) Receitas Operacionais Registradas</span>
              <span className="font-bold">+{formatCurrencyBRL(data.income)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-rose-400">
              <span>(-) Despesas Operacionais Totais</span>
              <span className="font-bold">-{formatCurrencyBRL(data.expenses)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold pt-1 border-t border-white/5">
              <span>(=) Gerado pelo Fluxo de Caixa Líquido</span>
              <span className="text-emerald-400">+{formatCurrencyBRL(data.netCashFlow)}</span>
            </div>
          </div>

          {/* Passo Final */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
            <div>
              <span className="text-sm font-bold text-white">Patrimônio Líquido Atual</span>
            </div>
            <span className="text-2xl font-black text-white">{formatCurrencyBRL(data.currentNetWorth)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
