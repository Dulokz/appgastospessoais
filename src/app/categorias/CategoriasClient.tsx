"use client";

import { useState } from "react";
import {
  Plus,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Building,
  Car,
  FileCheck,
  Briefcase,
  Landmark,
  TrendingUp,
  Home,
  Utensils,
  HeartPulse,
  GraduationCap,
  Smile,
  Plane,
  ShoppingBag,
  Tv,
  FileText,
  Percent,
  Users,
  Dog,
  Gift,
  FolderPlus,
  Tags,
} from "lucide-react";
import { createCategory, updateCategory } from "@/lib/actions/db-actions";
import { archiveCategory } from "@/lib/actions/category-management-actions";

interface CategorySub {
  id: string;
  name: string;
}

interface CategoryParent {
  id: string;
  name: string;
  icon?: string | null;
  subcategories: CategorySub[];
}

interface CategoriasClientProps {
  initialCategories: CategoryParent[];
}

const ICON_MAP: Record<string, any> = {
  Building,
  Car,
  FileCheck,
  Briefcase,
  Landmark,
  TrendingUp,
  Home,
  Utensils,
  HeartPulse,
  GraduationCap,
  Smile,
  Plane,
  ShoppingBag,
  Tv,
  FileText,
  Percent,
  Users,
  Dog,
  Gift,
};

export function CategoriasClient({ initialCategories }: CategoriasClientProps) {
  const [categories, setCategories] = useState<CategoryParent[]>(initialCategories);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; parentId?: string | null } | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>(""); // empty for new top-level
  const [categoryName, setCategoryName] = useState<string>("");
  const [categoryIcon, setCategoryIcon] = useState<string>("Tags");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openCreateModal = (parentId: string = "") => {
    setEditingCategory(null);
    setSelectedParentId(parentId);
    setCategoryName("");
    setCategoryIcon(parentId ? "" : "Tags");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: { id: string; name: string; parentId?: string | null; icon?: string | null }) => {
    setEditingCategory(cat);
    setSelectedParentId(cat.parentId || "");
    setCategoryName(cat.name);
    setCategoryIcon(cat.icon || "Tags");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      setErrorMsg("O nome da categoria não pode estar vazio.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (editingCategory) {
        await updateCategory({
          id: editingCategory.id,
          name: categoryName,
          icon: categoryIcon || undefined,
        });
      } else {
        await createCategory({
          name: categoryName,
          parentId: selectedParentId || undefined,
          icon: categoryIcon || undefined,
        });
      }

      setIsModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      console.error("Erro ao salvar categoria:", err);
      setErrorMsg(err.message || "Erro ao salvar categoria.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) {
      try {
        await deleteCategory(id);
        window.location.reload();
      } catch (err: any) {
        alert("Erro ao excluir categoria: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Categorias Hierárquicas</h1>
          <p className="text-xs text-muted-foreground">
            Classificação completa de Bens Patrimoniais, Investimentos, Receitas e Despesas
          </p>
        </div>

        <button
          onClick={() => openCreateModal("")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Categoria Principal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const IconComponent = (cat.icon && ICON_MAP[cat.icon]) ? ICON_MAP[cat.icon] : Tags;

          return (
            <div key={cat.id} className="glass-card p-5 rounded-2xl space-y-3 relative group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">{cat.name}</h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openCreateModal(cat.id)}
                    title="Adicionar Subcategoria"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/10 transition-all"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal({ id: cat.id, name: cat.name, icon: cat.icon })}
                    title="Editar Categoria"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    title="Arquivar Categoria"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-1">
                {cat.subcategories.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic py-1">Nenhuma subcategoria cadastrada.</p>
                ) : (
                  cat.subcategories.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between text-xs text-slate-300 py-1.5 px-2.5 rounded-lg hover:bg-white/5 group/sub transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{sub.name}</span>
                      </div>

                      <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-1 transition-all">
                        <button
                          onClick={() => openEditModal({ id: sub.id, name: sub.name, parentId: cat.id })}
                          title="Editar Subcategoria"
                          className="p-1 text-slate-400 hover:text-cyan-400"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id, sub.name)}
                          title="Arquivar Subcategoria"
                          className="p-1 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Adicionar / Editar Categoria */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white">
                {editingCategory
                  ? `Editar ${editingCategory.parentId ? "Subcategoria" : "Categoria"}`
                  : selectedParentId
                  ? "Adicionar Subcategoria"
                  : "Criar Categoria Principal"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">
                Nome da Categoria / Subcategoria
              </label>
              <input
                type="text"
                placeholder="ex: Máquinas e Equipamentos, Bens Imóveis"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {!selectedParentId && !editingCategory?.parentId && (
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">
                  Categoria Pai (Deixe em branco para criar Categoria Principal)
                </label>
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="">-- Nenhuma (Categoria Principal) --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !categoryName.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-white shadow-lg shadow-emerald-500/20"
              >
                {loading ? "Salvando..." : "Salvar Categoria"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
