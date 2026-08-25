"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Search, Tag } from "lucide-react";

interface CategorySelectorProps {
  categories: { id: string; name: string; subcategories: { id: string; name: string }[] }[];
  selectedCategoryId: string;
  onSelectCategory: (id: string, fullPath: string) => void;
  requireLeaf?: boolean;
  placeholder?: string;
}

export function CategorySelector({ categories, selectedCategoryId, onSelectCategory, requireLeaf = true, placeholder = "Buscar categoria..." }: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const selected = useMemo(() => {
    for (const parent of categories) {
      if (parent.id === selectedCategoryId) return { id: parent.id, path: parent.name, parentId: parent.id };
      const child = parent.subcategories.find((item) => item.id === selectedCategoryId);
      if (child) return { id: child.id, path: `${parent.name} › ${child.name}`, parentId: parent.id };
    }
    return null;
  }, [categories, selectedCategoryId]);

  const selectedParent = categories.find((item) => item.id === parentId);
  const query = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!query) return [];
    return categories.flatMap((parent) => [
      ...(!requireLeaf && parent.name.toLowerCase().includes(query) ? [{ id: parent.id, path: parent.name }] : []),
      ...parent.subcategories.filter((child) => `${parent.name} ${child.name}`.toLowerCase().includes(query)).map((child) => ({ id: child.id, path: `${parent.name} › ${child.name}` })),
    ]);
  }, [categories, query, requireLeaf]);

  const choose = (id: string, path: string) => { onSelectCategory(id, path); setIsOpen(false); setSearch(""); setParentId(null); };

  return <div className="relative w-full">
    <button type="button" onClick={() => { setIsOpen(!isOpen); setParentId(selected?.parentId || null); }} className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-left text-white flex items-center justify-between">
      <span className="flex items-center gap-2 truncate"><Tag className="w-4 h-4 text-emerald-400 shrink-0" />{selected ? <b className="text-emerald-300 truncate">{selected.path}</b> : <span className="text-muted-foreground">Selecione uma categoria...</span>}</span><ChevronRight className={`w-4 h-4 text-slate-400 ${isOpen ? "rotate-90" : ""}`} />
    </button>
    {isOpen && <div className="absolute z-50 mt-2 w-full bg-slate-900 border border-white/15 rounded-2xl p-3 shadow-2xl space-y-3 max-h-80 flex flex-col">
      <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" /><input value={search} onChange={(e) => { setSearch(e.target.value); setParentId(null); }} placeholder={placeholder} className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500" autoFocus /></div>
      {query ? <div className="overflow-y-auto space-y-1">{searchResults.map((item) => <button key={item.id} type="button" onClick={() => choose(item.id, item.path)} className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/5">{item.path}</button>)}{!searchResults.length && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma categoria encontrada.</p>}</div> :
      !selectedParent ? <div className="overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">{categories.map((parent) => <button key={parent.id} type="button" onClick={() => parent.subcategories.length ? setParentId(parent.id) : choose(parent.id, parent.name)} className="text-left p-3 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30"><span className="block text-xs font-bold text-white">{parent.name}</span><span className="block text-[10px] text-muted-foreground mt-1">{parent.subcategories.length ? `${parent.subcategories.length} subcategorias` : "Selecionar categoria"}</span></button>)}</div> :
      <div className="overflow-y-auto space-y-2"><button type="button" onClick={() => setParentId(null)} className="flex gap-1 items-center text-xs text-emerald-300"><ChevronLeft className="w-4 h-4" />Categorias principais</button><p className="text-sm font-bold text-white px-1">{selectedParent.name}</p>{!requireLeaf && <button type="button" onClick={() => choose(selectedParent.id, selectedParent.name)} className="w-full p-2 rounded-xl text-left text-xs text-slate-300 hover:bg-white/5">Usar apenas “{selectedParent.name}”</button>}{selectedParent.subcategories.map((child) => { const active=child.id===selectedCategoryId; return <button key={child.id} type="button" onClick={() => choose(child.id, `${selectedParent.name} › ${child.name}`)} className={`w-full flex justify-between text-left px-3 py-2.5 rounded-xl text-xs ${active ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-slate-200 hover:bg-white/10"}`}><span>{child.name}</span>{active && <Check className="w-4 h-4" />}</button>})}</div>}
    </div>}
  </div>;
}