import { formatCurrencyBRL } from "@/lib/decimal";
import { Building, TrendingUp, Plus, ShieldCheck, Check } from "lucide-react";

const initialAssets = [
  { id: "1", name: "Apartamento 3 Quartos (Jardins)", category: "REAL_ESTATE", acqValue: 350000.0, currentValue: 420000.0, type: "Bens Imóveis", inNetWorth: true },
  { id: "2", name: "Toyota Corolla Cross 2023", category: "VEHICLE", acqValue: 140000.0, currentValue: 125000.0, type: "Veículos", inNetWorth: true },
  { id: "3", name: "Tesouro Selic 2029", category: "FIXED_INCOME", acqValue: 50000.0, currentValue: 58400.0, type: "Investimentos Renda Fixa", inNetWorth: true },
  { id: "4", name: "Carteira de Ações / FIIs", category: "FINANCIAL_TICKER", acqValue: 30000.0, currentValue: 36500.0, type: "Renda Variável", inNetWorth: true },
];

export default function PatrimonioPage() {
  const totalAssetsValue = initialAssets.reduce((acc, a) => acc + a.currentValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Ativos & Bens Patrimoniais</h1>
          <p className="text-xs text-muted-foreground">Imóveis, veículos, investimentos em renda fixa/variável e outros bens</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Cadastrar Ativo / Bem</span>
        </button>
      </div>

      {/* Resumo de Ativos */}
      <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-500/20 text-purple-400">
            <Building className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Valor Total dos Ativos e Posições</p>
            <h2 className="text-3xl font-black text-white">{formatCurrencyBRL(totalAssetsValue)}</h2>
          </div>
        </div>
      </div>

      {/* Tabela / Cards de Ativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialAssets.map((asset) => {
          const variation = asset.currentValue - asset.acqValue;
          const isPositive = variation >= 0;
          return (
            <div key={asset.id} className="glass-card p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{asset.name}</h3>
                  <p className="text-xs text-muted-foreground">{asset.type}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 text-[11px] font-semibold">
                  {asset.category}
                </span>
              </div>

              <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-muted-foreground">Valor de Aquisição</p>
                  <p className="text-sm font-semibold text-slate-300">{formatCurrencyBRL(asset.acqValue)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Valor Atual</p>
                  <p className="text-base font-bold text-white">{formatCurrencyBRL(asset.currentValue)}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className={isPositive ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                  {isPositive ? "+" : ""}{formatCurrencyBRL(variation)} (Variação de Mercado)
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" /> Considerar no Patrimônio
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
