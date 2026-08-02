"use client";

import { useState } from "react";
import { formatCurrencyBRL } from "@/lib/decimal";
import { TrendingDown, Plus, Link as LinkIcon, X } from "lucide-react";
import { createLiability } from "@/lib/actions/db-actions";

interface LiabilityItem {
  id: string;
  name: string;
  institution?: string | null;
  type: string;
  typeLabel: string;
  originalValue: number;
  currentBalance: number;
  associatedAsset?: {
    name: string;
    currentValue: number;
  } | null;
}

interface AssetItem {
  id: string;
  name: string;
}

interface DividasClientProps {
  initialLiabilities: LiabilityItem[];
  assets: AssetItem[];
}

const LIABILITY_TYPES = [
  { value: "MORTGAGE", label: "Financiamento Imobiliário" },
  { value: "VEHICLE_LOAN", label: "Financiamento Veicular" },
  { value: "PERSONAL_LOAN", label: "Empréstimo Pessoal" },
  { value: "INSTALLMENT", label: "Parcelamento" },
  { value: "CREDIT_CARD", label: "Cartão de Crédito" },
  { value: "OTHER", label: "Outro Passivo" },
];

export function DividasClient({ initialLiabilities, assets }: DividasClientProps) {
  const [liabilities, setLiabilities] = useState<LiabilityItem[]>(initialLiabilities);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState("MORTGAGE");
  const [originalValueStr, setOriginalValueStr] = useState("");
  const [currentBalanceStr, setCurrentBalanceStr] = useState("");
  const [associatedAssetId, setAssociatedAssetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalLiabilities = liabilities.reduce((acc, l) => acc + l.currentBalance, 0);

  const handleCreate = async () => {
    if (!name || !currentBalanceStr) {
      setErrorMsg("Informe o nome da dívida e o saldo devedor atual.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const orig = parseFloat(originalValueStr) || parseFloat(currentBalanceStr);
      const curr = parseFloat(currentBalanceStr);

      await createLiability({
        name,
        type: type as any,
        institution: institution || undefined,
        originalValue: orig,
        currentBalance: curr,
        associatedAssetId: associatedAssetId || undefined,
      });

      setIsAddOpen(false);
      setName("");
      setInstitution("");
      setOriginalValueStr("");
      setCurrentBalanceStr("");
      setAssociatedAssetId("");
      window.location.reload();
    } catch (err: any) {
      console.error("Erro ao criar dívida:", err);
      setErrorMsg(err.message || "Erro ao salvar passivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dívidas & Passivos</h1>
          <p className="text-xs text-muted-foreground">Financiamentos imobiliários, veiculares, empréstimos e parcelamentos</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all self-start sm:self-auto"
        >
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

      {/* State Vazio */}
      {liabilities.length === 0 ? (
        <div className="glass-card p-8 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
          <TrendingDown className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-white text-base">Nenhum passivo ou dívida cadastrado</h3>
          <p className="text-xs text-muted-foreground">
            Você não possui dívidas registradas no momento. Parabéns! Se possuir financiamentos ou empréstimos, cadastre-os acima.
          </p>
        </div>
      ) : (
        /* Cards de Dívidas */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liabilities.map((liab) => {
            const assetVal = liab.associatedAsset?.currentValue || 0;
            const equity = assetVal ? assetVal - liab.currentBalance : 0;

            return (
              <div key={liab.id} className="glass-card p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">{liab.name}</h3>
                    <p className="text-xs text-muted-foreground">{liab.institution || "Instituição financeira"}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 text-[11px] font-semibold">
                    {liab.typeLabel}
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
                      <span>Bem Associado: {liab.associatedAsset.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground pt-1">
                      <span>Valor do Bem: {formatCurrencyBRL(assetVal)}</span>
                      <span className="text-emerald-400 font-bold">Equity: {formatCurrencyBRL(equity)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Cadastrar Passivo */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white">Cadastrar Dívida / Passivo</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-xl text-muted-foreground hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Nome da Dívida</label>
              <input
                type="text"
                placeholder="ex: Financiamento Imobiliário CEF"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Instituição Credora</label>
              <input
                type="text"
                placeholder="ex: Caixa Econômica, Banco do Brasil"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Tipo de Passivo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
              >
                {LIABILITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Valor Original Contratado (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={originalValueStr}
                onChange={(e) => setOriginalValueStr(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Saldo Devedor Atual (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={currentBalanceStr}
                onChange={(e) => setCurrentBalanceStr(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-rose-400 focus:outline-none"
              />
            </div>

            {assets.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Vincular a um Bem Associado (opcional)</label>
                <select
                  value={associatedAssetId}
                  onChange={(e) => setAssociatedAssetId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="">-- Nenhum bem associado --</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !name || !currentBalanceStr}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/20"
              >
                {loading ? "Salvando..." : "Salvar Dívida"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
