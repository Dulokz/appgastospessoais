"use client";

import { useState } from "react";
import { ShieldCheck, Plus } from "lucide-react";
import { QuickRegisterModal } from "@/components/transactions/QuickRegisterModal";

export function Header() {
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);

  const dummyAccounts = [
    { id: "1", name: "Banco do Brasil" },
    { id: "2", name: "Sicredi" },
    { id: "3", name: "Sicoob" },
    { id: "4", name: "Bradesco" },
    { id: "5", name: "XP Investimentos" },
  ];

  const dummyCategories = [
    { id: "cat-1", name: "Alimentação" },
    { id: "cat-2", name: "Moradia" },
    { id: "cat-3", name: "Transporte" },
    { id: "cat-4", name: "Lazer" },
    { id: "cat-5", name: "Saúde" },
    { id: "cat-6", name: "Salário" },
  ];

  const handleSaveQuickRegister = (data: any) => {
    console.log("Movimentação rápida salva:", data);
  };

  return (
    <>
      <header className="w-full h-16 border-b border-border glass-panel px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3 md:hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-base text-white">Aegis Riqueza</span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Controle Financeiro Diário Orientado a Patrimônio</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => setIsQuickRegisterOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar</span>
          </button>
        </div>
      </header>

      <QuickRegisterModal
        isOpen={isQuickRegisterOpen}
        onClose={() => setIsQuickRegisterOpen(false)}
        accounts={dummyAccounts}
        categories={dummyCategories}
        onSave={handleSaveQuickRegister}
      />
    </>
  );
}
