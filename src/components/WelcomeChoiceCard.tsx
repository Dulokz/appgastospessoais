'use client';

import React from 'react';
import Link from 'next/link';
import { Upload, PlusCircle, Compass, ArrowRight, ShieldCheck } from 'lucide-react';

export interface WelcomeChoiceCardProps {
  onExplore: () => void;
}

export function WelcomeChoiceCard({ onExplore }: WelcomeChoiceCardProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-10 space-y-6 shadow-2xl max-w-2xl mx-auto text-slate-100 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Bem-vindo ao Aegis Riqueza</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Como você gostaria de começar?
        </h2>
        <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto">
          Escolha o caminho mais simples para você. Sem burocracia ou cadastros demorados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Escolha 1: Importar Extrato OFX */}
        <Link
          href="/importar"
          className="p-5 rounded-2xl bg-gradient-to-b from-purple-950/40 to-slate-950 border border-purple-500/30 hover:border-purple-500 text-left transition-all space-y-3 group hover:shadow-xl hover:shadow-purple-500/10 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white group-hover:text-purple-300 transition-colors">
                Importar Extrato OFX
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Carregue o arquivo do seu banco e nós criamos a conta e os lançamentos para você.
              </p>
            </div>
          </div>
          <div className="pt-2 flex items-center text-xs font-extrabold text-purple-400 group-hover:translate-x-1 transition-transform">
            <span>Importar Agora</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        {/* Escolha 2: Cadastrar Conta e Lançar Manualmente */}
        <Link
          href="/onboarding?step=account"
          className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-950 border border-emerald-500/30 hover:border-emerald-500 text-left transition-all space-y-3 group hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                Cadastrar Conta & Saldo
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Escolha seu banco, informe o saldo inicial e faça lançamentos manuais.
              </p>
            </div>
          </div>
          <div className="pt-2 flex items-center text-xs font-extrabold text-emerald-400 group-hover:translate-x-1 transition-transform">
            <span>Criar Conta</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        {/* Escolha 3: Explorar o App Primeiro */}
        <button
          type="button"
          onClick={onExplore}
          className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 text-left transition-all space-y-3 group hover:shadow-xl flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                Explorar o App Primeiro
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Navegue pelas telas, relatórios e menus antes de adicionar seus dados.
              </p>
            </div>
          </div>
          <div className="pt-2 flex items-center text-xs font-extrabold text-slate-300 group-hover:translate-x-1 transition-transform">
            <span>Ver Dashboard</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </button>
      </div>
    </div>
  );
}
