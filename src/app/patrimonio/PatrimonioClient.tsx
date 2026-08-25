"use client";

import { useState } from "react";
import { formatCurrencyBRL } from "@/lib/decimal";
import { createAssetWithEntryMethod } from "@/lib/actions/db-actions";
import { archiveAsset, updateAssetProfile } from "@/lib/actions/financial-record-management-actions";
import { CategorySelector } from "@/components/categories/CategorySelector";
import {
  Building,
  Plus,
  Car,
  Laptop,
  Briefcase,
  X,
  Building2,
  Pencil,
  Archive,
} from "lucide-react";

interface AssetData {
  id: string;
  name: string;
  category: string;
  entryMethod?: string;
  acquisitionValue: number;
  currentValue: number;
  considerInNetWorth: boolean;
}

interface PatrimonioClientProps {
  initialAssets: AssetData[];
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; subcategories: { id: string; name: string }[] }[];
}

export function PatrimonioClient({ initialAssets, accounts, categories }: PatrimonioClientProps) {
  const [assets] = useState<AssetData[]>(initialAssets);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Progressive Disclosure Form States
  const [entryMethod, setEntryMethod] = useState<
    "INITIAL_POSITION" | "PURCHASE_CASH" | "PURCHASE_FINANCED" | "DONATION_INHERITANCE" | "OTHER"
  >("INITIAL_POSITION");

  const [assetName, setAssetName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [currentValueStr, setCurrentValueStr] = useState("");
  
  // Para compra à vista ou entrada financiada
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || "");
  const [downPaymentStr, setDownPaymentStr] = useState("0");
  
  // Para compra financiada
  const [financedAmountStr, setFinancedAmountStr] = useState("0");
  const [institutionName, setInstitutionName] = useState("");
  const [notes, setNotes] = useState("");

  const totalPhysicalAssets = assets
    .filter((a) => a.considerInNetWorth)
    .reduce((acc, a) => acc + a.currentValue, 0);

  const handleRevalueAsset = async (asset: AssetData) => {
    const raw = prompt(`Novo valor de mercado para "${asset.name}"`, String(asset.currentValue));
    if (raw === null) return;
    const value = Number(raw.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return alert("Informe um valor válido.");
    try {
      await updateAssetProfile({ id: asset.id, name: asset.name, category: asset.category, currentValue: value, considerInNetWorth: asset.considerInNetWorth });
      window.location.reload();
    } catch (e: any) {
      alert(e.message || "Não foi possível reavaliar o bem.");
    }
  };

  const handleArchiveAsset = async (asset: AssetData) => {
    if (!confirm(`Arquivar "${asset.name}"? Ele deixará de compor o patrimônio atual, mas seu histórico será preservado.`)) return;
    try {
      await archiveAsset(asset.id);
      window.location.reload();
    } catch (e: any) {
      alert(e.message || "Não foi possível arquivar o bem.");
    }
  };

  const handleSaveAsset = async () => {
    if (!assetName.trim() || !currentValueStr) {
      setErrorMsg("Por favor, preencha o nome e o valor do bem.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const val = parseFloat(currentValueStr) || 0;
      const downPayment = parseFloat(downPaymentStr) || 0;
      const financed = parseFloat(financedAmountStr) || 0;

      await createAssetWithEntryMethod({
        name: assetName.trim(),
        category: selectedCategoryId || "OTHER",
        entryMethod,
        currentValue: val,
        sourceAccountId: (entryMethod === "PURCHASE_CASH" || (entryMethod === "PURCHASE_FINANCED" && downPayment > 0)) ? sourceAccountId : undefined,
        downPaymentAmount: downPayment,
        financedAmount: financed,
        institutionName,
        notes,
      });

      setIsModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      console.error("Erro ao cadastrar bem:", err);
      setErrorMsg(err.message || "Erro ao cadastrar o bem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bens Patrimoniais</h1>
          <p className="text-xs text-muted-foreground">Imóveis, veículos, equipamentos e participações patrimoniais</p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Cadastrar Bem</span>
        </button>
      </div>

      {/* Card de Resumo */}
      <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-500/20 text-purple-400">
            <Building className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total em Bens Patrimoniais</p>
            <h2 className="text-3xl font-black text-white">{formatCurrencyBRL(totalPhysicalAssets)}</h2>
          </div>
        </div>
      </div>

      {/* Grid de Ativos */}
      {assets.length === 0 ? (
        <div className="glass-card p-8 rounded-2xl text-center space-y-3">
          <p className="font-bold text-white text-base">Nenhum bem patrimonial cadastrado</p>
          <p className="text-xs text-muted-foreground">
            Clique em <strong className="text-emerald-400">+ Cadastrar Bem</strong> para incluir seus veículos, imóveis e equipamentos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((asset) => (
            <div key={asset.id} className="glass-card p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                    {asset.category.includes("VEHICLE") ? (
                      <Car className="w-5 h-5" />
                    ) : asset.category.includes("EQUIPMENT") ? (
                      <Laptop className="w-5 h-5" />
                    ) : asset.category.includes("CORPORATE") ? (
                      <Briefcase className="w-5 h-5" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{asset.name}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {asset.entryMethod === "INITIAL_POSITION"
                        ? "Posição Inicial Preexistente"
                        : asset.entryMethod === "PURCHASE_CASH"
                        ? "Comprado à vista"
                        : asset.entryMethod === "PURCHASE_FINANCED"
                        ? "Comprado financiado"
                        : "Entrada por doação/outra"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => handleRevalueAsset(asset)} title="Reavaliar bem" className="p-2 rounded-xl bg-cyan-500/10 text-cyan-300"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleArchiveAsset(asset)} title="Arquivar bem" className="p-2 rounded-xl bg-rose-500/10 text-rose-300"><Archive className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Valor de Mercado Atual</p>
                  <p className="text-base font-bold text-white">{formatCurrencyBRL(asset.currentValue)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastro de Bem com Progressive Disclosure */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white">Cadastrar Bem Patrimonial</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-xl text-muted-foreground hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Passo 1: Pergunta inicial de Progressive Disclosure */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white block">Como este bem entrou no seu patrimônio?</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setEntryMethod("INITIAL_POSITION")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    entryMethod === "INITIAL_POSITION"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <p className="text-xs font-bold">1. Eu já possuía este bem</p>
                  <p className="text-[10px] text-muted-foreground">Adicionar posição atual sem movimentar meu caixa.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryMethod("PURCHASE_CASH")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    entryMethod === "PURCHASE_CASH"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <p className="text-xs font-bold">2. Comprei agora à vista</p>
                  <p className="text-[10px] text-muted-foreground">Retirar o valor total de uma conta bancária.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryMethod("PURCHASE_FINANCED")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    entryMethod === "PURCHASE_FINANCED"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <p className="text-xs font-bold">3. Comprei financiado</p>
                  <p className="text-[10px] text-muted-foreground">Entrada da conta bancária + Saldo financiado em dívida.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryMethod("DONATION_INHERITANCE")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    entryMethod === "DONATION_INHERITANCE"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <p className="text-xs font-bold">4. Recebi por doação / herança</p>
                  <p className="text-[10px] text-muted-foreground">Entrada no patrimônio sem movimentação financeira.</p>
                </button>
              </div>
            </div>

            {/* Passo 2: Campos condicionais com base na opção selecionada */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Descrição / Nome do Bem</label>
                <input
                  type="text"
                  placeholder="ex: Toyota Corolla 2023, Apartamento Jardins, Jetta"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Categoria Patrimonial (Hierárquica)</label>
                <CategorySelector
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={(id) => setSelectedCategoryId(id)}
                  placeholder="Buscar categoria (ex: Veículos, Imóveis)..."
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Valor Total de Mercado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={currentValueStr}
                  onChange={(e) => setCurrentValueStr(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Seletor de Conta Bancária: EXIBIDO SOMENTE PARA COMPRA À VISTA OU ENTRADA FINANCIADA */}
              {entryMethod === "PURCHASE_CASH" && (
                <div>
                  <label className="text-xs text-muted-foreground font-semibold block mb-1">De qual conta bancária saiu o valor?</label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {entryMethod === "PURCHASE_FINANCED" && (
                <div className="space-y-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold block mb-1">Valor da Entrada (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={downPaymentStr}
                      onChange={(e) => setDownPaymentStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                    />
                  </div>

                  {parseFloat(downPaymentStr) > 0 && (
                    <div>
                      <label className="text-xs text-muted-foreground font-semibold block mb-1">De qual conta saiu a entrada?</label>
                      <select
                        value={sourceAccountId}
                        onChange={(e) => setSourceAccountId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-muted-foreground font-semibold block mb-1">Valor Financiado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={financedAmountStr}
                      onChange={(e) => setFinancedAmountStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-rose-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground font-semibold block mb-1">Banco / Credor do Financiamento</label>
                    <input
                      type="text"
                      placeholder="ex: Caixa Econômica, Santander"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">
                Cancelar
              </button>
              <button
                onClick={handleSaveAsset}
                disabled={loading || !assetName.trim() || !currentValueStr}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-white shadow-lg shadow-emerald-500/20"
              >
                {loading ? "Salvando..." : "Salvar Bem"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
