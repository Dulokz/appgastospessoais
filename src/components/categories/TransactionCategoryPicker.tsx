"use client";

import { Search, ChevronLeft, ChevronDown, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

export type TransactionCategory = { id: string; name: string; parentName?: string | null };
type Direction = "INCOME" | "EXPENSE";

const structuralRoots = new Set([
  "bens imoveis", "bens moveis", "intangiveis & propriedades",
  "participacao societaria", "cota capital & cooperativas", "investimentos & custodia",
]);

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function categoryLabel(categoryId: string, categories: TransactionCategory[]) {
  const category = categories.find((item) => item.id === categoryId);
  return category ? `${category.parentName ? `${category.parentName} › ` : ""}${category.name}` : "";
}

export function TransactionCategoryPicker({
  categories,
  value,
  direction,
  onChange,
  disabled = false,
  compact = false,
}: {
  categories: TransactionCategory[];
  value: string;
  direction: Direction;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pickerId = useId();
  const [parent, setParent] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const selected = categoryLabel(value, categories);

  const available = useMemo(() => {
    const roots = categories.filter((item) => !item.parentName);
    const incomeRoot = roots.find((item) => normalize(item.name) === "receitas");
    if (direction === "INCOME") {
      return incomeRoot ? categories.filter((item) => item.id === incomeRoot.id || item.parentName === incomeRoot.name) : [];
    }
    return categories.filter((item) => {
      const root = item.parentName || item.name;
      return normalize(root) !== "receitas" && !structuralRoots.has(normalize(root));
    });
  }, [categories, direction]);

  const roots = available.filter((item) => !item.parentName);
  const selectedParent = roots.find((item) => item.name === parent);
  const children = parent ? available.filter((item) => item.parentName === parent) : [];
  const matches = query.trim()
    ? available.filter((item) => `${item.parentName || ""} ${item.name}`.toLowerCase().includes(query.toLowerCase()))
    : [];

  const choose = (id: string) => { onChange(id); setOpen(false); setParent(null); setQuery(""); };
  const close = () => { setOpen(false); setParent(null); setQuery(""); };
  useEffect(() => {
    const onOtherPickerOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== pickerId) close();
    };
    window.addEventListener("transaction-category-picker-open", onOtherPickerOpen);
    return () => window.removeEventListener("transaction-category-picker-open", onOtherPickerOpen);
  }, [pickerId]);
  const toggle = () => setOpen((current) => {
    const next = !current;
    if (next) window.dispatchEvent(new CustomEvent("transaction-category-picker-open", { detail: pickerId }));
    return next;
  });

  return <div className="relative">
    <button type="button" disabled={disabled} onClick={toggle} className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs transition-colors ${selected ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-100" : "border-white/10 bg-slate-800 text-slate-300"} ${compact ? "py-2" : "py-2.5"} disabled:cursor-not-allowed disabled:opacity-40`}>
      <span className="truncate">{selected || (direction === "INCOME" ? "Classificar receita" : "Classificar despesa")}</span><ChevronDown className="h-3.5 w-3.5 shrink-0" />
    </button>

    {open && <div className="absolute right-0 z-30 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3">
        {parent ? <button type="button" onClick={() => setParent(null)} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"><ChevronLeft className="h-4 w-4" /></button> : <span className={`h-2 w-2 rounded-full ${direction === "INCOME" ? "bg-emerald-400" : "bg-rose-400"}`} />}
        <p className="flex-1 text-sm font-bold text-white">{parent || (direction === "INCOME" ? "Classificar receita" : "Classificar despesa")}</p>
        <button type="button" onClick={close} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="border-b border-white/10 p-3"><label className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-slate-400"><Search className="h-4 w-4" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar categoria" className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500" /></label></div>
      <div className="max-h-72 overflow-y-auto p-2">
        {query.trim() ? matches.map((item) => <button type="button" key={item.id} onClick={() => choose(item.id)} className="w-full rounded-xl px-3 py-2.5 text-left text-xs text-slate-200 hover:bg-cyan-500/10"><span className="font-semibold text-white">{item.parentName || item.name}</span>{item.parentName && <span className="text-slate-400"> › {item.name}</span>}</button>) : parent ? children.map((item) => <button type="button" key={item.id} onClick={() => choose(item.id)} className="w-full rounded-xl px-3 py-2.5 text-left text-xs text-slate-200 hover:bg-cyan-500/10">{item.name}</button>) : roots.map((item) => <button type="button" key={item.id} onClick={() => setParent(item.name)} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-xs font-semibold text-white hover:bg-white/5">{item.name}<ChevronDown className="h-3.5 w-3.5 -rotate-90 text-slate-500" /></button>)}
        {!query.trim() && parent && !children.length && <p className="p-3 text-xs text-slate-500">Nenhuma subcategoria cadastrada.</p>}
        {query.trim() && !matches.length && <p className="p-3 text-xs text-slate-500">Nenhuma categoria encontrada.</p>}
      </div>
      {value && <div className="border-t border-white/10 p-2"><button type="button" onClick={() => choose("")} className="w-full rounded-xl px-3 py-2 text-left text-xs text-slate-400 hover:bg-white/5">Limpar classificação</button></div>}
    </div>}
  </div>;
}
