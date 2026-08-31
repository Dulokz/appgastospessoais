"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  ShoppingBag,
  CreditCard,
  ArrowLeft,
  Building2,
} from "lucide-react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { createQuickTransactionV2, QuickFlow } from "@/lib/actions/quick-transaction-actions";
import { ASSET_CATEGORY_GROUPS, ASSET_CATEGORY_OPTIONS } from "@/lib/asset-categories";

interface QuickRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: { id: string; name: string; type: string; institutionName?: string | null }[];
  categories: { id: string; name: string }[];
}

const actions: { id: QuickFlow; title: string; subtitle: string; icon: any }[] = [
  { id: "GASTEI", title: "Gastei", subtitle: "Dinheiro, débito ou cartão", icon: TrendingDown },
  { id: "RECEBI", title: "Recebi", subtitle: "Salário, serviço ou outra entrada", icon: TrendingUp },
  { id: "TRANSFERI", title: "Transferi", subtitle: "Entre minhas contas", icon: ArrowRightLeft },
  { id: "COMPREI_BEM", title: "Comprei um bem", subtitle: "Transforma dinheiro ou crédito em patrimônio", icon: ShoppingBag },
  { id: "PAGUEI_FATURA", title: "Paguei uma fatura", subtitle: "Baixa conta e dívida do cartão sem nova despesa", icon: CreditCard },
];

