"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Building2,
  TrendingDown,
  ArrowRightLeft,
  Tags,
  PieChart,
  Settings,
  ShieldCheck,
  Receipt,
  Landmark,
  TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Resultado do Mês", href: "/resultado-mes", icon: Receipt },
  { name: "Meu Patrimônio", href: "/meu-patrimonio", icon: Landmark },
  { name: "Carteira & Instituições", href: "/investimentos", icon: TrendingUp },
  { name: "Transações", href: "/transacoes", icon: ArrowRightLeft },
  { name: "Patrimônio (Bens)", href: "/patrimonio", icon: Building2 },
  { name: "Dívidas (Passivos)", href: "/dividas", icon: TrendingDown },
  { name: "Contas & Liquidez", href: "/contas", icon: Wallet },
  { name: "Categorias", href: "/categorias", icon: Tags },
  { name: "Por que mudou?", href: "/relatorios", icon: PieChart },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-border glass-panel p-4 z-30">
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-tight text-white">Aegis Riqueza</h1>
          <p className="text-xs text-muted-foreground font-medium">Gestão Patrimonial</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/10"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className={clsx("w-4 h-4", isActive ? "text-emerald-400" : "text-muted-foreground")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-border mt-auto">
        <div className="p-3.5 rounded-xl glass-card flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-sm">
            UP
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">Usuário Principal</p>
            <p className="text-[11px] text-muted-foreground truncate">usuario@patrimonio.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
