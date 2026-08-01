import { formatCurrencyBRL } from "@/lib/decimal";
import { Wallet, TrendingUp, Building, TrendingDown, ShieldCheck } from "lucide-react";

export default function MeuPatrimonioPage() {
  const liquidAccounts = [
    { name: "Banco do Brasil (Conta Corrente)", value: 15400.0 },
    { name: "Sicredi (Conta Salário)", value: 8250.5 },
    { name: "Sicoob (Reserva de Emergência)", value: 25000.0 },
  ];

  const investments = [
    { name: "XP Investimentos (Saldo Caixa)", value: 1200.0 },
    { name: "Tesouro Selic 2029", value: 58400.0 },
    { name: "Carteira de Ações / FIIs", value: 36500.0 },
  ];

  const physicalAssets = [
    { name: "Apartamento 3 Quartos (Jardins)", value: 420000.0 },
    { name: "Toyota Corolla Cross 2023", value: 125000.0 },
  ];

  const liabilities = [
    { name: "Financiamento Imobiliário CEF", value: 210000.0 },
  ];

  const totalLiquid = liquidAccounts.reduce((acc, i) => acc + i.value, 0);
  const totalInvestments = investments.reduce((acc, i) => acc + i.value, 0);
  const totalPhysical = physicalAssets.reduce((acc, i) => acc + i.value, 0);

  const totalAssets = totalLiquid + totalInvestments + totalPhysical; // 689750.5
  const totalLiabilities = liabilities.reduce((acc, i) => acc + i.value, 0); // 210000.0
  const netWorth = totalAssets - totalLiabilities; // 479750.5

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Meu Patrimônio</h1>
        <p className="text-xs text-muted-foreground">Balanço Patrimonial Pessoal: Ativos, Dívidas e Patrimônio Líquido</p>
      </div>

      {/* Header do Balanço */}
      <div className="glass-card p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 border-emerald-500/30">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
            Patrimônio Líquido (Ativos - Dívidas)
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white">{formatCurrencyBRL(netWorth)}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Posição consolidada de todos os seus recursos e obrigações
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 text-center flex-1 sm:flex-initial">
            <span className="text-[11px] text-muted-foreground block">Total de Ativos</span>
            <span className="text-lg font-bold text-emerald-400">{formatCurrencyBRL(totalAssets)}</span>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-rose-500/20 text-center flex-1 sm:flex-initial">
            <span className="text-[11px] text-muted-foreground block">Total de Dívidas</span>
            <span className="text-lg font-bold text-rose-400">{formatCurrencyBRL(totalLiabilities)}</span>
          </div>
        </div>
      </div>

      {/* Seções do Balanço Patrimonial */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ativos */}
        <div className="glass-card p-6 rounded-2xl space-y-5">
          <h3 className="font-bold text-white text-lg border-b border-white/10 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>ATIVOS (R$ {formatCurrencyBRL(totalAssets)})</span>
          </h3>

          {/* 1. Dinheiro Disponível */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase">
              <Wallet className="w-4 h-4" />
              <span>Dinheiro Disponível ({formatCurrencyBRL(totalLiquid)})</span>
            </div>
            {liquidAccounts.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs py-1.5 px-3 rounded-xl bg-white/5">
                <span className="text-slate-300">{item.name}</span>
                <span className="font-semibold text-white">{formatCurrencyBRL(item.value)}</span>
              </div>
            ))}
          </div>

          {/* 2. Investimentos */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase">
              <TrendingUp className="w-4 h-4" />
              <span>Investimentos ({formatCurrencyBRL(totalInvestments)})</span>
            </div>
            {investments.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs py-1.5 px-3 rounded-xl bg-white/5">
                <span className="text-slate-300">{item.name}</span>
                <span className="font-semibold text-white">{formatCurrencyBRL(item.value)}</span>
              </div>
            ))}
          </div>

          {/* 3. Bens */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase">
              <Building className="w-4 h-4" />
              <span>Bens Patrimoniais ({formatCurrencyBRL(totalPhysical)})</span>
            </div>
            {physicalAssets.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs py-1.5 px-3 rounded-xl bg-white/5">
                <span className="text-slate-300">{item.name}</span>
                <span className="font-semibold text-white">{formatCurrencyBRL(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Passivos & Balanço Final */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-lg border-b border-white/10 pb-3 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-400" />
              <span>DÍVIDAS & PASSIVOS (R$ {formatCurrencyBRL(totalLiabilities)})</span>
            </h3>

            <div className="space-y-2">
              {liabilities.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs py-2 px-3 rounded-xl bg-white/5">
                  <span className="text-slate-300">{item.name}</span>
                  <span className="font-bold text-rose-400">{formatCurrencyBRL(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl space-y-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/30">
            <h4 className="text-sm font-bold text-white">Resumo do Balanço</h4>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total de Ativos:</span>
              <span className="font-semibold text-emerald-400">{formatCurrencyBRL(totalAssets)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total de Dívidas:</span>
              <span className="font-semibold text-rose-400">-{formatCurrencyBRL(totalLiabilities)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10 text-white">
              <span>Patrimônio Líquido:</span>
              <span className="text-emerald-400">{formatCurrencyBRL(netWorth)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
