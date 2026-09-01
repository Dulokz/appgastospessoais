"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Landmark,
  Plus,
  Receipt,
  MoreHorizontal,
} from "lucide-react";
import { clsx } from "clsx";

const mobileItems = [
  { name: "Início", href: "/", icon: Home },
  { name: "Patrimônio", href: "/meu-patrimonio", icon: Landmark },
  { name: "Lançar", href: "/transacoes", icon: Plus, primary: true },
  { name: "Mês", href: "/resultado-mes", icon: Receipt },
  { name: "Mais", href: "/relatorios", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] border-t border-border bg-background/95 backdrop-blur-xl flex items-center justify-around px-2 z-40 safe-area-pb">
      {mobileItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        if (item.primary) {
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-16 -mt-5">
              <span className="w-12 h-12 rounded-2xl bg-emerald-500 text-black flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Icon className="w-6 h-6" />
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 mt-1">{item.name}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-col items-center justify-center w-16 py-1 text-[10px] font-medium transition-colors",
              isActive ? "text-white" : "text-muted-foreground"
            )}
          >
            <Icon className={clsx("w-5 h-5 mb-1", isActive && "text-emerald-400")} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
