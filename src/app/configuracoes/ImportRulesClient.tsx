"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { deleteImportClassificationRule, saveImportClassificationRule } from "@/lib/actions/import-classification-rule-actions";

type Account = { id: string; name: string; institutionName: string | null };
type Rule = { id: string; matchText: string; action: string; counterpartAccountId: string | null; counterpartName: string | null };
const presets = [
  { name: "Resgate da poupança BB", matchText: "RESGATE POUPANCA", action: "TRANSFER_IN" as const, label: "Entrada · escolher origem" },
  { name: "Aplicação Ourocap", matchText: "OUROCAP", action: "TRANSFER_OUT" as const, label: "Saída · escolher destino" },
  { name: "Aplicação BB RF LP High", matchText: "RF LP HIGH", action: "TRANSFER_OUT" as const, label: "Saída · escolher destino" },
];

export function ImportRulesClient({ accounts, rules }: { accounts: Account[]; rules: Rule[] }) {
  const [drafts, setDrafts] = useState(presets.map((item) => ({ ...item, counterpartAccountId: "" })));
  const [saving, setSaving] = useState<string | null>(null);
  const save = async (draft: typeof drafts[number]) => { if (!draft.counterpartAccountId) return; setSaving(draft.name); try { await saveImportClassificationRule(draft); setDrafts((items) => items.filter((item) => item.name !== draft.name)); } finally { setSaving(null); } };
  return <section className="glass-card max-w-4xl rounded-2xl p-6 space-y-4"><div><h2 className="text-lg font-bold text-white">Regras de importação</h2><p className="mt-1 text-xs text-muted-foreground">Configure uma vez. No OFX do BB, créditos usam origem; débitos usam destino. Não são receita nem despesa.</p></div>
    <div className="space-y-2">{drafts.map((draft) => <div key={draft.name} className="grid gap-2 rounded-xl border border-white/10 bg-white/[.03] p-3 md:grid-cols-[1fr_1fr_160px_1.3fr_auto] md:items-center"><span className="text-sm font-semibold text-white">{draft.name}</span><input value={draft.matchText} onChange={(e) => setDrafts((items) => items.map((item) => item.name === draft.name ? { ...item, matchText: e.target.value } : item))} className="rounded-lg bg-slate-900 px-2 py-2 text-xs text-cyan-100"/><span className="text-xs font-bold text-violet-200">{draft.label}</span><select value={draft.counterpartAccountId} onChange={(e) => setDrafts((items) => items.map((item) => item.name === draft.name ? { ...item, counterpartAccountId: e.target.value } : item))} className="rounded-lg bg-slate-900 px-2 py-2 text-xs text-white"><option value="">Selecione a conta/aplicação...</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.institutionName ? `${account.institutionName} · ` : ""}{account.name}</option>)}</select><button disabled={!draft.counterpartAccountId || saving === draft.name} onClick={() => save(draft)} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">{saving === draft.name ? "Salvando" : "Confirmar"}</button></div>)}</div>
    {rules.length > 0 && <div className="border-t border-white/10 pt-4 space-y-2"><p className="text-xs font-bold text-slate-300">Regras ativas</p>{rules.map((rule) => <div key={rule.id} className="flex items-center justify-between rounded-xl bg-white/[.03] px-3 py-2 text-xs"><span className="text-white">“{rule.matchText}” · {rule.action === "TRANSFER_IN" ? "origem" : "destino"}: <b>{rule.counterpartName}</b></span><button onClick={() => deleteImportClassificationRule(rule.id)} title="Excluir regra" className="text-rose-300"><Trash2 className="h-4 w-4"/></button></div>)}</div>}
  </section>;
}
