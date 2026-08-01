import { formatCurrencyBRL } from "@/lib/decimal";
import { TrendingDown, Plus, Link as LinkIcon, Building2 } from "lucide-react";

const initialLiabilities = [
  {
    id: "1",
    name: "Financiamento Imobiliário CEF",
    institution: "Caixa Econômica Federal",
    type: "Financiamento Imobiliário",
    originalValue: 280000.0,
    currentBalance: 210000.0,
    installment: 2450.0,
    remaining: 280,
    associatedAsset: "Apartamento 3 Quartos (Jardins)",
    assetValue: 420000.0,
  },
];

export default function DividasPage() {
  const totalLiabilities = initialLiabilities.reduce((acc, l) => acc + l.currentBalance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dívidas & Passivos</h1>
          <p className="text-xs text-muted-foreground">Financiamentos imobiliários, veiculares, empréstimos e parcelamentos</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Cadastrar Passivo / Dívida</span>
        </button>
      </div>

      {/* Resumo de Dívidas */}
      <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-rose-500/20 text-rose-400">
            <TrendingDown className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Saldo Devedor Total dos Passivos</p>
            <h2 className="text-3xl font-black text-rose-400">{formatCurrencyBRL(totalLiabilities)}</h2>
          </div>
        </div>
      </div>

      {/* Cards de Dívidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialLiabilities.map((liab) => {
          const equity = liab.assetValue ? liab.assetValue - liab.currentBalance : 0;
          return (
            <div key={liab.id} className="glass-card p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{liab.name}</h3>
                  <p className="text-xs text-muted-foreground">{liab.institution}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 text-[11px] font-semibold">
                  {liab.type}
                </span>
              </div>

              <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-muted-foreground">Valor Original</p>
                  <p className="text-sm font-semibold text-slate-300">{formatCurrencyBRL(liab.originalValue)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Saldo Devedor Atual</p>
                  <p className="text-base font-bold text-rose-400">{formatCurrencyBRL(liab.currentBalance)}</p>
                </div>
              </div>

              {liab.associatedAsset && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Bem Associado: {liab.associatedAsset}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground pt-1">
                    <span>Valor do Imóvel: {formatCurrencyBRL(liab.assetValue)}</span>
                    <span className="text-emerald-400 font-bold">Equity do Imóvel: {formatCurrencyBRL(equity)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
