'use client';

import React, { useState } from 'react';
import { BRAZILIAN_INSTITUTIONS_CATALOG, CatalogInstitutionItem } from '@/lib/services/institutions/institution-catalog';
import { Search, Building2, CheckCircle2 } from 'lucide-react';

export interface InstitutionSelectorProps {
  selectedName: string;
  onSelect: (institution: CatalogInstitutionItem) => void;
}

export function InstitutionSelector({ selectedName, onSelect }: InstitutionSelectorProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filtered = BRAZILIAN_INSTITUTIONS_CATALOG.filter((inst) => {
    const matchesSearch = inst.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || inst.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-3">
      {/* Campo de Busca */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar instituição brasileira (Itaú, Nubank, Sicoob, XP...)..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Filtro por Categoria */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-semibold scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory('ALL')}
          className={`px-2.5 py-1 rounded-lg transition-all flex-shrink-0 ${selectedCategory === 'ALL' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}
        >
          Todas
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('TRADITIONAL_BANK')}
          className={`px-2.5 py-1 rounded-lg transition-all flex-shrink-0 ${selectedCategory === 'TRADITIONAL_BANK' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}
        >
          Bancos Tradicionais
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('DIGITAL_BANK')}
          className={`px-2.5 py-1 rounded-lg transition-all flex-shrink-0 ${selectedCategory === 'DIGITAL_BANK' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}
        >
          Digitais / Fintechs
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('COOPERATIVE')}
          className={`px-2.5 py-1 rounded-lg transition-all flex-shrink-0 ${selectedCategory === 'COOPERATIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}
        >
          Cooperativas
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('BROKERAGE')}
          className={`px-2.5 py-1 rounded-lg transition-all flex-shrink-0 ${selectedCategory === 'BROKERAGE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}
        >
          Corretoras
        </button>
      </div>

      {/* Grid de Instituições Elegantes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-950 border border-slate-800 rounded-xl">
        {filtered.map((inst) => {
          const isSelected = selectedName === inst.name;
          return (
            <button
              key={inst.id}
              type="button"
              onClick={() => onSelect(inst)}
              className={`p-2.5 rounded-xl border text-left transition-all flex items-center space-x-2.5 ${isSelected ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-md' : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'}`}
            >
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${inst.color} text-slate-950 font-extrabold text-[10px] flex items-center justify-center flex-shrink-0 shadow-sm`}>
                {inst.badge}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate leading-tight">{inst.name}</div>
              </div>
              {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
