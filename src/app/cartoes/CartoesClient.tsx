"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, CreditCard, Plus, X } from "lucide-react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { archiveAccount, createAccount } from "@/lib/actions/db-actions";
import { formatCurrencyBRL } from "@/lib/decimal";

type Card = {
  id: string;
  name: string;
  institution: string;
  balance: number;
  closingDay: number | null;
  dueDay: number | null;
};

const INSTITUTIONS = [
  "Banco do Brasil", "Sicredi", "Sicoob", "Bradesco", "Itaú", "Nubank",
  "Inter", "Santander", "Caixa", "XP Investimentos", "BTG Pactual",
  "Rico", "Clear", "Outra instituição",
];

export function CartoesClient({ initialCards }: { initialCards: Card[] }) {
  const [cards, setCards] = useState(initialCards);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState(INSTITUTIONS[0]);
  const [customInstitution, setCustomInstitution] = useState("");
  const [currentDebt, setCurrentDebt] = useState("0");
  const [closingDay, setClosingDay] = useState("25");
  const [dueDay, setDueDay] = useState("5");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const totalDebt = cards.reduce((sum, card) => sum + Math.max(0, -card.balance), 0);

  const createCard = async () => {
    const selectedInstitution = institution === "Outra instituição" ? customInstitution.trim() : institution;
    if (!name.trim()) return setError("Informe o nome do cartão.");
    if (!selectedInstitution) return setError("Informe a instituição emissora do cartão.");

    setLoading(true);
    setError("");
    try {
      await createAccount({
        name: name.trim(),
        type: "CREDIT_CARD",
        institutionName: selectedInstitution,
        initialBalance: -Math.abs(parseFloat(currentDebt) || 0),
        creditCardClosingDay: Number(closingDay),
        creditCardDueDay: Number(dueDay),
      });
      window.location.reload();
    } catch (err: any) {
      setError(err?.message || "Não foi possível cadastrar o cartão.");
    } finally {
      setLoading(false);
    }
  };

  const archiveCard = async (id: string) => {
    if (!confirm("Arquivar este cartão? O histórico será preservado.")) return;
    await archiveAccount(id);
    setCards((current) => current.filter((card) => card.id !== id));
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-semibold">Compras e faturas</p>
          <h1 className="text-3xl font-black text-white tracking-tight mt-1">Cartões de crédito</h1>
          <p className="text-sm text-muted-foreground mt-1">Cada cartão fica vinculado à instituição emissora. Compras aumentam a dívida; pagar a fatura não gera despesa novamente.</p>
        </div>
        <button onClick={() => { setError(""); setIsOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black self-start sm:self-auto"><Plus className="w-4 h-4" />Adicionar cartão</button>
      </div>

      <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.035] p-5 max-w-xl">
        <p className="text-xs text-muted-foreground">Dívida atual em cartões</p>
        <p className="text-3xl font-black text-rose-400 mt-2">{formatCurrencyBRL(totalDebt)}</p>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-muted-foreground">Nenhum cartão cadastrado. Adicione cada cartão uma única vez, escolhendo a instituição que o emitiu.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => (
            <div key={card.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-rose-400" /></div>
                <div className="flex-1"><h2 className="font-bold text-white">{card.name}</h2><p className="text-xs text-muted-foreground">Emitido por {card.institution} · fecha dia {card.closingDay || 25} · vence dia {card.dueDay || 5}</p></div>
                <button onClick={() => archiveCard(card.id)} title="Arquivar cartão" className="p-2 rounded-xl bg-white/5 text-rose-300"><Archive className="w-4 h-4" /></button>
              </div>
              <div className="mt-5 pt-3 border-t border-white/10 flex items-end justify-between"><div><p className="text-[11px] text-muted-foreground">Dívida registrada</p><p className="text-2xl font-black text-rose-400">{formatCurrencyBRL(Math.max(0, -card.balance))}</p></div><Link href={`/cartoes/${card.id}`} className="px-3 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-slate-950">Ver fatura</Link></div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3"><div><p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Cadastro</p><h2 className="font-bold text-white">Novo cartão</h2></div><button onClick={() => setIsOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <div><label className="text-xs text-muted-foreground font-semibold block mb-1">Instituição emissora</label><select value={institution} onChange={(e) => setInstitution(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">{INSTITUTIONS.map((item) => <option key={item}>{item}</option>)}</select></div>
            {institution === "Outra instituição" && <input value={customInstitution} onChange={(e) => setCustomInstitution(e.target.value)} placeholder="Nome da instituição" className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" />}
            <div><label className="text-xs text-muted-foreground font-semibold block mb-1">Nome do cartão</label><input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Ex.: Ourocard Visa, Nubank final 1234" className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-muted-foreground font-semibold block mb-1">Dia de fechamento</label><input type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" /></div><div><label className="text-xs text-muted-foreground font-semibold block mb-1">Dia de vencimento</label><input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" /></div></div>
            <div><label className="text-xs text-muted-foreground font-semibold block mb-1">Dívida atual existente</label><CurrencyInput value={currentDebt} onChangeValue={(_, raw) => setCurrentDebt(raw)} /><p className="text-[11px] text-muted-foreground mt-1">Informe o valor positivo. O sistema registra como passivo.</p></div>
            {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
            <div className="flex justify-end gap-3 pt-2"><button onClick={() => setIsOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">Cancelar</button><button onClick={createCard} disabled={loading} className="px-5 py-2 rounded-xl bg-emerald-500 text-xs font-black text-slate-950">{loading ? "Salvando..." : "Salvar cartão"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
