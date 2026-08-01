import { formatCurrencyBRL } from "@/lib/decimal";
import { TrendingUp, TrendingDown, Calendar, ShieldCheck } from "lucide-react";

export default function ResultadoMesPage() {
  const incomeItems = [
    { name: "Salário Mensal", value: 12000.0 },
    { name: "Honorários de Serviços", value: 3000.0 },
    { name: "Rendimentos & Dividendos", value: 500.0 },
  ];

  const expenseItems = [
    { name: "Moradia (Aluguel/Condomínio)", value: 2500.0 },
    { name: "Alimentação (Supermercado/Restaurante)", value: 1300.0 },
    { name: "Transporte (Combustível/Seguro)", value: 900.0 },
    { name: "Lazer & Assinaturas", value: 800.0 },
    { name: "Juros de Financiamento", value: 350.0 },
    { name: "Tarifas Bancárias", value: 50.0 },
    { name: "Outros Gastos", value: 1400.0 },
  ];

  const totalIncome = incomeItems.reduce((acc, i) => acc + i.value, 0); // 15500
  const totalExpenses = expenseItems.reduce((acc, e) => acc + e.value, 0); // 7300
  const monthlyResult = totalIncome - totalExpenses; // 8200

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Resultado do Mês</h1>
          <p className="text-xs text-muted-foreground">Demonstrativo Pessoal de Receitas e Despesas (sem misturar aportes e amortizações)</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>Agosto / 2026</span>
        </div>
      </div>

      {/* Card do Resultado Final */}
      <div className="glass-card p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 border-emerald-500/30">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
            Superávit / Resultado Financeiro do Mês
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white">{formatCurrencyBRL(monthlyResult)}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Diferença líquida gerada pelas suas receitas ({formatCurrencyBRL(totalIncome)}) menos suas despesas ({formatCurrencyBRL(totalExpenses)})
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 text-center flex-1 sm:flex-initial">
            <span className="text-[11px] text-muted-foreground block">Receitas Totais</span>
            <span className="text-lg font-bold text-emerald-400">{formatCurrencyBRL(totalIncome)}</span>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-rose-500/20 text-center flex-1 sm:flex-initial">
            <span className="text-[11px] text-muted-foreground block">Despesas Totais</span>
            <span className="text-lg font-bold text-rose-400">{formatCurrencyBRL(totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Tabela de Receitas e Despesas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receitas */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Receitas Operacionais</h3>
          </div>

          <div className="space-y-2">
            {incomeItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-white/5">
                <span className="text-slate-300 font-medium">{item.name}</span>
                <span className="font-bold text-emerald-400">{formatCurrencyBRL(item.value)}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-between font-bold text-sm text-white">
            <span>Total de Receitas:</span>
            <span className="text-emerald-400">{formatCurrencyBRL(totalIncome)}</span>
          </div>
        </div>

        {/* Despesas */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <TrendingDown className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-white text-base">Despesas Operacionais</h3>
          </div>

          <div className="space-y-2">
            {expenseItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-white/5">
                <span className="text-slate-300 font-medium">{item.name}</span>
                <span className="font-bold text-rose-400">{formatCurrencyBRL(item.value)}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-between font-bold text-sm text-white">
            <span>Total de Despesas:</span>
            <span className="text-rose-400">{formatCurrencyBRL(totalExpenses)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
