import { Tags, Plus, ChevronRight, Home, Utensils, Car, TrendingUp } from "lucide-react";

const categories = [
  {
    id: "1",
    name: "Moradia",
    icon: Home,
    subs: ["Aluguel", "Condomínio", "Energia", "Água", "Internet"],
  },
  {
    id: "2",
    name: "Alimentação",
    icon: Utensils,
    subs: ["Mercado", "Restaurante", "Delivery"],
  },
  {
    id: "3",
    name: "Transporte",
    icon: Car,
    subs: ["Combustível", "Manutenção", "Seguro"],
  },
  {
    id: "4",
    name: "Receitas",
    icon: TrendingUp,
    subs: ["Salário", "Honorários", "Dividendos"],
  },
];

export default function CategoriasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Categorias Hierárquicas</h1>
          <p className="text-xs text-muted-foreground">Classificação de receitas, despesas e investimentos</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Criar Categoria</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.id} className="glass-card p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">{cat.name}</h3>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-1">
                {cat.subs.map((sub, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 py-1 px-2 rounded-lg hover:bg-white/5">
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
