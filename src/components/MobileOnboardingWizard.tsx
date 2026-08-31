'use client';

import React, { useState } from 'react';
import { setupUserOnboardingAction } from '@/lib/actions/onboarding-actions';
import { BRAZILIAN_INSTITUTIONS_CATALOG, CatalogInstitutionItem } from '@/lib/services/institutions/institution-catalog';
import { BankLogo } from '@/components/BankLogo';
import {
  Calendar,
  Wallet,
  CheckCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check,
  Building,
  Upload,
  CalendarDays,
  Search,
  Plus,
} from 'lucide-react';

export interface MobileOnboardingWizardProps {
  onComplete: () => void;
}

export function MobileOnboardingWizard({ onComplete }: MobileOnboardingWizardProps) {
  const [step, setStep] = useState<number>(1);
  
  const [dateOption, setDateOption] = useState<'TODAY' | 'FIRST_OF_MONTH' | 'FIRST_OF_YEAR' | 'CUSTOM'>('CUSTOM');
  const [controlStartDate, setControlStartDate] = useState<string>('2025-01-01');

  const [selectedInst, setSelectedInst] = useState<CatalogInstitutionItem>(
    BRAZILIAN_INSTITUTIONS_CATALOG[0] // Banco do Brasil
  );
  const [isOtherSelected, setIsOtherSelected] = useState<boolean>(false);
  const [customBankName, setCustomBankName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [accountBalance, setAccountBalance] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const popularBanks = BRAZILIAN_INSTITUTIONS_CATALOG.filter((i) =>
    ['bb', 'itau', 'nubank', 'bradesco', 'santander', 'caixa', 'inter', 'c6', 'sicoob', 'xp'].includes(i.id)
  );

  const filteredAllInstitutions = BRAZILIAN_INSTITUTIONS_CATALOG.filter((inst) =>
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.badge.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDateOptionSelect = (option: 'TODAY' | 'FIRST_OF_MONTH' | 'FIRST_OF_YEAR' | 'CUSTOM', customVal?: string) => {
    setDateOption(option);
    if (option === 'TODAY') {
      setControlStartDate(new Date().toISOString().split('T')[0]);
    } else if (option === 'FIRST_OF_MONTH') {
      setControlStartDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    } else if (option === 'FIRST_OF_YEAR') {
      setControlStartDate(`${new Date().getFullYear()}-01-01`);
    } else if (option === 'CUSTOM' && customVal) {
      setControlStartDate(customVal);
    }
  };

  const handleFinishOnboarding = async () => {
    setSubmitting(true);
    setError(null);

    const targetBankName = isOtherSelected ? (customBankName.trim() || selectedInst.name) : selectedInst.name;
    const initBal = parseFloat(accountBalance.replace(',', '.')) || 0;

    try {
      const res = await setupUserOnboardingAction({
        controlStartDate: new Date(controlStartDate),
        onboardingPath: 'MANUAL',
        initialAccounts: [
          {
            name: `Conta ${targetBankName}`,
            type: selectedInst.category === 'BROKERAGE' ? 'BROKERAGE' : 'CHECKING',
            initialBalance: initBal,
            institutionName: targetBankName,
          },
        ],
      });

      setSubmitting(false);
      if (res.success) {
        onComplete();
      } else {
        setError((res as any).error || 'Erro ao finalizar configuração.');
      }
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || 'Falha ao salvar dados.');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl max-w-2xl mx-auto text-slate-100">
      {/* Indicador dos Passos */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2 text-emerald-400 font-extrabold text-base">
          <Sparkles className="w-5 h-5" />
          <span>Configuração Rápida em 2 Passos</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-bold">
          <span className={`px-3 py-1 rounded-full ${step === 1 ? 'bg-emerald-500 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'}`}>
            Passo 1
          </span>
          <span className={`px-3 py-1 rounded-full ${step === 2 ? 'bg-emerald-500 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'}`}>
            Passo 2
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* PASSO 1: QUANDO SEU CONTROLE COMETA? */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-400" />
              1. Quando seu controle financeiro deve começar?
            </h2>
            <p className="text-xs text-slate-400">
              Escolha uma data sugerida ou selecione qualquer data personalizada no passado (ex: 01/01/2025):
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Hoje */}
            <button
              type="button"
              onClick={() => handleDateOptionSelect('TODAY')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${dateOption === 'TODAY' ? 'bg-emerald-500/15 border-emerald-500 text-white ring-2 ring-emerald-500/30' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Hoje</span>
                {dateOption === 'TODAY' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div className="text-xs font-extrabold text-white">{new Date().toLocaleDateString('pt-BR')}</div>
              <p className="text-[10px] text-slate-400 leading-tight">Começar zerado agora.</p>
            </button>

            {/* 1º do Mês */}
            <button
              type="button"
              onClick={() => handleDateOptionSelect('FIRST_OF_MONTH')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${dateOption === 'FIRST_OF_MONTH' ? 'bg-emerald-500/15 border-emerald-500 text-white ring-2 ring-emerald-500/30' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">1º do Mês</span>
                {dateOption === 'FIRST_OF_MONTH' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div className="text-xs font-extrabold text-white">1º de {new Date().toLocaleDateString('pt-BR', { month: 'short' })}</div>
              <p className="text-[10px] text-slate-400 leading-tight">Mês cheio atual.</p>
            </button>

            {/* 1º de Janeiro */}
            <button
              type="button"
              onClick={() => handleDateOptionSelect('FIRST_OF_YEAR')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${dateOption === 'FIRST_OF_YEAR' ? 'bg-emerald-500/15 border-emerald-500 text-white ring-2 ring-emerald-500/30' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">01/01/{new Date().getFullYear()}</span>
                {dateOption === 'FIRST_OF_YEAR' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div className="text-xs font-extrabold text-white">Ano {new Date().getFullYear()}</div>
              <p className="text-[10px] text-slate-400 leading-tight">Histórico do ano atual.</p>
            </button>

            {/* Data Personalizada */}
            <button
              type="button"
              onClick={() => handleDateOptionSelect('CUSTOM')}
              className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${dateOption === 'CUSTOM' ? 'bg-emerald-500/15 border-emerald-500 text-white ring-2 ring-emerald-500/30' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Personalizada</span>
                {dateOption === 'CUSTOM' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div className="text-xs font-extrabold text-purple-300">Escolher Data</div>
              <p className="text-[10px] text-slate-400 leading-tight">Ex: 01/01/2025</p>
            </button>
          </div>

          {dateOption === 'CUSTOM' && (
            <div className="p-4 bg-slate-950 border border-purple-500/30 rounded-2xl space-y-2 animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-purple-400" />
                Digite ou selecione a sua data-base personalizada:
              </label>
              <input
                type="date"
                value={controlStartDate}
                onChange={(e) => setControlStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-extrabold text-white focus:border-purple-500 focus:outline-none cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Data-base selecionada: <strong>{new Date(controlStartDate).toLocaleDateString('pt-BR')}</strong>
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
          >
            <span>Avançar para Escolher o Banco</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PASSO 2: QUAL O SEU BANCO PRINCIPAL? (COM EMBLEMAS DE ALTO CONTRASTE E BADGES DOS BANCOS) */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Building className="w-6 h-6 text-emerald-400" />
              2. Qual é o seu banco ou corretora principal?
            </h2>
            <p className="text-xs text-slate-400">
              Selecione o seu banco na lista abaixo ou escolha <strong>"Outra Instituição"</strong>:
            </p>
          </div>

          {/* Grade de Bancos com Logos Visualmente Impressionantes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {popularBanks.map((bank) => {
              const isSelected = !isOtherSelected && selectedInst.id === bank.id;
              return (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => {
                    setSelectedInst(bank);
                    setIsOtherSelected(false);
                  }}
                  className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-2 relative overflow-hidden ${isSelected ? 'bg-emerald-500/20 border-emerald-500 text-white font-extrabold ring-2 ring-emerald-500/50 shadow-xl scale-[1.02]' : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'}`}
                >
                  {/* LOGO REAL DO BANCO */}
                  <BankLogo bankId={bank.id} size="md" />
                  <span className="text-xs font-extrabold truncate max-w-full text-white mt-1">{bank.name}</span>
                </button>
              );
            })}

            {/* BOTÃO OUTRA INSTITUIÇÃO */}
            <button
              type="button"
              onClick={() => setIsOtherSelected(true)}
              className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-2 ${isOtherSelected ? 'bg-purple-500/20 border-purple-500 text-white font-extrabold ring-2 ring-purple-500/50 shadow-xl scale-[1.02]' : 'bg-slate-950 border-slate-800 text-purple-300 hover:border-purple-500/50'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center shadow-lg font-bold">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-xs font-extrabold text-purple-300 mt-1">Outra Instituição</span>
            </button>
          </div>

          {/* PAINEL DE SELEÇÃO EXPANDIDO PARA OUTRA INSTITUIÇÃO */}
          {isOtherSelected && (
            <div className="p-4 bg-slate-950 border border-purple-500/30 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-purple-300">
                  Pesquise no Catálogo Completo (30+ Bancos, Cooperativas e Corretoras):
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Digite o nome do seu banco (ex: Sicredi, Banrisul, BRB, Unicred, BTG, Mercado Pago)..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Lista Filtrada de Instituições */}
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border border-slate-800/80 rounded-xl p-1.5 bg-slate-900/60">
                {filteredAllInstitutions.map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => {
                      setSelectedInst(inst);
                      setCustomBankName(inst.name);
                    }}
                    className={`w-full p-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between ${selectedInst.id === inst.id ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-300 hover:bg-slate-800'}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <BankLogo bankId={inst.id} size="sm" />
                      <span>{inst.name}</span>
                    </div>
                    {selectedInst.id === inst.id && <Check className="w-4 h-4 text-purple-400" />}
                  </button>
                ))}
              </div>

              <div className="pt-1 space-y-1">
                <label className="block text-[11px] font-bold text-slate-400">Ou digite um nome personalizado:</label>
                <input
                  type="text"
                  value={customBankName}
                  onChange={(e) => setCustomBankName(e.target.value)}
                  placeholder="Nome do seu Banco / Cooperativa / Conta"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Campo de Saldo de Entrada */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Saldo em <strong>{isOtherSelected ? (customBankName || selectedInst.name) : selectedInst.name}</strong> em {new Date(controlStartDate).toLocaleDateString('pt-BR')}:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400 font-bold text-sm">R$</span>
              <input
                type="text"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
                placeholder="0,00"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-lg font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400">Você pode colocar o valor de abertura ou aproximado.</p>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-1/3 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs"
            >
              Voltar Passo 1
            </button>
            <button
              type="button"
              onClick={handleFinishOnboarding}
              disabled={submitting}
              className="w-2/3 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Concluir e Ir para o App</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Importação Opcional */}
      <div className="pt-3 border-t border-slate-800 text-center">
        <a
          href="/importar"
          className="text-xs text-purple-400 hover:underline inline-flex items-center gap-1 font-semibold"
        >
          <Upload className="w-4 h-4" />
          <span>Quer importar extrato OFX diretamente? Clique aqui para o importador</span>
        </a>
      </div>
    </div>
  );
}
