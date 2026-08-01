import { formatCurrencyBRL, formatPercent } from "@/lib/decimal";
import { PieChart, TrendingUp, HelpCircle, ArrowRight, ShieldCheck, Check } from "lucide-react";

export default function RelatoriosPage() {
  const initialNetWorth = 466000.0;
  const income = 12500.0;
  const expenses = 3130.5; // Consumo (680.5) + Juros (720) + Tarifas (80) + Outros
  const netCashFlow = income - expenses; // 9369.5
  const unrealizedGains = 4381.0; // Rentabilidade/Valorização de Imóveis e Ações
  const finalNetWorth = initialNetWorth + netCashFlow + unrealizedGains; // 479750.5
  const netWorthChange = finalNetWorth - initialNetWorth;

  // Wealth Building Rate: (Aportes Líquidos 5000 + Amortização 1650) / Receitas 12500 = 53.2%
  const wealthBuildingRate = 53.2;

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
          <h2 className="text-4xl font-black text-white">{formatPercent(wealthBuildingRate)}</h2>
          <p className="text-xs text-muted-foreground">
            Percentual da sua receita que efetivamente virou patrimônio (Aportes em investimentos + Amortização de principal de dívidas)
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl text-xs space-y-1.5 w-full sm:w-auto">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Aportes em Investimento:</span>
            <span className="font-bold text-emerald-400">{formatCurrencyBRL(5000)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Amortização de Passivos:</span>
            <span className="font-bold text-cyan-400">{formatCurrencyBRL(1650)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-1">
            <span className="text-muted-foreground">Receita Total no Mês:</span>
            <span className="font-bold text-white">{formatCurrencyBRL(income)}</span>
          </div>
        </div>
      </div>

      {/* Conciliação Patrimonial sem Dupla Contagem */}
      <div className="glass-card p-6 rounded-2xl space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <PieChart className="w-5 h-5 text-cyan-400" />
          <span>Conciliação Fechada do Período (Último Mês)</span>
        </h3>

        <div className="space-y-3">
          {/* Passo 1: Inicial */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-sm font-semibold text-white">Patrimônio Líquido Inicial</span>
            <span className="text-base font-bold text-white">{formatCurrencyBRL(initialNetWorth)}</span>
          </div>

          {/* Fluxo de Caixa Líquido */}
          <div className="pl-4 space-y-2 border-l-2 border-emerald-500/40">
            <div className="flex items-center justify-between text-xs text-emerald-400">
              <span>(+) Receitas Operacionais Registradas</span>
              <span className="font-bold">+{formatCurrencyBRL(income)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-rose-400">
              <span>(-) Despesas Operacionais Totais (Consumo + Juros + Tarifas)</span>
              <span className="font-bold">-{formatCurrencyBRL(expenses)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold pt-1 border-t border-white/5">
              <span>(=) Gerado pelo Fluxo de Caixa Líquido</span>
              <span className="text-emerald-400">+{formatCurrencyBRL(netCashFlow)}</span>
            </div>
          </div>

          {/* Variação de Mercado */}
          <div className="pl-4 space-y-2 border-l-2 border-purple-500/40">
            <div className="flex items-center justify-between text-xs text-purple-400">
              <span>(+) Valorização de Ativos & Investimentos (Ganhos Não Realizados)</span>
              <span className="font-bold">+{formatCurrencyBRL(unrealizedGains)}</span>
            </div>
          </div>

          {/* Passo Final */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
            <div>
              <span className="text-sm font-bold text-white">Patrimônio Líquido Final</span>
              <p className="text-xs text-emerald-400 font-medium">Variação Total: +{formatCurrencyBRL(netWorthChange)}</p>
            </div>
            <span className="text-2xl font-black text-white">{formatCurrencyBRL(finalNetWorth)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
