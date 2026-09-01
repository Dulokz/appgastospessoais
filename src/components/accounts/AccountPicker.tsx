"use client";

import { Building2, Check, ChevronDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

export type SelectableAccount = { id: string; name: string; type: string; institutionName?: string | null };

export function AccountPicker({
  accounts,
  value,
  onChange,
  placeholder = "Escolher conta...",
  disabled = false,
}: {
  accounts: SelectableAccount[];
  value: string;
  onChange: (accountId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = accounts.find((account) => account.id === value);
  const label = (account: SelectableAccount) => `${account.name}${account.institutionName ? ` · ${account.institutionName}` : ""}`;
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return term ? accounts.filter((account) => label(account).toLocaleLowerCase("pt-BR").includes(term)) : accounts;
  }, [accounts, query]);

  const choose = (accountId: string) => {
    onChange(accountId);
    setOpen(false);
    setQuery("");
  };

  return <div className="relative">
    <button type="button" disabled={disabled} onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-left text-xs text-violet-50 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40">
      <span className="truncate">{selected ? label(selected) : placeholder}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 text-violet-200" />
    </button>

    {open && <div className="absolute right-0 z-40 mt-2 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-violet-400/25 bg-slate-950 shadow-2xl shadow-black/60">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3">
        <Building2 className="h-4 w-4 text-violet-300" /><p className="flex-1 text-sm font-bold text-white">Conta de origem</p>
        <button type="button" onClick={() => { setOpen(false); setQuery(""); }} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="border-b border-white/10 p-3"><label className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-slate-400"><Search className="h-4 w-4" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar conta ou instituição" className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500" /></label></div>
      <div className="max-h-72 overflow-y-auto p-2">
        {visible.map((account) => <button type="button" key={account.id} onClick={() => choose(account.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs text-slate-200 hover:bg-violet-500/10">
          <Building2 className="h-4 w-4 shrink-0 text-violet-300" />
          <span className="flex-1"><span className="block font-semibold text-white">{account.name}</span>{account.institutionName && <span className="text-[11px] text-slate-400">{account.institutionName}</span>}</span>
          {account.id === value && <Check className="h-4 w-4 text-emerald-300" />}
        </button>)}
        {!visible.length && <p className="p-3 text-xs text-slate-500">Nenhuma conta encontrada.</p>}
      </div>
    </div>}
  </div>;
}
