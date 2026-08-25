"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  TrendingDown,
  ArrowRightLeft,
  Settings,
  ShieldCheck,
  Receipt,
  Landmark,
  TrendingUp,
  BarChart3,
  History,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { name: "Visão Geral", href: "/", icon: LayoutDashboard },
  { name: "Patrimônio", href: "/meu-patrimonio", icon: Landmark },
  { name: "Meu Mês", href: "/resultado-mes", icon: Receipt },
  { name: "Contas", href: "/contas", icon: Wallet },
  { name: "Cartões", href: "/cartoes", icon: CreditCard },
  { name: "Investimentos", href: "/investimentos", icon: TrendingUp },
  { name: "Dívidas", href: "/dividas", icon: TrendingDown },
  { name: "Transações", href: "/transacoes", icon: ArrowRightLeft },
  { name: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { name: "Corrigir posição inicial", href: "/ajustar-posicao-inicial", icon: History },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-border bg-background/95 p-4 z-30">
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-tight text-white">Aegis Riqueza</h1>
          <p className="text-xs text-muted-foreground font-medium">Painel Financeiro</p>
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
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/8 text-white border border-white/10"
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
        <div className="px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
          Um número principal por tela. Mais clareza, menos ruído.
        </div>
      </div>
    </aside>
  );
}
