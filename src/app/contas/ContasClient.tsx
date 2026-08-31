"use client";

import { useState } from "react";
import { formatCurrencyBRL } from "@/lib/decimal";
import { Plus, Scale, X, CreditCard, Pencil, Archive, Landmark, Banknote } from "lucide-react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { ReconcileModal } from "@/components/accounts/ReconcileModal";
import { createAccount, archiveAccount } from "@/lib/actions/db-actions";
import { correctAccountOpeningBalance } from "@/lib/actions/financial-record-management-actions";

interface AccountItem {
  id: string;
  name: string;
  institution: string;
  type: string;
  typeLabel: string;
  balance: number;
  initialBalance: number;
  confirmed: number;
  diff: number;
}

interface ContasClientProps {
  initialAccounts: AccountItem[];
}

const INSTITUTIONS_LIST = ["Banco do Brasil", "Sicredi", "Sicoob", "Bradesco", "Itaú", "Nubank", "Inter", "Santander", "Caixa", "XP Investimentos", "BTG Pactual", "Rico", "Clear", "Outra instituição"];

const ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Conta corrente" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "CASH", label: "Dinheiro / Carteira" },
  { value: "BROKERAGE", label: "Corretora" },
  { value: "CREDIT_CARD", label: "Cartão de crédito" },
];

const MONEY_ACCOUNT_TYPES = ["CHECKING", "SAVINGS", "CASH", "BROKERAGE"];

