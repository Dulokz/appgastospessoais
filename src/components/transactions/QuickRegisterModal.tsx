"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  ShoppingBag,
  Building,
} from "lucide-react";
import { createQuickTransaction } from "@/lib/actions/db-actions";

interface QuickRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  onSave?: (data: any) => void;
}

const ASSET_CATEGORIES = [
  { value: "REAL_ESTATE", label: "Imóvel" },
  { value: "VEHICLE", label: "Veículo" },
  { value: "EQUIPMENT", label: "Eletrônico / Equipamento" },
  { value: "CORPORATE_SHARE", label: "Participação societária" },
  { value: "OTHER", label: "Outro bem" },
];

export function QuickRegisterModal({
  isOpen,
  onClose,
  accounts,
  categories,
}: QuickRegisterModalProps) {
  const [flow, setFlow] = useState<"GASTEI" | "RECEBI" | "TRANSFERI" | "COMPREI_BEM" | null>(null);

  // Form states
  const [amount, setAmount] = useState<string>("");
  const [sourceAccountId, setSourceAccountId] = useState<string>(accounts[0]?.id || "");
  const [destAccountId, setDestAccountId] = useState<string>(accounts[1]?.id || accounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || "");
  const [description, setDescription] = useState<string>("");

  // Comprei um bem state
  const [treatAs, setTreatAs] = useState<"EXPENSE" | "ASSET">("ASSET");
  const [assetName, setAssetName] = useState<string>("");
  const [assetCategory, setAssetCategory] = useState<string>("EQUIPMENT");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (flow && amountInputRef.current) {
      amountInputRef.current.focus();
    }
  }, [flow]);

  if (!isOpen) return null;

  const handleReset = () => {
    setFlow(null);
    setAmount("");
    setDescription("");
    setAssetName("");
    setErrorMsg(null);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    const parsedAmount = parseFloat(amount);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Por favor, informe um valor válido maior que zero.");
      return;
    }

    if (flow === "TRANSFERI" && sourceAccountId === destAccountId) {
      setErrorMsg("A conta de origem e a conta de destino devem ser diferentes.");
      return;
    }

    setLoading(true);

    try {
      await createQuickTransaction({
        flow: flow!,
        amount: parsedAmount,
        sourceAccountId,
        destAccountId: flow === "TRANSFERI" ? destAccountId : undefined,
        categoryId: (flow === "GASTEI" || flow === "RECEBI") ? categoryId : undefined,
        description: description || assetName || (flow === "GASTEI" ? "Despesa" : flow === "RECEBI" ? "Receita" : "Transferência"),
        treatAs,
        assetName,
        assetCategory,
      });

      handleReset();
      onClose();
      window.location.reload();
    } catch (err: any) {
      console.error("Erro ao salvar transação rápida:", err);
      setErrorMsg(err.message || "Erro ao registrar a movimentação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg glass-panel bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-lg font-bold text-white">
            {flow === "GASTEI"
              ? "Gastei"
              : flow === "RECEBI"
              ? "Recebi"
              : flow === "TRANSFERI"
              ? "Transferi"
              : flow === "COMPREI_BEM"
              ? "Comprei um bem"
              : "+ Registrar Movimentação"}
          </h2>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1 rounded-xl text-muted-foreground hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Escolha Inicial de 4 Opções Grandes */}
        {!flow && (
          <div className="grid grid-cols-2 gap-4 py-2">
            <button
              onClick={() => setFlow("GASTEI")}
              className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 hover:border-rose-500 flex flex-col items-center justify-center gap-3 group transition-all"
            >
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 group-hover:scale-110 transition-all">
                <TrendingDown className="w-7 h-7" />
              </div>
              <span className="font-bold text-white text-base">Gastei</span>
              <span className="text-[11px] text-muted-foreground">Saída bancária de consumo</span>
            </button>

            <button
              onClick={() => setFlow("RECEBI")}
              className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 hover:border-emerald-500 flex flex-col items-center justify-center gap-3 group transition-all"
            >
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-all">
                <TrendingUp className="w-7 h-7" />
              </div>
              <span className="font-bold text-white text-base">Recebi</span>
              <span className="text-[11px] text-muted-foreground">Entrada de salário ou serviço</span>
            </button>

            <button
              onClick={() => setFlow("TRANSFERI")}
              className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 hover:border-purple-500 flex flex-col items-center justify-center gap-3 group transition-all"
            >
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-all">
                <ArrowRightLeft className="w-7 h-7" />
              </div>
              <span className="font-bold text-white text-base">Transferi</span>
              <span className="text-[11px] text-muted-foreground">Movimentação neutra entre contas</span>
            </button>

            <button
              onClick={() => setFlow("COMPREI_BEM")}
              className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 hover:border-cyan-500 flex flex-col items-center justify-center gap-3 group transition-all"
            >
              <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-all">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <span className="font-bold text-white text-base">Comprei um bem</span>
              <span className="text-[11px] text-muted-foreground">Aquisição de celular, carro ou imóvel</span>
            </button>
          </div>
        )}

        {/* Formulário do Fluxo Escolhido */}
        {flow && (
          <div className="space-y-4">
            {/* Valor */}
            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Valor (R$)</label>
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-2xl font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Conta Origem */}
            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">
                {flow === "RECEBI" ? "Em qual conta caiu?" : "De qual conta saiu?"}
              </label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Se for TRANSFERI: Conta Destino */}
            {flow === "TRANSFERI" && (
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Para qual conta foi?</label>
                <select
                  value={destAccountId}
                  onChange={(e) => setDestAccountId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Se for GASTEI ou RECEBI: Categoria */}
            {(flow === "GASTEI" || flow === "RECEBI") && categories.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Se for COMPREI UM BEM: Tratamento, Nome e Categoria do Bem */}
            {flow === "COMPREI_BEM" && (
              <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <label className="text-xs text-muted-foreground font-semibold block mb-1">Nome do Bem (ex: iPhone 15, Corolla)</label>
                  <input
                    type="text"
                    placeholder="Descrição do bem"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none"
                  />
                </div>

                {treatAs === "ASSET" && (
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold block mb-1">Categoria do Bem</label>
                    <select
                      value={assetCategory}
                      onChange={(e) => setAssetCategory(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
                    >
                      {ASSET_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs text-muted-foreground font-semibold block mb-2">Como deseja tratar essa aquisição?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTreatAs("ASSET")}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        treatAs === "ASSET"
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : "bg-white/5 border-white/10 text-muted-foreground"
                      }`}
                    >
                      <Building className="w-4 h-4" />
                      <span>Adicionar ao Patrimônio</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Impacto PL Inicial: R$ 0</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTreatAs("EXPENSE")}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        treatAs === "EXPENSE"
                          ? "bg-rose-500/20 border-rose-500 text-rose-400"
                          : "bg-white/5 border-white/10 text-muted-foreground"
                      }`}
                    >
                      <TrendingDown className="w-4 h-4" />
                      <span>Tratar como Gasto</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Reduz PL em R$ {amount || "0"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Descrição opcional */}
            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Descrição (opcional)</label>
              <input
                type="text"
                placeholder="ex: Mercado da semana"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none"
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setFlow(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || !amount}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-white shadow-lg shadow-emerald-500/20"
              >
                {loading ? "Salvando..." : "Salvar Movimentação"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
