"use client";

import { useState } from "react";
import { formatCurrencyBRL } from "@/lib/decimal";
import { AlertCircle, ArrowRight, Landmark, Plus, TrendingDown, X, Pencil, Archive } from "lucide-react";
import { registerNewCashLoan, registerPreexistingLiability } from "@/lib/actions/position-actions";
import { archiveLiability, updateLiabilityProfile } from "@/lib/actions/financial-record-management-actions";

interface LiabilityItem {
  id: string;
  name: string;
  institution?: string | null;
  type: string;
  typeLabel: string;
  originalValue: number;
  currentBalance: number;
  isInitialPosition: boolean;
}

interface OptionItem { id: string; name: string }

export function DividasClientV2({
  initialLiabilities,
  assets,
  accounts,
}: {
  initialLiabilities: LiabilityItem[];
  assets: OptionItem[];
  accounts: OptionItem[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"EXISTING" | "NEW_LOAN">("EXISTING");
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState("PERSONAL_LOAN");
  const [value, setValue] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [assetId, setAssetId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = initialLiabilities.reduce((sum, item) => sum + item.currentBalance, 0);

  async function editLiability(item: LiabilityItem) {
    const name = prompt("Nome da dívida", item.name);
    if (name === null || !name.trim()) return;
    const institution = prompt("Instituição/credor", item.institution || "") ?? "";
    let currentBalance: number | undefined;
    if (item.isInitialPosition) {
      const raw = prompt("Saldo devedor na data-base (posição inicial)", String(item.currentBalance));
      if (raw === null) return;
      currentBalance = Number(raw.replace(",", "."));
      if (!Number.isFinite(currentBalance) || currentBalance < 0) return alert("Informe um saldo válido.");
    }
    try {
      await updateLiabilityProfile({ id: item.id, name, institution, type: item.type, currentBalance });
      window.location.reload();
    } catch (e: any) { alert(e.message || "Não foi possível atualizar a dívida."); }
  }

  async function archive(item: LiabilityItem) {
    if (!confirm(`Arquivar "${item.name}"? Só é permitido quando o saldo estiver quitado.`)) return;
    try { await archiveLiability(item.id); window.location.reload(); }
    catch (e: any) { alert(e.message || "Não foi possível arquivar."); }
  }

  async function save() {
    const amount = Number(value);
    if (!name.trim() || !amount || amount <= 0) {
      setError("Informe o nome e o valor da dívida.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (mode === "EXISTING") {
        await registerPreexistingLiability({
          name,
          type,
          institution: institution || undefined,
          originalValue: Number(originalValue) || amount,
          currentBalance: amount,
          associatedAssetId: assetId || undefined,
        });
      } else {
        if (!accountId) throw new Error("Escolha a conta que recebeu o dinheiro do empréstimo.");
        await registerNewCashLoan({
          name,
          type,
          institution: institution || undefined,
          amount,
          destinationAccountId: accountId,
        });
      }
      window.location.reload();
    } catch (e: any) {
      setError(e.message || "Não foi possível salvar.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-semibold">Passivos</p>
          <h1 className="text-2xl font-bold text-white mt-1">Dívidas</h1>
          <p className="text-xs text-muted-foreground mt-1">Dívida antiga corrige a posição. Dívida nova precisa ter contrapartida.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-bold text-white">
          <Plus className="w-4 h-4" /> Registrar dívida
        </button>
      </div>

      <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-6">
        <p className="text-xs text-muted-foreground">Saldo devedor total</p>
        <p className="text-3xl font-black text-rose-400 mt-1">{formatCurrencyBRL(total)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialLiabilities.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.institution || item.typeLabel}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.isInitialPosition ? "bg-sky-500/10 text-sky-300" : "bg-white/5 text-muted-foreground"}`}>
                {item.isInitialPosition ? "POSIÇÃO INICIAL" : "MOVIMENTAÇÃO"}
              </span>
            </div>
            <div className="mt-5 pt-4 border-t border-white/8 flex items-end justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground">Saldo atual</p>
                <p className="text-xl font-bold text-rose-400">{formatCurrencyBRL(item.currentBalance)}</p>
              </div>
              <div className="flex gap-1"><button onClick={() => editLiability(item)} title="Editar dívida" className="p-2 rounded-xl bg-cyan-500/10 text-cyan-300"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => archive(item)} title="Arquivar dívida quitada" className="p-2 rounded-xl bg-rose-500/10 text-rose-300"><Archive className="w-3.5 h-3.5" /></button></div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Registrar dívida</h2>
                <p className="text-xs text-muted-foreground">Primeiro diga quando essa dívida entrou na sua vida financeira.</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-muted-foreground hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode("EXISTING")} className={`text-left rounded-2xl border p-4 ${mode === "EXISTING" ? "border-sky-500/50 bg-sky-500/10" : "border-white/10 bg-white/[0.02]"}`}>
                <Landmark className="w-5 h-5 text-sky-300" />
                <p className="text-sm font-bold text-white mt-3">Já existia</p>
                <p className="text-[11px] text-muted-foreground mt-1">Corrige o patrimônio. Não vira gasto nem mexe em conta.</p>
              </button>
              <button onClick={() => setMode("NEW_LOAN")} className={`text-left rounded-2xl border p-4 ${mode === "NEW_LOAN" ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-white/[0.02]"}`}>
                <ArrowRight className="w-5 h-5 text-emerald-300" />
                <p className="text-sm font-bold text-white mt-3">Empréstimo novo</p>
                <p className="text-[11px] text-muted-foreground mt-1">Dinheiro entra na conta e o passivo sobe junto.</p>
              </button>
            </div>

            {mode === "NEW_LOAN" && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                Financiamento de carro, imóvel ou equipamento deve ser registrado na compra do bem, não aqui.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da dívida" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white" />
              <input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Instituição" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white" />
              <select value={type} onChange={(e) => setType(e.target.value)} className="px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">
                <option value="PERSONAL_LOAN">Empréstimo pessoal</option>
                <option value="MORTGAGE">Financiamento imobiliário</option>
                <option value="VEHICLE_LOAN">Financiamento veicular</option>
                <option value="INSTALLMENT">Parcelamento</option>
                <option value="CREDIT_CARD">Cartão de crédito</option>
                <option value="OTHER">Outro</option>
              </select>
              <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === "EXISTING" ? "Saldo devedor atual" : "Valor recebido"} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white" />
            </div>

            {mode === "EXISTING" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="number" value={originalValue} onChange={(e) => setOriginalValue(e.target.value)} placeholder="Valor original (opcional)" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white" />
                <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">
                  <option value="">Sem bem associado</option>
                  {assets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            ) : (
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">
                <option value="">Conta que recebeu o dinheiro</option>
                {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            )}

            {error && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">{error}</div>}

            <button onClick={save} disabled={loading} className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 py-3 text-sm font-bold text-white">
              {loading ? "Salvando..." : mode === "EXISTING" ? "Adicionar como posição existente" : "Registrar empréstimo e entrada na conta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
