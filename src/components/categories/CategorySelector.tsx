"use client";

import { useState, useMemo } from "react";
import { Search, ChevronRight, Check, Tag } from "lucide-react";

export interface FlatCategoryItem {
  id: string;
  name: string;
  parentId?: string | null;
  parentName?: string | null;
  fullPath: string;
  isLeaf: boolean;
}

interface CategorySelectorProps {
  categories: {
    id: string;
    name: string;
    subcategories: { id: string; name: string }[];
  }[];
  selectedCategoryId: string;
  onSelectCategory: (id: string, fullPath: string) => void;
  requireLeaf?: boolean;
  placeholder?: string;
}

export function CategorySelector({
  categories,
  selectedCategoryId,
  onSelectCategory,
  requireLeaf = true,
  placeholder = "Buscar categoria...",
}: CategorySelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Flatten hierarchical categories into a searchable leaf list with breadcrumbs
  const flatList: FlatCategoryItem[] = useMemo(() => {
    const list: FlatCategoryItem[] = [];

    for (const parent of categories) {
      if (parent.subcategories && parent.subcategories.length > 0) {
        // Parent synthetic category (group header)
        if (!requireLeaf) {
          list.push({
            id: parent.id,
            name: parent.name,
            fullPath: parent.name,
            isLeaf: false,
          });
        }

        for (const sub of parent.subcategories) {
          list.push({
            id: sub.id,
            name: sub.name,
            parentId: parent.id,
            parentName: parent.name,
            fullPath: `${parent.name} > ${sub.name}`,
            isLeaf: true,
          });
        }
      } else {
        // Standalone leaf category
        list.push({
          id: parent.id,
          name: parent.name,
          fullPath: parent.name,
          isLeaf: true,
        });
      }
    }

    return list;
  }, [categories, requireLeaf]);

  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return flatList;
    const term = searchTerm.toLowerCase().trim();
    return flatList.filter((item) => item.fullPath.toLowerCase().includes(term));
  }, [flatList, searchTerm]);

  const selectedItem = useMemo(() => {
    return flatList.find((item) => item.id === selectedCategoryId);
  }, [flatList, selectedCategoryId]);

  return (
    <div className="relative w-full">
      {/* Botão Seletor com Breadcrumb */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-left text-white flex items-center justify-between hover:bg-slate-700/80 transition-all"
      >
        <div className="flex items-center gap-2 truncate">
          <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
          {selectedItem ? (
            <span className="font-semibold text-emerald-300 truncate">{selectedItem.fullPath}</span>
          ) : (
            <span className="text-muted-foreground">Selecione uma categoria...</span>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>

      {/* Popover / Dropdown de Busca e Árvore */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full glass-panel bg-slate-900 border border-white/15 rounded-2xl p-3 shadow-2xl space-y-3 max-h-72 flex flex-col">
          {/* Campo de Busca por Texto */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          {/* Lista Filtrada de Categorias Analíticas */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma categoria encontrada.</p>
            ) : (
              filteredList.map((item) => {
                const isSelected = item.id === selectedCategoryId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory(item.id, item.fullPath);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="truncate">
                      {item.parentName ? (
                        <span>
                          <span className="text-slate-400 font-normal">{item.parentName} &gt; </span>
                          <span className="font-semibold text-white">{item.name}</span>
                        </span>
                      ) : (
                        <span className="font-semibold text-white">{item.name}</span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
