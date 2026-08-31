'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListFilter, PlusCircle, PieChart, Menu } from 'lucide-react';
import { QuickAddTransactionModal } from './QuickAddTransactionModal';

export function BottomNavigation() {
  const pathname = usePathname();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 shadow-2xl">
        <div className="flex items-center justify-around">
          <Link
            href="/"
            className={`flex flex-col items-center py-1 px-3 text-[10px] font-semibold transition-all ${isActive('/') ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            Início
          </Link>

          <Link
            href="/transacoes/pendentes"
            className={`flex flex-col items-center py-1 px-3 text-[10px] font-semibold transition-all ${isActive('/transacoes/pendentes') ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ListFilter className="w-5 h-5 mb-0.5" />
            Fila / Triagem
          </Link>

          {/* Botão Central Primário de Lançamento Rápido */}
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="flex flex-col items-center justify-center -mt-5 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 p-3 rounded-full shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all"
            aria-label="Novo Lançamento Rápido"
          >
            <PlusCircle className="w-6 h-6 stroke-[2.5]" />
          </button>

          <Link
            href="/importar"
            className={`flex flex-col items-center py-1 px-3 text-[10px] font-semibold transition-all ${isActive('/importar') ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <PieChart className="w-5 h-5 mb-0.5" />
            Patrimônio
          </Link>

          <Link
            href="/importar"
            className={`flex flex-col items-center py-1 px-3 text-[10px] font-semibold transition-all ${isActive('/importar') ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            Mais
          </Link>
        </div>
      </nav>

      <QuickAddTransactionModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={() => {
          if (typeof window !== 'undefined') window.location.reload();
        }}
      />
    </>
  );
}
