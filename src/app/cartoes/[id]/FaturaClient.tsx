"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CreditCard, X } from "lucide-react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { formatCurrencyBRL } from "@/lib/decimal";
import { payCreditCardInvoice } from "@/lib/actions/credit-card-invoice-actions";

type Purchase = { id: string; description: string; amount: number; date: string; category?: string | null };
type Payment = { id: string; amount: number; date: string; sourceAccountName: string };
type Invoice = { key: string; purchases: Purchase[]; payments: Payment[] };
type SourceAccount = { id: string; name: string; institution: string };

export function FaturaClient({ cardName, institution, invoices, sourceAccounts }: { cardName: string; institution: string; invoices: Invoice[]; sourceAccounts: SourceAccount[] }) {
  const [selectedKey, setSelectedKey] = useState(invoices[0]?.key || "");
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [sourceAccountId, setSourceAccountId] = useState(sourceAccounts[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const invoice = useMemo(() => invoices.find((item) => item.key === selectedKey), [invoices, selectedKey]);
  const total = invoice?.purchases.reduce((sum, item) => sum + item.amount, 0) || 0;
  const paid = invoice?.payments.reduce((sum, item) => sum + item.amount, 0) || 0;
  const outstanding = Math.max(0, total - paid);

  const pay = async () => {
    if (!selectedKey || !sourceAccountId) return setError("Selecione a conta que fará o pagamento.");
    setLoading(true); setError("");
    try {
      await payCreditCardInvoice({ cardId: (window as any).__cardId, sourceAccountId, invoiceKey: selectedKey, amount: Number(amount.replace(",", ".")), paymentDate });
      window.location.reload();
    } catch (err: any) {
      setError(err?.message || "Não foi possível pagar a fatura.");
    } finally { setLoading(false); }
  };

  return <div className="space-y-7">
    <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-semibold">Fatura do cartão</p><h1 className="text-3xl font-black text-white tracking-tight mt-1">{cardName}</h1><p className="text-sm text-muted-foreground mt-1">{institution} · compras e pagamentos reais registrados no sistema.</p></div>

    {invoices.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-muted-foreground">Ainda não há compras vinculadas a uma fatura. Registre uma compra no cartão para começar.</div> : <>
      <div className="flex gap-3 items-center"><label className="text-xs text-muted-foreground">Fatura</label><select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)} className="px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">{invoices.map((item) => <option key={item.key} value={item.key}>{item.key}</option>)}</select></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><p className="text-xs text-muted-foreground">Total da fatura</p><p className="text-2xl font-black text-white mt-2">{formatCurrencyBRL(total)}</p></div>
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.035] p-5"><p className="text-xs text-muted-foreground">Já pago</p><p className="text-2xl font-black text-emerald-400 mt-2">{formatCurrencyBRL(paid)}</p></div>
        <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.035] p-5"><p className="text-xs text-muted-foreground">Restante</p><p className="text-2xl font-black text-rose-400 mt-2">{formatCurrencyBRL(outstanding)}</p></div>
      </div>
      <div className="flex justify-end"><button disabled={outstanding <= 0} onClick={() => { setAmount(String(outstanding)); setError(""); setIsPayOpen(true); }} className="px-4 py-2.5 rounded-xl bg-emerald-500 disabled:opacity-40 text-xs font-black text-slate-950"><CheckCircle2 className="inline w-4 h-4 mr-1" />Pagar fatura</button></div>
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 space-y-3"><h2 className="font-bold text-white">Compras desta fatura</h2>{invoice?.purchases.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm py-3 border-t border-white/5"><div><p className="text-white">{item.description}</p><p className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString("pt-BR")}{item.category ? " · " + item.category : ""}</p></div><b className="text-white">{formatCurrencyBRL(item.amount)}</b></div>)}</section>
      {!!invoice?.payments.length && <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.025] p-5 space-y-3"><h2 className="font-bold text-emerald-300">Pagamentos</h2>{invoice.payments.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm py-2"><span className="text-slate-300">{new Date(item.date).toLocaleDateString("pt-BR")} · {item.sourceAccountName}</span><b className="text-emerald-300">{formatCurrencyBRL(item.amount)}</b></div>)}</section>}
    </>}

    {isPayOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"><div className="w-full max-w-md bg-slate-950 border border-white/10 rounded-3xl p-6 space-y-4"><div className="flex justify-between"><h2 className="font-bold text-white">Pagar fatura {selectedKey}</h2><button onClick={() => setIsPayOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div><div><label className="text-xs text-muted-foreground block mb-1">Pagar usando</label><select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">{sourceAccounts.map((account) => <option key={account.id} value={account.id}>{account.institution} — {account.name}</option>)}</select></div><div><label className="text-xs text-muted-foreground block mb-1">Valor do pagamento</label><CurrencyInput value={amount} onChangeValue={(_, raw) => setAmount(raw)} /></div><div><label className="text-xs text-muted-foreground block mb-1">Data do pagamento</label><input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" /></div>{error && <p className="text-xs text-rose-200">{error}</p>}<div className="flex justify-end gap-3"><button onClick={() => setIsPayOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">Cancelar</button><button disabled={loading} onClick={pay} className="px-4 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-slate-950">{loading ? "Pagando..." : "Confirmar pagamento"}</button></div></div></div>}
  </div>;
}
