"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboardingInitialPosition } from "@/lib/actions/db-actions";
import { formatCurrencyBRL } from "@/lib/decimal";
import {
  Calendar,
  Wallet,
  TrendingUp,
  Building,
  TrendingDown,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  CheckCircle2,
} from "lucide-react";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Etapa 1: Data-base de início
  const [controlStartDate, setControlStartDate] = useState("2026-08-02");

  // Etapa 2: Contas & Saldos
  const [accounts, setAccounts] = useState<
    { name: string; type: string; institutionName: string; initialBalanceStr: string }[]
  >([
    { name: "Conta Corrente", type: "CHECKING", institutionName: "Banco do Brasil", initialBalanceStr: "10000" },
  ]);

  // Etapa 3: Investimentos iniciais
  const [investments, setInvestments] = useState<
    { accountIndex: number; instrumentName: string; instrumentType: string; currentValueStr: string }[]
  >([]);

  // Etapa 4: Bens preexistentes
  const [assets, setAssets] = useState<
    { name: string; category: string; currentValueStr: string; notes?: string }[]
  >([]);

  // Etapa 5: Dívidas / Passivos iniciais
  const [liabilities, setLiabilities] = useState<
    { name: string; type: string; institution: string; currentBalanceStr: string }[]
  >([]);

  // Cálculos de Resumo (Etapa 6)
  const totalLiquid = accounts.reduce((acc, a) => acc + (parseFloat(a.initialBalanceStr) || 0), 0);
  const totalInvestments = investments.reduce((acc, i) => acc + (parseFloat(i.currentValueStr) || 0), 0);
  const totalPhysical = assets.reduce((acc, a) => acc + (parseFloat(a.currentValueStr) || 0), 0);
  const totalAssets = totalLiquid + totalInvestments + totalPhysical;
  const totalLiabilities = liabilities.reduce((acc, l) => acc + (parseFloat(l.currentBalanceStr) || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  const handleFinishOnboarding = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      await saveOnboardingInitialPosition({
        controlStartDate,
        accounts: accounts.map((a) => ({
          name: a.name,
          type: a.type,
          institutionName: a.institutionName,
          initialBalance: parseFloat(a.initialBalanceStr) || 0,
        })),
        investments: investments.map((i) => ({
          accountIndex: i.accountIndex,
          instrumentName: i.instrumentName,
          instrumentType: i.instrumentType,
          currentValue: parseFloat(i.currentValueStr) || 0,
        })),
        assets: assets.map((ast) => ({
          name: ast.name,
          category: ast.category,
          currentValue: parseFloat(ast.currentValueStr) || 0,
          notes: ast.notes,
        })),
        liabilities: liabilities.map((l) => ({
          name: l.name,
          type: l.type,
          institution: l.institution,
          currentBalance: parseFloat(l.currentBalanceStr) || 0,
        })),
      });

      router.push("/");
    } catch (err: any) {
      console.error("Erro ao concluir onboarding:", err);
      setErrorMsg(err.message || "Erro ao salvar posição inicial.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Indicator de Etapas */}
      <div className="flex items-center justify-between glass-card p-4 rounded-2xl text-xs">
        <span className="font-bold text-emerald-400">Etapa {step} de 6</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-emerald-400" : i < step ? "w-2 bg-emerald-600" : "w-2 bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* ETAPA 1: Data-Base de Início */}
      {step === 1 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Data-base de Início do Controle</h2>
              <p className="text-xs text-muted-foreground">A partir de qual data você deseja controlar suas finanças?</p>
            </div>
          </div>

          <div className="space-y-2 pt-3">
            <label className="text-xs text-muted-foreground font-semibold block">Data de Referência (Posição Inicial)</label>
            <input
              type="date"
              value={controlStartDate}
              onChange={(e) => setControlStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-muted-foreground italic">
              Esta data define o Saldo de Abertura das suas contas e bens preexistentes.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold"
            >
              <span>Próximo: Contas & Saldos</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 2: Contas e Saldos de Abertura */}
      {step === 2 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Contas e Saldos Atuais</h2>
                <p className="text-xs text-muted-foreground">Informe o saldo em dinheiro em cada conta na data-base</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setAccounts([
                  ...accounts,
                  { name: "Nova Conta", type: "CHECKING", institutionName: "", initialBalanceStr: "0" },
                ])
              }
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Conta</span>
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {accounts.map((acc, index) => (
              <div key={index} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-cyan-400">Conta {index + 1}</span>
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setAccounts(accounts.filter((_, i) => i !== index))}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nome (ex: Conta Corrente)"
                    value={acc.name}
                    onChange={(e) => {
                      const updated = [...accounts];
                      updated[index].name = e.target.value;
                      setAccounts(updated);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  />

                  <input
                    type="text"
                    placeholder="Instituição (ex: Banco do Brasil)"
                    value={acc.institutionName}
                    onChange={(e) => {
                      const updated = [...accounts];
                      updated[index].institutionName = e.target.value;
                      setAccounts(updated);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Saldo de Abertura na Data-Base (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={acc.initialBalanceStr}
                    onChange={(e) => {
                      const updated = [...accounts];
                      updated[index].initialBalanceStr = e.target.value;
                      setAccounts(updated);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm font-bold text-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 text-xs text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold"
            >
              <span>Próximo: Investimentos</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: Investimentos Iniciais */}
      {step === 3 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Investimentos Iniciais</h2>
                <p className="text-xs text-muted-foreground">Cadastre posições de investimento já existentes</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setInvestments([
                  ...investments,
                  { accountIndex: 0, instrumentName: "", instrumentType: "FIXED_INCOME", currentValueStr: "0" },
                ])
              }
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Produto</span>
            </button>
          </div>

          {investments.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white/5 text-center text-xs text-muted-foreground space-y-2">
              <p>Você não possui investimentos iniciais a cadastrar.</p>
              <p className="text-[11px]">Você pode prosseguir ou adicionar produtos a qualquer momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {investments.map((inv, index) => (
                <div key={index} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-400">Investimento {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => setInvestments(investments.filter((_, i) => i !== index))}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nome do produto (ex: Tesouro Selic, Fundo BB)"
                      value={inv.instrumentName}
                      onChange={(e) => {
                        const updated = [...investments];
                        updated[index].instrumentName = e.target.value;
                        setInvestments(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                    />

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Valor Atual (R$)"
                      value={inv.currentValueStr}
                      onChange={(e) => {
                        const updated = [...investments];
                        updated[index].currentValueStr = e.target.value;
                        setInvestments(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm font-bold text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 text-xs text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold"
            >
              <span>Próximo: Bens Preexistentes</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 4: Bens Preexistentes */}
      {step === 4 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Bens Preexistentes</h2>
                <p className="text-xs text-muted-foreground">Cadastre imóveis, veículos e equipamentos que já possui</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setAssets([
                  ...assets,
                  { name: "", category: "VEHICLE", currentValueStr: "0" },
                ])
              }
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-purple-400 text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Bem</span>
            </button>
          </div>

          {assets.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white/5 text-center text-xs text-muted-foreground space-y-2">
              <p>Nenhum bem preexistente cadastrado.</p>
              <p className="text-[11px]">Bens cadastrados aqui NÃO geram saída bancária nem despesas fictícias.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map((ast, index) => (
                <div key={index} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-purple-400">Bem {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => setAssets(assets.filter((_, i) => i !== index))}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Descrição (ex: Jetta, Apartamento)"
                      value={ast.name}
                      onChange={(e) => {
                        const updated = [...assets];
                        updated[index].name = e.target.value;
                        setAssets(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                    />

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Valor Atual (R$)"
                      value={ast.currentValueStr}
                      onChange={(e) => {
                        const updated = [...assets];
                        updated[index].currentValueStr = e.target.value;
                        setAssets(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm font-bold text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 text-xs text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              onClick={() => setStep(5)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold"
            >
              <span>Próximo: Dívidas</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 5: Dívidas / Passivos Iniciais */}
      {step === 5 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Dívidas e Passivos</h2>
                <p className="text-xs text-muted-foreground">Financiamentos e empréstimos existentes na data-base</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setLiabilities([
                  ...liabilities,
                  { name: "", type: "MORTGAGE", institution: "", currentBalanceStr: "0" },
                ])
              }
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-rose-400 text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Passivo</span>
            </button>
          </div>

          {liabilities.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white/5 text-center text-xs text-muted-foreground space-y-2">
              <p>Nenhuma dívida inicial cadastrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {liabilities.map((l, index) => (
                <div key={index} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-rose-400">Dívida {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => setLiabilities(liabilities.filter((_, i) => i !== index))}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Descrição (ex: Financiamento Apt)"
                      value={l.name}
                      onChange={(e) => {
                        const updated = [...liabilities];
                        updated[index].name = e.target.value;
                        setLiabilities(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                    />

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Saldo Devedor Atual (R$)"
                      value={l.currentBalanceStr}
                      onChange={(e) => {
                        const updated = [...liabilities];
                        updated[index].currentBalanceStr = e.target.value;
                        setLiabilities(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm font-bold text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(4)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 text-xs text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              onClick={() => setStep(6)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold"
            >
              <span>Próximo: Resumo & Confirmação</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 6: Resumo & Confirmação */}
      {step === 6 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Balanço de Abertura Inicial</h2>
              <p className="text-xs text-muted-foreground">Confira a posição patrimonial na data-base {controlStartDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <span className="font-bold text-emerald-400 block uppercase">Total de Ativos</span>
              <div className="flex justify-between text-slate-300">
                <span>Contas em Caixa:</span>
                <span>{formatCurrencyBRL(totalLiquid)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Investimentos:</span>
                <span>{formatCurrencyBRL(totalInvestments)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Bens Preexistentes:</span>
                <span>{formatCurrencyBRL(totalPhysical)}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-white text-sm">
                <span>Patrimônio Bruto:</span>
                <span>{formatCurrencyBRL(totalAssets)}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <span className="font-bold text-rose-400 block uppercase">Total de Passivos</span>
              <div className="flex justify-between text-slate-300">
                <span>Financiamentos/Dívidas:</span>
                <span>{formatCurrencyBRL(totalLiabilities)}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-rose-400 text-sm">
                <span>Passivos Totais:</span>
                <span>-{formatCurrencyBRL(totalLiabilities)}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-center space-y-1">
            <span className="text-xs font-semibold text-emerald-300 uppercase block">Patrimônio Líquido de Abertura</span>
            <span className="text-3xl font-black text-white block">{formatCurrencyBRL(netWorth)}</span>
            <p className="text-[10px] text-muted-foreground">Posição inicial registrada na data {controlStartDate}</p>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(5)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 text-xs text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              onClick={handleFinishOnboarding}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? "Salvando..." : "Começar meu controle financeiro"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
