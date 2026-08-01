"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Building2,
  ArrowRightLeft,
  MoreHorizontal,
} from "lucide-react";
import { clsx } from "clsx";

const mobileItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Transações", href: "/transacoes", icon: ArrowRightLeft },
  { name: "Patrimônio", href: "/patrimonio", icon: Building2 },
  { name: "Contas", href: "/contas", icon: Wallet },
  { name: "Mais", href: "/relatorios", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border glass-panel flex items-center justify-around px-2 z-40">
      {mobileItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-col items-center justify-center w-14 py-1 rounded-xl text-[11px] font-medium transition-all duration-200",
              isActive ? "text-emerald-400 font-semibold" : "text-muted-foreground hover:text-white"
            )}
          >
            <Icon className={clsx("w-5 h-5 mb-0.5", isActive ? "text-emerald-400" : "text-muted-foreground")} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
