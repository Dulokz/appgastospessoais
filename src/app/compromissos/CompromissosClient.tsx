"use client";

import { useState } from "react";
import { Check, CreditCard, Plus, Repeat2, X } from "lucide-react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { formatCurrencyBRL } from "@/lib/decimal";
import { confirmScheduledCommitment, createInstallmentCommitment, createRecurringCommitment, skipScheduledCommitment } from "@/lib/actions/scheduled-commitment-actions";

type Account = { id: string; name: string; type: string; institution: string };
type Category = { id: string; label: string };
type Commitment = { id: string; description: string; amount: number; dueDate: string; accountName: string; institution: string; categoryName?: string | null; sourceType: string; installmentNumber?: number | null; totalInstallments?: number | null };

export function CompromissosClient({ accounts, categories, initialCommitments }: { accounts: Account[]; categories: Category[]; initialCommitments: Commitment[] }) {
  const [commitments, setCommitments] = useState(initialCommitments);
  const [mode, setMode] = useState<"RECURRING" | "INSTALLMENT" | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [installments, setInstallments] = useState("3");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    const parsedAmount = Number(amount.replace(",", "."));
    if (!accountId) return setError("Cadastre uma conta ou cartão antes.");
    setLoading(true); setError("");
    try {
      if (mode === "RECURRING") await createRecurringCommitment({ accountId, categoryId: categoryId || undefined, description, amount: parsedAmount, firstDueDate });
      if (mode === "INSTALLMENT") await createInstallmentCommitment({ accountId, categoryId: categoryId || undefined, description, totalAmount: parsedAmount, installments: Number(installments), firstDueDate });
      window.location.reload();
    } catch (err: any) {
      setError(err?.message || "Não foi possível programar.");
    } finally { setLoading(false); }
  };

  const confirm = async (id: string) => {
    setLoading(true);
    try { await confirmScheduledCommitment(id); setCommitments((items) => items.filter((item) => item.id !== id)); }
    catch (err: any) { alert(err?.message || "Não foi possível confirmar."); }
    finally { setLoading(false); }
  };

  return <div className="space-y-7">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-semibold">Planejamento sem lançamento indevido</p><h1 className="text-3xl font-black text-white tracking-tight mt-1">Compromissos programados</h1><p className="text-sm text-muted-foreground mt-1">Assinaturas e parcelas aparecem antes do vencimento. Só entram no saldo quando você confirmar.</p></div>
      <div className="flex gap-2"><button onClick={() => { setError(""); setMode("RECURRING"); }} className="px-3 py-2.5 rounded-xl bg-white/5 text-xs font-bold text-white"><Repeat2 className="inline w-4 h-4 mr-1" />Recorrência</button><button onClick={() => { setError(""); setMode("INSTALLMENT"); }} className="px-3 py-2.5 rounded-xl bg-emerald-500 text-xs font-black text-slate-950"><Plus className="inline w-4 h-4 mr-1" />Compra parcelada</button></div>
    </div>
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] p-4 text-sm text-slate-200"><b className="text-cyan-300">Como funciona:</b> você cadastra uma vez; cada parcela ou mensalidade fica prevista e só entra no saldo quando confirmar.</div>
    {commitments.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-muted-foreground">Nada programado ainda. Comece por suas assinaturas ou uma compra parcelada.</div> :
      <div className="space-y-3">{commitments.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">{item.sourceType === "RECURRING" ? <Repeat2 className="w-5 h-5 text-cyan-300" /> : <CreditCard className="w-5 h-5 text-emerald-300" />}</div>
        <div className="flex-1"><h2 className="font-bold text-white text-sm">{item.description}</h2><p className="text-xs text-muted-foreground mt-1">{new Date(item.dueDate).toLocaleDateString("pt-BR")} · {item.institution} — {item.accountName}{item.categoryName ? " · " + item.categoryName : ""}{item.installmentNumber ? \` · \${item.installmentNumber}/\${item.totalInstallments}\` : ""}</p></div>
        <p className="font-black text-white">{formatCurrencyBRL(item.amount)}</p>
        <div className="flex gap-2"><button disabled={loading} onClick={() => skipScheduledCommitment(item.id).then(() => setCommitments((items) => items.filter((current) => current.id !== item.id)))} className="px-3 py-2 rounded-xl bg-white/5 text-xs text-slate-300">Pular</button><button disabled={loading} onClick={() => confirm(item.id)} className="px-3 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-slate-950"><Check className="inline w-4 h-4 mr-1" />Confirmar</button></div>
      </div>)}</div>}
    {mode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"><div className="w-full max-w-md bg-slate-950 border border-white/10 rounded-3xl p-6 space-y-4">
      <div className="flex justify-between border-b border-white/10 pb-3"><div><p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Programar</p><h2 className="font-bold text-white">{mode === "RECURRING" ? "Despesa recorrente" : "Compra parcelada"}</h2></div><button onClick={() => setMode(null)}><X className="w-5 h-5 text-slate-400" /></button></div>
      <div><label className="text-xs text-muted-foreground block mb-1">{mode === "RECURRING" ? "Assinatura ou conta" : "Compra"}</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={mode === "RECURRING" ? "Ex.: Netflix" : "Ex.: Notebook"} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" /></div>
      <div><label className="text-xs text-muted-foreground block mb-1">{mode === "RECURRING" ? "Será cobrado em" : "Cartão ou conta usada"}</label><select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">{accounts.map((account) => <option key={account.id} value={account.id}>{account.institution} — {account.name}{account.type === "CREDIT_CARD" ? " (cartão)" : ""}</option>)}</select></div>
      <div><label className="text-xs text-muted-foreground block mb-1">Categoria</label><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white"><option value="">Sem categoria por enquanto</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></div>
      <div><label className="text-xs text-muted-foreground block mb-1">{mode === "RECURRING" ? "Valor mensal" : "Valor total da compra"}</label><CurrencyInput value={amount} onChangeValue={(_, raw) => setAmount(raw)} /></div>
      {mode === "INSTALLMENT" && <div><label className="text-xs text-muted-foreground block mb-1">Número de parcelas</label><input type="number" min="2" max="120" value={installments} onChange={(e) => setInstallments(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" /></div>}
      <div><label className="text-xs text-muted-foreground block mb-1">{mode === "RECURRING" ? "Primeiro vencimento" : "Vencimento da primeira parcela"}</label><input type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" /></div>
      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
      <div className="flex justify-end gap-3 pt-2"><button onClick={() => setMode(null)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">Cancelar</button><button onClick={save} disabled={loading} className="px-5 py-2 rounded-xl bg-emerald-500 text-xs font-black text-slate-950">{loading ? "Salvando..." : "Programar"}</button></div>
    </div></div>}
  </div>;
}