function parseBrazilianMoney(value: string | number) {
  const text = String(value).trim().replace(/[^0-9,.-]/g, "");
  if (!text) return 0;
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  const normalized = comma > dot ? text.replace(/\\./g, "").replace(",", ".") : dot > comma ? text.replace(/,/g, "") : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ContasClient({ initialAccounts }: ContasClientProps) {
  const [accounts, setAccounts] = useState<AccountItem[]>(initialAccounts);
  const [reconcileAccount, setReconcileAccount] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [institutionName, setInstitutionName] = useState(INSTITUTIONS_LIST[0]);
  const [customInstitution, setCustomInstitution] = useState("");
  const [type, setType] = useState("CHECKING");
  const [initialBalanceStr, setInitialBalanceStr] = useState("0");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [openingAdjustment, setOpeningAdjustment] = useState<AccountItem | null>(null);
  const [newOpeningBalance, setNewOpeningBalance] = useState("");

  // Esta tela é exclusivamente de caixa disponível. Produtos, cotas e carteiras
  // ficam em Investimentos, mesmo que pertençam à mesma instituição.
  const financialAccounts = accounts.filter((account) => MONEY_ACCOUNT_TYPES.includes(account.type));
  const cards = accounts.filter(a => a.type === "CREDIT_CARD");
  const availableBalance = financialAccounts.reduce((acc, a) => acc + Math.max(0, a.balance), 0);
  const cardDebt = cards.reduce((acc, a) => acc + Math.max(0, -a.balance), 0);
  const groupByInstitution = (items: AccountItem[]) => {
    const groups = new Map<string, AccountItem[]>();
    items.forEach((item) => groups.set(item.institution, [...(groups.get(item.institution) || []), item]));
    return [...groups.entries()].map(([institution, items]) => ({
      institution,
      items,
      liquidTotal: items.reduce((sum, item) => sum + item.balance, 0),
    })).sort((a, b) => a.institution.localeCompare(b.institution, "pt-BR"));
  };
  const financialGroups = groupByInstitution(financialAccounts);
  const cardGroups = groupByInstitution(cards);

  const handleCreate = async () => {
    const inst = institutionName === "Outra instituição" ? customInstitution.trim() : institutionName;
    if (!name.trim()) {
      setFormError("Informe um nome para identificar esta conta ou cartão.");
      return;
    }
    if (institutionName === "Outra instituição" && !inst) {
      setFormError("Informe o nome da instituição.");
      return;
    }

    setFormError("");
    setLoading(true);
    try {
      const typedValue = parseBrazilianMoney(initialBalanceStr);
      const initialBal = type === "CREDIT_CARD" ? -Math.abs(typedValue) : typedValue;
      await createAccount({ name, type: type as any, institutionName: inst, initialBalance: initialBal });
      setIsAddOpen(false);
      setName("");
      setInitialBalanceStr("0");
      window.location.reload();
    } catch (err: any) {
      setFormError(err?.message || "Não foi possível salvar. Tente novamente.");
    } finally { setLoading(false); }
  };

  const handleCorrectOpeningBalance = async () => {
    if (!openingAdjustment) return;
    const value = parseBrazilianMoney(newOpeningBalance);
    if (!newOpeningBalance.trim()) return alert("Informe um valor válido.");
    setLoading(true);
    try {
      await correctAccountOpeningBalance({ id: openingAdjustment.id, balance: value });
      window.location.reload();
    } catch (e: any) {
      alert(e.message || "Não foi possível corrigir.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Deseja arquivar este item?")) return;
    await archiveAccount(id);
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-semibold">Onde o dinheiro vive</p>
          <h1 className="text-3xl font-black text-white tracking-tight mt-1">Contas & cartões</h1>
          <p className="text-sm text-muted-foreground mt-1">Contas são ativos. Cartões são passivos e aparecem separadamente.</p>
        </div>
        <button onClick={() => { setFormError(""); setIsAddOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black self-start sm:self-auto"><Plus className="w-4 h-4" />Adicionar</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <p className="text-xs text-muted-foreground">Disponível em contas</p>
          <p className="text-3xl font-black text-white mt-2">{formatCurrencyBRL(availableBalance)}</p>
        </div>
        <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.035] p-5">
          <p className="text-xs text-muted-foreground">Dívida em cartões</p>
          <p className="text-3xl font-black text-rose-400 mt-2">{formatCurrencyBRL(cardDebt)}</p>
        </div>
      </div>

      <section className="space-y-4">
        <div><h2 className="text-sm font-bold text-white">Dinheiro disponível</h2><p className="text-xs text-muted-foreground">Somente contas em que você pode pagar, receber ou transferir dinheiro. Investimentos ficam na tela própria.</p></div>
        {financialAccounts.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-muted-foreground">Nenhuma conta cadastrada.</div> : (
          <div className="space-y-4">
            {financialGroups.map(group => (
              <div key={group.institution} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.025] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">{group.items.some(item => item.type === "CASH") ? <Banknote className="h-5 w-5 text-emerald-400" /> : <Landmark className="h-5 w-5 text-emerald-400" />}</div><div><h3 className="text-sm font-black text-white">{group.institution}</h3><p className="text-xs text-muted-foreground">{group.items.length} {group.items.length === 1 ? "conta" : "contas"} de dinheiro</p></div></div>
                  <div className="sm:text-right"><p className="text-[11px] text-muted-foreground">Disponível nesta instituição</p><p className={`text-lg font-black ${group.liquidTotal < 0 ? "text-rose-400" : "text-white"}`}>{formatCurrencyBRL(group.liquidTotal)}</p></div>
                </div>
                <div className="grid grid-cols-1 divide-y divide-white/8 md:grid-cols-2 md:divide-x md:divide-y-0">
                  {group.items.map(account => (
                    <div key={account.id} className="p-5">
                      <div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-bold text-white">{account.name}</h4><p className="mt-1 text-xs text-muted-foreground">{account.typeLabel}</p></div><div className="text-right"><p className="text-[11px] text-muted-foreground">Saldo calculado</p><p className={`mt-1 text-xl font-black ${account.balance < 0 ? "text-rose-400" : "text-white"}`}>{formatCurrencyBRL(account.balance)}</p></div></div>
                      <div className="mt-4 flex flex-wrap justify-end gap-2"><button onClick={() => { setOpeningAdjustment(account); setNewOpeningBalance(String(account.initialBalance)); }} title="Corrigir saldo inicial" className="p-2 rounded-xl bg-white/5 text-cyan-300"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => handleArchive(account.id)} title="Arquivar conta" className="p-2 rounded-xl bg-white/5 text-rose-300"><Archive className="w-3.5 h-3.5" /></button><button onClick={() => setReconcileAccount({ id: account.id, name: account.name, calculatedBalance: account.balance })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-emerald-400"><Scale className="w-3.5 h-3.5" />Conferir</button></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div><h2 className="text-sm font-bold text-white">Cartões de crédito</h2><p className="text-xs text-muted-foreground">Compras aumentam a dívida; pagar a fatura reduz a dívida sem gerar gasto novamente.</p></div>
        {cards.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-muted-foreground">Nenhum cartão cadastrado. Adicione um para lançar compras no crédito.</div> : (
          <div className="space-y-4">{cardGroups.map(group => <div key={group.institution} className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.025] p-5"><div className="mb-4 flex items-center gap-3 border-b border-white/8 pb-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10"><CreditCard className="h-5 w-5 text-rose-400" /></div><div><h3 className="text-sm font-black text-white">{group.institution}</h3><p className="text-xs text-muted-foreground">Cartões desta instituição</p></div></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{group.items.map(card => <div key={card.id} className="rounded-xl bg-white/[0.035] px-4 py-3"><p className="text-sm font-bold text-white">{card.name}</p><div className="mt-2 flex items-end justify-between"><p className="text-xs text-muted-foreground">Dívida registrada</p><p className="text-lg font-black text-rose-400">{formatCurrencyBRL(Math.max(0, -card.balance))}</p></div></div>)}</div></div>)}</div>
        )}
      </section>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3"><div><p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Cadastro</p><h2 className="font-bold text-white">Conta ou cartão</h2></div><button onClick={() => setIsAddOpen(false)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button></div>
            <div><label className="text-xs text-muted-foreground font-semibold block mb-1">Tipo</label><select value={type} onChange={e => { setType(e.target.value); setInitialBalanceStr("0"); }} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">{ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label className="text-xs text-muted-foreground font-semibold block mb-1">Instituição</label><select value={institutionName} onChange={e => setInstitutionName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">{INSTITUTIONS_LIST.map(i => <option key={i}>{i}</option>)}</select></div>
            {institutionName === "Outra instituição" && <input value={customInstitution} onChange={e => setCustomInstitution(e.target.value)} placeholder="Nome da instituição" className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" />}
            <div><label className="text-xs text-muted-foreground font-semibold block mb-1">Nome</label><input value={name} onChange={e => { setName(e.target.value); setFormError(""); }} placeholder={type === "CREDIT_CARD" ? "Ex.: BB Visa" : type === "INVESTMENT" || type === "BROKERAGE" ? "Ex.: Custódia Banco do Brasil" : "Ex.: Conta principal"} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" /><p className="text-[11px] text-muted-foreground mt-1">{type === "INVESTMENT" || type === "BROKERAGE" ? "Isto cria só a custódia. Depois, em Investimentos, cadastre cada fundo, CDB ou ação separadamente." : "Use um nome que diferencie esta conta das demais."}</p></div>
            {formError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{formError}</p>}
            <div><label className="text-xs text-muted-foreground font-semibold block mb-1">{type === "CREDIT_CARD" ? "Dívida atual já existente" : "Saldo inicial"}</label><CurrencyInput value={initialBalanceStr} onChangeValue={(_, raw) => setInitialBalanceStr(raw)} /><p className="text-[11px] text-muted-foreground mt-1">{type === "CREDIT_CARD" ? "Informe o valor positivo; o sistema registra como passivo." : "Use este campo como posição inicial/correção, não como receita."}</p></div>
            <div className="flex justify-end gap-3 pt-2"><button onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">Cancelar</button><button onClick={handleCreate} disabled={loading} className="px-5 py-2 rounded-xl bg-emerald-500 text-xs font-black text-slate-950">{loading ? "Salvando..." : "Salvar"}</button></div>
          </div>
        </div>
      )}

      {openingAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between"><div><p className="text-[11px] uppercase tracking-[0.14em] text-cyan-300">Correção de posição inicial</p><h2 className="font-bold text-white">{openingAdjustment.name}</h2></div><button onClick={() => setOpeningAdjustment(null)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3 text-xs text-slate-300">Este ajuste não cria receita nem despesa. Ele corrige o saldo existente na data-base do seu controle e recalcula o saldo atual pela diferença.</div>
            <div className="grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-white/5 p-3"><p className="text-muted-foreground">Saldo atual calculado</p><p className="font-bold text-white mt-1">{formatCurrencyBRL(openingAdjustment.balance)}</p></div><div className="rounded-xl bg-white/5 p-3"><p className="text-muted-foreground">Novo saldo inicial</p><p className="font-bold text-cyan-300 mt-1">{formatCurrencyBRL(parseBrazilianMoney(newOpeningBalance))}</p></div></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Saldo na data-base</label><CurrencyInput value={newOpeningBalance} onChangeValue={(_, raw) => setNewOpeningBalance(raw)} /></div>
            <div className="flex justify-end gap-2"><button onClick={() => setOpeningAdjustment(null)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">Cancelar</button><button disabled={loading} onClick={handleCorrectOpeningBalance} className="px-4 py-2 rounded-xl bg-cyan-500 text-xs font-bold text-slate-950">{loading ? "Corrigindo..." : "Confirmar correção"}</button></div>
          </div>
        </div>
      )}

      <ReconcileModal isOpen={!!reconcileAccount} onClose={() => setReconcileAccount(null)} account={reconcileAccount} onSaveCheck={() => {}} />
    </div>
  );
}
