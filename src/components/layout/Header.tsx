"use client";

import { useState } from "react";
import { ShieldCheck, Plus } from "lucide-react";
import { QuickRegisterModal } from "@/components/transactions/QuickRegisterModal";

interface HeaderProps {
  accounts: { id: string; name: string; type: string; institutionName?: string | null }[];
  categories: { id: string; name: string }[];
}

export function Header({ accounts, categories }: HeaderProps) {
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);

  return (
    <>
      <header className="w-full h-16 border-b border-border bg-background/95 backdrop-blur px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3 md:hidden">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="font-bold text-base text-white">Aegis</span>
        </div>

        <div className="hidden md:block">
          <p className="text-xs font-semibold text-white">Controle financeiro orientado a patrimônio</p>
          <p className="text-[11px] text-muted-foreground">Registre o fato uma vez; o sistema cuida das contrapartidas.</p>
        </div>

        <button
          onClick={() => setIsQuickRegisterOpen(true)}
          disabled={accounts.length === 0}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-black transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar</span>
        </button>
      </header>

      <QuickRegisterModal
        isOpen={isQuickRegisterOpen}
        onClose={() => setIsQuickRegisterOpen(false)}
        accounts={accounts}
        categories={categories}
      />
    </>
  );
}