export function QuickRegisterModal({ isOpen, onClose, accounts, categories }: QuickRegisterModalProps) {
  const [flow, setFlow] = useState<QuickFlow | null>(null);
  const [amount, setAmount] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destAccountId, setDestAccountId] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [description, setDescription] = useState("");
  const [treatAs, setTreatAs] = useState<"EXPENSE" | "ASSET">("ASSET");
  const [assetName, setAssetName] = useState("");
  const [assetCategory, setAssetCategory] = useState("TOOLS");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const normalAccounts = useMemo(() => accounts.filter((a) => a.type !== "CREDIT_CARD"), [accounts]);
  const cards = useMemo(() => accounts.filter((a) => a.type === "CREDIT_CARD"), [accounts]);

  useEffect(() => {
    if (!flow) return;
    if (flow === "PAGUEI_FATURA") {
      setSourceAccountId(normalAccounts[0]?.id || "");
      setDestAccountId(cards[0]?.id || "");
    } else if (flow === "TRANSFERI" || flow === "RECEBI") {
      setSourceAccountId(normalAccounts[0]?.id || "");
      setDestAccountId(normalAccounts[1]?.id || normalAccounts[0]?.id || "");
    } else {
      setSourceAccountId(accounts[0]?.id || "");
    }
  }, [flow, accounts, normalAccounts, cards]);

  if (!isOpen) return null;

  const reset = () => {
    setFlow(null);
    setAmount("");
    setDescription("");
    setAssetName("");
    setTreatAs("ASSET");
    setAssetCategory("TOOLS");
    setErrorMsg(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  async function save() {
    const parsed = Number(amount);
    if (!flow || !Number.isFinite(parsed) || parsed <= 0) {
      setErrorMsg("Informe um valor válido.");
      return;
    }
    if (!sourceAccountId) {
      setErrorMsg("Escolha a conta ou cartão.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await createQuickTransactionV2({
        flow,
        amount: parsed,
        sourceAccountId,
        destAccountId: flow === "TRANSFERI" || flow === "PAGUEI_FATURA" ? destAccountId : undefined,
        categoryId: flow === "GASTEI" || flow === "RECEBI" ? categoryId : undefined,
        description: description || assetName || "Movimentação",
        treatAs,
        assetName,
        assetCategory,
      });
      close();
      window.location.reload();
    } catch (e: any) {
      setErrorMsg(e?.message || "Não foi possível salvar a movimentação.");
    } finally {
      setLoading(false);
    }
  }

  const sourceOptions = flow === "RECEBI" || flow === "TRANSFERI" || flow === "PAGUEI_FATURA" ? normalAccounts : accounts;
  const destOptions = flow === "PAGUEI_FATURA" ? cards : normalAccounts;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-slate-950 border border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {flow && <button onClick={() => setFlow(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground"><ArrowLeft className="w-4 h-4" /></button>}
            <div><p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Lançamento rápido</p><h2 className="font-bold text-white">{flow ? actions.find(a => a.id === flow)?.title : "O que aconteceu?"}</h2></div>
          </div>
          <button onClick={close} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {!flow ? (
            <div className="space-y-2">
              {actions.map((action) => {
                const Icon = action.icon;
                const disabled = action.id === "PAGUEI_FATURA" && cards.length === 0;
                return (
                  <button key={action.id} disabled={disabled} onClick={() => setFlow(action.id)} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.025] hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed text-left transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><Icon className="w-5 h-5 text-emerald-400" /></div>
                    <div className="flex-1"><p className="text-sm font-bold text-white">{action.title}</p><p className="text-xs text-muted-foreground mt-0.5">{disabled ? "Cadastre um cartão em Contas primeiro" : action.subtitle}</p></div>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1.5">Valor</label>
                <CurrencyInput value={amount} onChangeValue={(_, raw) => setAmount(raw)} className="text-2xl font-bold py-3" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1.5">
                  {flow === "RECEBI" ? "Onde entrou?" : flow === "PAGUEI_FATURA" ? "De qual conta saiu o pagamento?" : "Conta ou cartão"}
                </label>
                <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">
                  {sourceOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.institutionName ? ` · ${a.institutionName}` : ""}
                      {a.type === "CREDIT_CARD" ? " · cartão" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {(flow === "TRANSFERI" || flow === "PAGUEI_FATURA") && (
                <div>
                  <label className="text-xs text-muted-foreground font-semibold block mb-1.5">{flow === "PAGUEI_FATURA" ? "Qual cartão foi pago?" : "Para qual conta?"}</label>
                  <select value={destAccountId} onChange={(e) => setDestAccountId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">
                    {destOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.institutionName ? ` · ${a.institutionName}` : ""}
                        {a.type === "CREDIT_CARD" ? " · cartão" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(flow === "GASTEI" || flow === "RECEBI") && categories.length > 0 && (
                <div><label className="text-xs text-muted-foreground font-semibold block mb-1.5">Categoria</label><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              )}

              {flow === "COMPREI_BEM" && (
                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <div><label className="text-xs text-muted-foreground font-semibold block mb-1.5">O que você comprou?</label><input value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Ex.: notebook, furadeira, câmera, Jetta..." className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setTreatAs("ASSET")} className={`p-3 rounded-xl border text-left ${treatAs === "ASSET" ? "border-emerald-500/50 bg-emerald-500/8" : "border-white/10"}`}><Building2 className="w-4 h-4 text-emerald-400" /><p className="text-xs font-bold text-white mt-2">Patrimônio</p><p className="text-[10px] text-muted-foreground mt-1">Conta/cartão diminui, bem aumenta.</p></button>
                    <button onClick={() => setTreatAs("EXPENSE")} className={`p-3 rounded-xl border text-left ${treatAs === "EXPENSE" ? "border-rose-500/50 bg-rose-500/8" : "border-white/10"}`}><TrendingDown className="w-4 h-4 text-rose-400" /><p className="text-xs font-bold text-white mt-2">Consumo</p><p className="text-[10px] text-muted-foreground mt-1">Entra como gasto do mês.</p></button>
                  </div>
                  {treatAs === "ASSET" && (
                    <div>
                      <label className="text-xs text-muted-foreground font-semibold block mb-1.5">Categoria patrimonial</label>
                      <select value={assetCategory} onChange={(e) => setAssetCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">
                        {ASSET_CATEGORY_GROUPS.map((group) => (
                          <optgroup key={group} label={group}>
                            {ASSET_CATEGORY_OPTIONS.filter((item) => item.group === group).map((item) => (
                              <option key={item.value} value={item.value}>{item.label}{item.examples ? ` — ${item.examples}` : ""}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {flow === "PAGUEI_FATURA" && (
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-xs text-muted-foreground">O gasto já foi reconhecido quando a compra foi lançada no cartão. Pagar a fatura apenas reduz o dinheiro da conta e a dívida do cartão.</div>
              )}

              <div><label className="text-xs text-muted-foreground font-semibold block mb-1.5">Descrição <span className="font-normal">(opcional)</span></label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: supermercado / fatura agosto" className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" /></div>

              {errorMsg && <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-300">{errorMsg}</div>}

              <button disabled={loading || !amount} onClick={save} className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-sm font-black text-slate-950">{loading ? "Salvando..." : "Salvar"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
