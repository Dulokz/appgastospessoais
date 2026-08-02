import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { formatCurrencyBRL } from "@/lib/decimal";
import { MonthlyResultService } from "@/lib/services/monthly-result.service";
import { TrendingUp, TrendingDown, Calendar, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

async function getResultadoMesData() {
  try {
    const userId = await getDefaultUserId();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const transactions = await db.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      include: {
        category: true,
        allocations: {
          include: { category: true },
        },
      },
    });

    const summaryItems = transactions.map((t) => ({
      id: t.id,
      type: t.transactionType,
      amount: t.amount.toNumber(),
      categoryName: t.category?.name,
      allocations: t.allocations.map((a) => ({
        type: a.allocationType,
        amount: a.amount.toNumber(),
        categoryName: a.category?.name,
      })),
    }));

    const report = MonthlyResultService.calculateReport(summaryItems);

    return {
      report,
      monthYearStr: now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      hasTransactions: transactions.length > 0,
    };
  } catch (error) {
    console.error("Erro ao calcular resultado do mês:", error);
    return {
      report: {
        totalIncome: new (require("@/lib/decimal").Decimal)(0),
        totalExpenses: new (require("@/lib/decimal").Decimal)(0),
        monthlyResult: new (require("@/lib/decimal").Decimal)(0),
        incomeCategories: [],
        expenseCategories: [],
      },
      monthYearStr: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      hasTransactions: false,
    };
  }
}

export default async function ResultadoMesPage() {
  const { report, monthYearStr, hasTransactions } = await getResultadoMesData();

  const totalIncomeNum = report.totalIncome.toNumber();
  const totalExpensesNum = report.totalExpenses.toNumber();
  const monthlyResultNum = report.monthlyResult.toNumber();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Resultado do Mês</h1>
          <p className="text-xs text-muted-foreground">Demonstrativo Pessoal de Receitas e Despesas (sem misturar aportes e amortizações)</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 capitalize">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>{monthYearStr}</span>
        </div>
      </div>

      {/* Card do Resultado Final */}
      <div className="glass-card p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 border-emerald-500/30">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
            Superávit / Resultado Financeiro do Mês
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white">{formatCurrencyBRL(monthlyResultNum)}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Diferença líquida gerada pelas suas receitas ({formatCurrencyBRL(totalIncomeNum)}) menos suas despesas ({formatCurrencyBRL(totalExpensesNum)})
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 text-center flex-1 sm:flex-initial">
            <span className="text-[11px] text-muted-foreground block">Receitas Totais</span>
            <span className="text-lg font-bold text-emerald-400">{formatCurrencyBRL(totalIncomeNum)}</span>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-rose-500/20 text-center flex-1 sm:flex-initial">
            <span className="text-[11px] text-muted-foreground block">Despesas Totais</span>
            <span className="text-lg font-bold text-rose-400">{formatCurrencyBRL(totalExpensesNum)}</span>
          </div>
        </div>
      </div>

      {!hasTransactions ? (
        <div className="glass-card p-8 rounded-2xl text-center space-y-3 max-w-lg mx-auto">
          <Receipt className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-white text-base">Nenhuma movimentação no mês vigente</h3>
          <p className="text-xs text-muted-foreground">
            Registre suas receitas e despesas com o botão <strong className="text-emerald-400">+ Registrar</strong> para calcular o resultado operacional real do mês.
          </p>
        </div>
      ) : (
        /* Tabela de Receitas e Despesas */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Receitas */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Receitas Operacionais</h3>
            </div>

            <div className="space-y-2">
              {report.incomeCategories.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Nenhuma receita registrada no mês.</p>
              ) : (
                report.incomeCategories.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-white/5">
                    <span className="text-slate-300 font-medium">{item.name}</span>
                    <span className="font-bold text-emerald-400">{formatCurrencyBRL(item.total.toNumber())}</span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between font-bold text-sm text-white">
              <span>Total de Receitas:</span>
              <span className="text-emerald-400">{formatCurrencyBRL(totalIncomeNum)}</span>
            </div>
          </div>

          {/* Despesas */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <TrendingDown className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-white text-base">Despesas Operacionais</h3>
            </div>

            <div className="space-y-2">
              {report.expenseCategories.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Nenhuma despesa registrada no mês.</p>
              ) : (
                report.expenseCategories.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-white/5">
                    <span className="text-slate-300 font-medium">{item.name}</span>
                    <span className="font-bold text-rose-400">{formatCurrencyBRL(item.total.toNumber())}</span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between font-bold text-sm text-white">
              <span>Total de Despesas:</span>
              <span className="text-rose-400">{formatCurrencyBRL(totalExpensesNum)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
