'use client';

import React, { useState } from 'react';
import {
  Search,
  X,
  FolderPlus,
  Tag,
  Check,
  ChevronRight,
  Utensils,
  Tv,
  Building2,
  Car,
  ShoppingBag,
  Landmark,
  HeartPulse,
  Home,
  Briefcase,
  Zap,
  Plus,
} from 'lucide-react';

export interface CategoryItem {
  id: string;
  name: string;
  parentId?: string | null;
  subcategories?: Array<{ id: string; name: string }>;
}

interface CategoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  selectedCategoryId?: string | null;
  selectedSubcategoryId?: string | null;
  onSelectCategory: (categoryId: string, subcategoryId?: string | null) => void;
  onCreateNewCategory?: (name: string, parentId?: string | null) => Promise<void>;
}

export function CategoryPickerModal({
  isOpen,
  onClose,
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  onSelectCategory,
  onCreateNewCategory,
}: CategoryPickerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingParent, setIsCreatingParent] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [addingSubForParentId, setAddingSubForParentId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Filtrar apenas as categorias principais (parentId === null ou sem parentId)
  const mainCategories = categories.filter((c) => !c.parentId);

  const getIconForCategory = (name: string) => {
    const norm = name.toLowerCase();
    if (norm.includes('aliment') || norm.includes('restaurante')) return <Utensils className="w-4 h-4 text-emerald-400" />;
    if (norm.includes('assinat') || norm.includes('stream')) return <Tv className="w-4 h-4 text-cyan-400" />;
    if (norm.includes('imóve') || norm.includes('predio')) return <Building2 className="w-4 h-4 text-purple-400" />;
    if (norm.includes('móve') || norm.includes('veícul') || norm.includes('carro')) return <Car className="w-4 h-4 text-amber-400" />;
    if (norm.includes('compra') || norm.includes('vestuá')) return <ShoppingBag className="w-4 h-4 text-rose-400" />;
    if (norm.includes('cota') || norm.includes('cooperat') || norm.includes('banc')) return <Landmark className="w-4 h-4 text-teal-400" />;
    if (norm.includes('saú') || norm.includes('farmá')) return <HeartPulse className="w-4 h-4 text-rose-400" />;
    if (norm.includes('mora') || norm.includes('casa')) return <Home className="w-4 h-4 text-blue-400" />;
    if (norm.includes('trabalh') || norm.includes('serviç')) return <Briefcase className="w-4 h-4 text-indigo-400" />;
    return <Tag className="w-4 h-4 text-slate-400" />;
  };

  const handleCreateParent = async () => {
    if (!newParentName.trim() || !onCreateNewCategory) return;
    setLoading(true);
    try {
      await onCreateNewCategory(newParentName.trim());
      setNewParentName('');
      setIsCreatingParent(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSub = async (parentId: string) => {
    if (!newSubName.trim() || !onCreateNewCategory) return;
    setLoading(true);
    try {
      await onCreateNewCategory(newSubName.trim(), parentId);
      setNewSubName('');
      setAddingSubForParentId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 md:p-6">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho do Modal Hierárquico */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Categorias Hierárquicas</h2>
            <p className="text-xs text-slate-400">Classificação organizada por grupos de despesas, receitas e investimentos</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsCreatingParent(true)}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Criar Categoria Principal</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Input de Pesquisa Rápida */}
        <div className="relative">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Pesquisar por categoria principal ou subcategoria (ex: Padaria, Restaurante, Streaming, Veículo...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
            autoFocus
          />
        </div>

        {/* Formulário de Criação de Categoria Principal */}
        {isCreatingParent && (
          <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-2xl space-y-2">
            <div className="text-xs font-bold text-emerald-400">Nova Categoria Principal</div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ex: Alimentação, Assinaturas, Veículos..."
                value={newParentName}
                onChange={(e) => setNewParentName(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleCreateParent}
                disabled={loading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingParent(false)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Grid de Cartões de Categorias Hierárquicas (Estilo Exato da Captura de Tela) */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mainCategories.map((parent) => {
              const subList = parent.subcategories || [];

              // Filtragem por busca
              const matchesSearch =
                searchTerm === '' ||
                parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                subList.some((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

              if (!matchesSearch) return null;

              const isParentSelected = parent.id === selectedCategoryId;

              return (
                <div
                  key={parent.id}
                  className={`bg-slate-950/80 border p-5 rounded-3xl space-y-3 transition-all flex flex-col justify-between ${
                    isParentSelected
                      ? 'border-emerald-500 bg-emerald-950/10 shadow-lg shadow-emerald-500/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Linha da Categoria Pai com Ícone */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory(parent.id, null);
                          onClose();
                        }}
                        className="flex items-center space-x-2.5 text-left group"
                      >
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-emerald-500/50 transition-colors">
                          {getIconForCategory(parent.name)}
                        </div>
                        <span className="font-extrabold text-white text-sm group-hover:text-emerald-400 transition-colors tracking-wide">
                          {parent.name}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAddingSubForParentId(parent.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-900 transition-colors"
                        title="Adicionar Subcategoria"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Formulário Inline de Nova Subcategoria */}
                    {addingSubForParentId === parent.id && (
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                        <input
                          type="text"
                          placeholder={`Nova subcategoria em ${parent.name}...`}
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                        <div className="flex justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setAddingSubForParentId(null)}
                            className="px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreateSub(parent.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] rounded-lg"
                          >
                            Salvar Subcategoria
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista de Subcategorias Indentadas */}
                    <div className="space-y-1 pl-1">
                      {subList.length === 0 ? (
                        <p className="text-[11px] text-slate-600 italic py-1">Nenhuma subcategoria cadastrada</p>
                      ) : (
                        subList.map((sub) => {
                          const isSubSelected = sub.id === selectedSubcategoryId;
                          const matchesSubSearch =
                            searchTerm === '' || sub.name.toLowerCase().includes(searchTerm.toLowerCase());

                          if (!matchesSubSearch) return null;

                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => {
                                onSelectCategory(parent.id, sub.id);
                                onClose();
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-all group ${
                                isSubSelected
                                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                                  : 'hover:bg-slate-900 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 flex-shrink-0" />
                                <span className="truncate">{sub.name}</span>
                              </div>
                              {isSubSelected && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
