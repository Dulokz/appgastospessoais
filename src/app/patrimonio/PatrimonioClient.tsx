"use client";

import { useState } from "react";
import { formatCurrencyBRL } from "@/lib/decimal";
import { Building, Plus, Check, X } from "lucide-react";
import { createAsset } from "@/lib/actions/db-actions";

interface AssetItem {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  acqValue: number;
  currentValue: number;
  inNetWorth: boolean;
}

interface PatrimonioClientProps {
  initialAssets: AssetItem[];
}

const CATEGORIES_LIST = [
  { value: "REAL_ESTATE", label: "Imóvel" },
  { value: "VEHICLE", label: "Veículo" },
  { value: "EQUIPMENT", label: "Equipamento / Eletrônico" },
  { value: "CORPORATE_SHARE", label: "Participação societária" },
  { value: "OTHER", label: "Outro bem" },
];

export function PatrimonioClient({ initialAssets }: PatrimonioClientProps) {
  const [assets, setAssets] = useState<AssetItem[]>(initialAssets);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("REAL_ESTATE");
  const [acqValueStr, setAcqValueStr] = useState("");
  const [currentValueStr, setCurrentValueStr] = useState("");
  const [loading, setLoading] = useState(false);

  const totalAssetsValue = assets.reduce((acc, a) => acc + a.currentValue, 0);

  const handleCreate = async () => {
    if (!name || !currentValueStr) return;
    setLoading(true);

    try {
      const acq = parseFloat(acqValueStr) || parseFloat(currentValueStr);
      const curr = parseFloat(currentValueStr);

      await createAsset({
        name,
        category: category as any,
        acquisitionValue: acq,
        currentValue: curr,
        considerInNetWorth: true,
      });

      setIsAddOpen(false);
      setName("");
      setAcqValueStr("");
      setCurrentValueStr("");
      window.location.reload();
    } catch (err) {
      console.error("Erro ao criar ativo:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Ativos & Bens Patrimoniais</h1>
          <p className="text-xs text-muted-foreground">Imóveis, veículos, equipamentos, participações e outros bens</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all self-start sm:self-auto"
        >
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
            <p className="text-xs text-muted-foreground font-medium">Valor Total dos Ativos e Bens</p>
            <h2 className="text-3xl font-black text-white">{formatCurrencyBRL(totalAssetsValue)}</h2>
          </div>
        </div>
      </div>

      {/* Se não houver ativos: State Vazio */}
      {assets.length === 0 ? (
        <div className="glass-card p-8 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
          <Building className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-white text-base">Você ainda não cadastrou nenhum bem ou ativo</h3>
          <p className="text-xs text-muted-foreground">
            Cadastre seu imóvel, veículo, computador ou outros bens para acompanhar a evolução patrimonial real.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20"
          >
            + Adicionar Bem
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((asset) => {
            const variation = asset.currentValue - asset.acqValue;
            const isPositive = variation >= 0;
            return (
              <div key={asset.id} className="glass-card p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">{asset.name}</h3>
                    <p className="text-xs text-muted-foreground">{asset.categoryLabel}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 text-[11px] font-semibold">
                    {asset.categoryLabel}
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
                    <Check className="w-3.5 h-3.5" /> Considerado no Patrimônio
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Cadastrar Ativo */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white">Cadastrar Ativo / Bem</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-xl text-muted-foreground hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Nome do Bem</label>
              <input
                type="text"
                placeholder="ex: Apartamento Jardins, Toyota Corolla"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Categoria do Bem</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
              >
                {CATEGORIES_LIST.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Valor de Aquisição (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={acqValueStr}
                onChange={(e) => setAcqValueStr(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Valor Atual Estimado (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={currentValueStr}
                onChange={(e) => setCurrentValueStr(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !name || !currentValueStr}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/20"
              >
                {loading ? "Salvando..." : "Salvar Ativo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
