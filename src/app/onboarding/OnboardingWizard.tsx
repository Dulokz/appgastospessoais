"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getOnboardingState,
  updateOnboardingStep,
  skipOnboarding,
  completeOnboarding,
} from "@/lib/actions/db-actions";
import { FinancialCommandService } from "@/lib/services/financial-command.service";
import { formatCurrencyBRL } from "@/lib/decimal";
import {
  ACCOUNT_TYPE_LABELS,
  ASSET_CATEGORY_LABELS,
  INSTRUMENT_TYPE_LABELS,
  LIABILITY_TYPE_LABELS,
} from "@/lib/translations";
import {
  Sparkles,
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
  ArrowRight,
  FileSpreadsheet,
  Landmark,
  X,
  Check,
  HelpCircle,
} from "lucide-react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

const INSTITUTIONS_LIST = [
  "Banco do Brasil",
  "Sicredi",
  "Sicoob",
  "Nubank",
  "Itaú",
  "Bradesco",
  "Caixa",
  "Santander",
  "Inter",
  "XP",
  "BTG",
  "Outra",
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Loaded DB State
  const [controlStartDate, setControlStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [accounts, setAccounts] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [liabilities, setLiabilities] = useState<any[]>([]);

  // Local Form Modals / Adders
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [accInst, setAccInst] = useState("Banco do Brasil");
  const [accName, setAccName] = useState("Conta Corrente");
  const [accType, setAccType] = useState("CHECKING");
  const [accBalanceStr, setAccBalanceStr] = useState("0");

  const [isAddingInvestment, setIsAddingInvestment] = useState(false);
  const [invName, setInvName] = useState("");
  const [invType, setInvType] = useState("INVESTMENT_FUND");
  const [invValueStr, setInvValueStr] = useState("0");
  const [invAccId, setInvAccId] = useState("");

  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [astName, setAstName] = useState("");
  const [astCat, setAstCat] = useState("REAL_ESTATE");
  const [astMode, setAstMode] = useState<"FULL_OWNERSHIP" | "FINANCED" | "EQUITY_BUILDUP">("FULL_OWNERSHIP");
  const [astValueStr, setAstValueStr] = useState("0");
  const [astPaidEquityStr, setAstPaidEquityStr] = useState("0");

  const [isAddingLiability, setIsAddingLiability] = useState(false);
  const [liabName, setLiabName] = useState("");
  const [liabType, setLiabType] = useState("MORTGAGE");
  const [liabInst, setLiabInst] = useState("");
  const [liabBalanceStr, setLiabBalanceStr] = useState("0");

  useEffect(() => {
    getOnboardingState().then((state) => {
      if (state.isCompleted) {
        router.push("/");
        return;
      }
      setStep(state.step || 1);
      if (state.controlStartDate) setControlStartDate(state.controlStartDate);
      setAccounts(state.accounts || []);
      setInvestments(state.investments || []);
      setAssets(state.assets || []);
      setLiabilities(state.liabilities || []);
      if (state.accounts && state.accounts.length > 0) {
        setInvAccId(state.accounts[0].id);
      }
    });
  }, [router]);

  const handleStepChange = async (nextStep: number) => {
    setStep(nextStep);
    await updateOnboardingStep(nextStep, controlStartDate);
  };

  const handleSkip = async () => {
    setLoading(true);
    await skipOnboarding();
    router.push("/");
  };

  const handleFinish = async () => {
    setLoading(true);
    await completeOnboarding(controlStartDate);
    router.push("/");
  };

  // Add Account Incremental
  const handleSaveAccount = async () => {
    if (!accName.trim()) return;
    setLoading(true);
    try {
      const created = await FinancialCommandService.saveInitialAccount({
        userId: "", // Filled automatically inside action/service
        name: accName,
        type: accType,
        institutionName: accInst,
        initialBalance: parseFloat(accBalanceStr) || 0,
      });
      const updatedAccounts = [...accounts, created];
      setAccounts(updatedAccounts);
      if (!invAccId) setInvAccId(created.id);
      setIsAddingAccount(false);
      setAccName("");
      setAccBalanceStr("0");
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar conta.");
    } finally {
      setLoading(false);
    }
  };

  // Add Investment Incremental
  const handleSaveInvestment = async () => {
    if (!invName.trim() || !invAccId) return;
    setLoading(true);
    try {
      const created = await FinancialCommandService.saveInitialInvestment({
        userId: "",
        accountId: invAccId,
        instrumentName: invName,
        instrumentType: invType,
        currentValue: parseFloat(invValueStr) || 0,
      });
      setInvestments([...investments, created]);
      setIsAddingInvestment(false);
      setInvName("");
      setInvValueStr("0");
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar investimento.");
    } finally {
      setLoading(false);
    }
  };

  // Add Asset Incremental
  const handleSaveAsset = async () => {
    if (!astName.trim()) return;
    setLoading(true);
    try {
      const created = await FinancialCommandService.saveInitialAsset({
        userId: "",
        name: astName,
        category: astCat,
        acquisitionMode: astMode,
        currentValue: parseFloat(astValueStr) || 0,
        paidEquityValue: astMode === "EQUITY_BUILDUP" ? parseFloat(astPaidEquityStr) || 0 : undefined,
      });
      setAssets([...assets, created]);
      setIsAddingAsset(false);
      setAstName("");
      setAstValueStr("0");
      setAstPaidEquityStr("0");
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar bem.");
    } finally {
      setLoading(false);
    }
  };

  // Add Liability Incremental
  const handleSaveLiability = async () => {
    if (!liabName.trim()) return;
    setLoading(true);
    try {
      const created = await FinancialCommandService.saveInitialLiability({
        userId: "",
        name: liabName,
        type: liabType,
        institution: liabInst || undefined,
        currentBalance: parseFloat(liabBalanceStr) || 0,
      });
      setLiabilities([...liabilities, created]);
      setIsAddingLiability(false);
      setLiabName("");
      setLiabBalanceStr("0");
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar dívida.");
    } finally {
      setLoading(false);
    }
  };

  // Summary Calculations
  const totalLiquid = accounts.reduce((acc, a) => acc + (a.calculatedBalance ? parseFloat(a.calculatedBalance.toString()) : 0), 0);
  const totalInvestments = investments.reduce((acc, i) => acc + (i.currentValue ? parseFloat(i.currentValue.toString()) : 0), 0);
  const totalPhysical = assets.reduce((acc, a) => acc + (a.currentValue ? parseFloat(a.currentValue.toString()) : 0), 0);
  const totalAssets = totalLiquid + totalInvestments + totalPhysical;
  const totalLiabilities = liabilities.reduce((acc, l) => acc + (l.currentBalance ? parseFloat(l.currentBalance.toString()) : 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Indicador de Progresso */}
      {step > 1 && step < 8 && (
        <div className="flex items-center justify-between glass-card p-4 rounded-2xl text-xs">
          <span className="font-bold text-emerald-400">Etapa {step - 1} de 6</span>
          <div className="flex gap-1.5">
            {[2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step ? "w-6 bg-emerald-400" : i < step ? "w-2 bg-emerald-600" : "w-2 bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* ETAPA 1: Boas-Vindas */}
      {step === 1 && (
        <div className="glass-card p-8 rounded-3xl space-y-8 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Seja bem-vindo</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Vamos montar sua vida financeira
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Em poucos minutos você terá uma visão consolidada de:
            </p>
          </div>

          <div className="space-y-2.5 relative z-10 text-xs sm:text-sm">
            {[
              "quanto possui disponível",
              "quanto possui investido",
              "seus bens patrimoniais",
              "suas dívidas e passivos",
              "seu patrimônio líquido real",
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-slate-200">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground italic relative z-10">
            "Não precisa cadastrar tudo agora. Você poderá adicionar ou corrigir informações depois a qualquer momento."
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 relative z-10">
            <button
              onClick={() => handleStepChange(2)}
              className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Começar</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleSkip}
              disabled={loading}
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-all"
            >
              Configurar depois
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 2: Quando quer começar seu controle? */}
      {step === 2 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Quando você quer começar seu controle?</h2>
              <p className="text-xs text-muted-foreground">Ponto de partida inicial para acompanhar a evolução do seu patrimônio</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-2">Data Inicial de Referência</label>
              <input
                type="date"
                value={controlStartDate}
                onChange={(e) => setControlStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-base font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <p className="text-xs text-emerald-300/80 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              Usaremos essa data como ponto inicial para acompanhar a evolução do seu patrimônio sem misturar movimentações antigas.
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl bg-white/5 text-xs text-white">
              Voltar
            </button>
            <button
              onClick={() => handleStepChange(3)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold"
            >
              <span>Próximo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: Como você quer montar sua posição inicial? */}
      {step === 3 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Como você quer montar sua posição inicial?</h2>
            <p className="text-xs text-muted-foreground">Escolha a maneira mais confortável para começar</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleStepChange(4)}
              className="p-5 rounded-2xl bg-white/5 border border-emerald-500/30 hover:border-emerald-500 text-left space-y-2 group transition-all"
            >
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 w-fit">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">Informar meus saldos</h3>
              <p className="text-xs text-muted-foreground">Comece rapidamente informando quanto possui hoje.</p>
            </button>

            <button
              onClick={() => handleStepChange(4)}
              className="p-5 rounded-2xl bg-white/5 border border-cyan-500/30 hover:border-cyan-500 text-left space-y-2 group transition-all"
            >
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 w-fit">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">Adicionar manualmente</h3>
              <p className="text-xs text-muted-foreground">Cadastre contas, investimentos, bens e dívidas.</p>
            </button>

            {/* Cards em Breve */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-left space-y-2 opacity-50 cursor-not-allowed">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 w-fit">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-slate-300">Em breve</span>
              </div>
              <h3 className="font-bold text-white text-sm">Importar extratos</h3>
              <p className="text-xs text-muted-foreground">OFX, CSV, Excel ou PDF.</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-left space-y-2 opacity-50 cursor-not-allowed">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 w-fit">
                  <Landmark className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-slate-300">Em breve</span>
              </div>
              <h3 className="font-bold text-white text-sm">Conectar instituições</h3>
              <p className="text-xs text-muted-foreground">Open Finance automático.</p>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl bg-white/5 text-xs text-white">
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 4: Onde está seu dinheiro? (Contas) */}
      {step === 4 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Onde está seu dinheiro?</h2>
                <p className="text-xs text-muted-foreground">Adicione suas principais contas. Não precisa cadastrar todas agora.</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddingAccount(true)}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar conta</span>
            </button>
          </div>

          {/* Lista de Contas Incrementais */}
          {accounts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/5 text-center text-xs text-muted-foreground space-y-2 border border-dashed border-white/10">
              <p className="font-medium text-slate-300">Nenhuma conta cadastrada ainda.</p>
              <p>Você pode adicionar suas contas principais agora ou pular esta etapa.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {accounts.map((acc) => (
                <div key={acc.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">{acc.name}</h3>
                    <p className="text-xs text-muted-foreground">{acc.financialInstitution?.name || "Instituição"} • {ACCOUNT_TYPE_LABELS[acc.type] || acc.type}</p>
                  </div>
                  <span className="font-bold text-cyan-400 text-base">
                    {formatCurrencyBRL(parseFloat(acc.calculatedBalance.toString()))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Modal rápido de Adição de Conta */}
          {isAddingAccount && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-md glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h3 className="font-bold text-white text-sm">Adicionar Conta</h3>
                  <button onClick={() => setIsAddingAccount(false)} className="text-muted-foreground hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Instituição</label>
                  <select
                    value={accInst}
                    onChange={(e) => setAccInst(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  >
                    {INSTITUTIONS_LIST.map((inst) => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Nome da Conta</label>
                  <input
                    type="text"
                    placeholder="ex: Conta Corrente, Poupança"
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Tipo</label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  >
                    <option value="CHECKING">{ACCOUNT_TYPE_LABELS.CHECKING}</option>
                    <option value="SAVINGS">{ACCOUNT_TYPE_LABELS.SAVINGS}</option>
                    <option value="CASH">{ACCOUNT_TYPE_LABELS.CASH}</option>
                    <option value="BROKERAGE">{ACCOUNT_TYPE_LABELS.BROKERAGE}</option>
                    <option value="INVESTMENT">{ACCOUNT_TYPE_LABELS.INVESTMENT}</option>
                    <option value="OTHER">{ACCOUNT_TYPE_LABELS.OTHER}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Saldo Atual (R$)</label>
                  <CurrencyInput value={accBalanceStr} onChangeValue={(_, raw) => setAccBalanceStr(raw)} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setIsAddingAccount(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">Cancelar</button>
                  <button onClick={handleSaveAccount} disabled={loading || !accName.trim()} className="px-5 py-2 rounded-xl bg-cyan-500 text-xs font-bold text-white shadow-lg">Salvar Conta</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(3)} className="px-4 py-2.5 rounded-xl bg-white/5 text-xs text-white">
              Voltar
            </button>
            <button
              onClick={() => handleStepChange(5)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold"
            >
              <span>Próximo: Investimentos</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 5: Seus Investimentos */}
      {step === 5 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Seus investimentos</h2>
                <p className="text-xs text-muted-foreground">Adicione os investimentos que você já possui como posição inicial.</p>
              </div>
            </div>

            {accounts.length > 0 && (
              <button
                onClick={() => setIsAddingInvestment(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar produto</span>
              </button>
            )}
          </div>

          {investments.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/5 text-center text-xs text-muted-foreground space-y-2 border border-dashed border-white/10">
              <p className="font-medium text-slate-300">Nenhum investimento inicial cadastrado.</p>
              <p>Eles entrarão como posição inicial na data-base e não alterarão o caixa.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {investments.map((inv) => (
                <div key={inv.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">{inv.instrument?.name || "Produto"}</h3>
                    <p className="text-xs text-muted-foreground">{INSTRUMENT_TYPE_LABELS[inv.instrument?.instrumentType] || "Investimento"}</p>
                  </div>
                  <span className="font-bold text-emerald-400 text-base">
                    {formatCurrencyBRL(parseFloat(inv.currentValue.toString()))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Modal Adicionar Investimento */}
          {isAddingInvestment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-md glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h3 className="font-bold text-white text-sm">Adicionar Investimento Inicial</h3>
                  <button onClick={() => setIsAddingInvestment(false)} className="text-muted-foreground hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Nome do Produto</label>
                  <input
                    type="text"
                    placeholder="ex: Fundo BB Renda Fixa, Tesouro Selic 2029"
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Categoria</label>
                  <select
                    value={invType}
                    onChange={(e) => setInvType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  >
                    <option value="INVESTMENT_FUND">{INSTRUMENT_TYPE_LABELS.INVESTMENT_FUND}</option>
                    <option value="FIXED_INCOME">{INSTRUMENT_TYPE_LABELS.FIXED_INCOME}</option>
                    <option value="TREASURY_BOND">{INSTRUMENT_TYPE_LABELS.TREASURY_BOND}</option>
                    <option value="STOCK">{INSTRUMENT_TYPE_LABELS.STOCK}</option>
                    <option value="FII">{INSTRUMENT_TYPE_LABELS.FII}</option>
                    <option value="OTHER">{INSTRUMENT_TYPE_LABELS.OTHER}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Conta de Custódia</label>
                  <select
                    value={invAccId}
                    onChange={(e) => setInvAccId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Valor Atual (R$)</label>
                  <CurrencyInput value={invValueStr} onChangeValue={(_, raw) => setInvValueStr(raw)} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setIsAddingInvestment(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">Cancelar</button>
                  <button onClick={handleSaveInvestment} disabled={loading || !invName.trim()} className="px-5 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-white shadow-lg">Salvar Investimento</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(4)} className="px-4 py-2.5 rounded-xl bg-white/5 text-xs text-white">
              Voltar
            </button>
            <button
              onClick={() => handleStepChange(6)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold"
            >
              <span>Próximo: Bens</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 6: Outros Bens */}
      {step === 6 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Outros bens</h2>
                <p className="text-xs text-muted-foreground">Adicione bens relevantes que você já possui.</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddingAsset(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar bem</span>
            </button>
          </div>

          {assets.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/5 text-center text-xs text-muted-foreground space-y-2 border border-dashed border-white/10">
              <p className="font-medium text-slate-300">Nenhum bem preexistente cadastrado.</p>
              <p>Exemplos: Imóvel 🏠, Veículo 🚗, Terreno 🌱, Equipamento 💻, Cota Capital 🏢.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {assets.map((ast) => (
                <div key={ast.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">{ast.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {ASSET_CATEGORY_LABELS[ast.category] || ast.category} • {ast.acquisitionMode === "EQUITY_BUILDUP" ? "Aquisição Parcelada" : "Propriedade Plena"}
                    </p>
                  </div>
                  <span className="font-bold text-purple-400 text-base">
                    {formatCurrencyBRL(parseFloat(ast.currentValue.toString()))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Modal Adicionar Bem */}
          {isAddingAsset && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-md glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h3 className="font-bold text-white text-sm">Adicionar Bem Preexistente</h3>
                  <button onClick={() => setIsAddingAsset(false)} className="text-muted-foreground hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Nome do Bem</label>
                  <input
                    type="text"
                    placeholder="ex: Apartamento 302, Corolla Cross, MacBook"
                    value={astName}
                    onChange={(e) => setAstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Categoria</label>
                  <select
                    value={astCat}
                    onChange={(e) => setAstCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  >
                    <option value="REAL_ESTATE">{ASSET_CATEGORY_LABELS.REAL_ESTATE}</option>
                    <option value="VEHICLE">{ASSET_CATEGORY_LABELS.VEHICLE}</option>
                    <option value="EQUIPMENT">{ASSET_CATEGORY_LABELS.EQUIPMENT}</option>
                    <option value="CORPORATE_SHARE">{ASSET_CATEGORY_LABELS.CORPORATE_SHARE}</option>
                    <option value="OTHER">{ASSET_CATEGORY_LABELS.OTHER}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Modelo de Aquisição</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAstMode("FULL_OWNERSHIP")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        astMode === "FULL_OWNERSHIP"
                          ? "bg-purple-500/20 border-purple-500 text-purple-300"
                          : "bg-white/5 border-white/10 text-muted-foreground"
                      }`}
                    >
                      Propriedade Plena / Quitado
                    </button>
                    <button
                      type="button"
                      onClick={() => setAstMode("EQUITY_BUILDUP")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        astMode === "EQUITY_BUILDUP"
                          ? "bg-purple-500/20 border-purple-500 text-purple-300"
                          : "bg-white/5 border-white/10 text-muted-foreground"
                      }`}
                    >
                      Estou pagando aos poucos
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Valor de Mercado Estimado Atual (R$)</label>
                  <CurrencyInput value={astValueStr} onChangeValue={(_, raw) => setAstValueStr(raw)} />
                </div>

                {astMode === "EQUITY_BUILDUP" && (
                  <div>
                    <label className="text-xs text-purple-300 font-semibold block mb-1">Valor já Pago/Integralizado até hoje (R$)</label>
                    <CurrencyInput value={astPaidEquityStr} onChangeValue={(_, raw) => setAstPaidEquityStr(raw)} />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setIsAddingAsset(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">Cancelar</button>
                  <button onClick={handleSaveAsset} disabled={loading || !astName.trim()} className="px-5 py-2 rounded-xl bg-purple-600 text-xs font-bold text-white shadow-lg">Salvar Bem</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(5)} className="px-4 py-2.5 rounded-xl bg-white/5 text-xs text-white">
              Voltar
            </button>
            <button
              onClick={() => handleStepChange(7)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold"
            >
              <span>Próximo: Dívidas</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 7: Suas Dívidas */}
      {step === 7 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Suas dívidas</h2>
                <p className="text-xs text-muted-foreground">Adicione financiamentos e outras dívidas que fazem parte do seu patrimônio.</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddingLiability(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar dívida</span>
            </button>
          </div>

          {liabilities.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/5 text-center text-xs text-muted-foreground space-y-2 border border-dashed border-white/10">
              <p className="font-medium text-slate-300">Nenhuma dívida cadastrada.</p>
              <p>Se você possui financiamentos imobiliários, veiculares ou empréstimos, cadastre-os aqui.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {liabilities.map((l) => (
                <div key={l.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">{l.name}</h3>
                    <p className="text-xs text-muted-foreground">{LIABILITY_TYPE_LABELS[l.type] || l.type} • {l.institution || "Credor"}</p>
                  </div>
                  <span className="font-bold text-rose-400 text-base">
                    {formatCurrencyBRL(parseFloat(l.currentBalance.toString()))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Modal Adicionar Dívida */}
          {isAddingLiability && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-md glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h3 className="font-bold text-white text-sm">Adicionar Dívida / Passivo</h3>
                  <button onClick={() => setIsAddingLiability(false)} className="text-muted-foreground hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Descrição</label>
                  <input
                    type="text"
                    placeholder="ex: Financiamento Imobiliário CEF"
                    value={liabName}
                    onChange={(e) => setLiabName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Tipo de Dívida</label>
                  <select
                    value={liabType}
                    onChange={(e) => setLiabType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  >
                    <option value="MORTGAGE">{LIABILITY_TYPE_LABELS.MORTGAGE}</option>
                    <option value="VEHICLE_LOAN">{LIABILITY_TYPE_LABELS.VEHICLE_LOAN}</option>
                    <option value="PERSONAL_LOAN">{LIABILITY_TYPE_LABELS.PERSONAL_LOAN}</option>
                    <option value="CREDIT_CARD">{LIABILITY_TYPE_LABELS.CREDIT_CARD}</option>
                    <option value="INSTALLMENT">{LIABILITY_TYPE_LABELS.INSTALLMENT}</option>
                    <option value="OTHER">{LIABILITY_TYPE_LABELS.OTHER}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Instituição Credora</label>
                  <input
                    type="text"
                    placeholder="ex: Caixa Econômica, Banco do Brasil"
                    value={liabInst}
                    onChange={(e) => setLiabInst(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Saldo Devedor Atual (R$)</label>
                  <CurrencyInput value={liabBalanceStr} onChangeValue={(_, raw) => setLiabBalanceStr(raw)} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setIsAddingLiability(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">Cancelar</button>
                  <button onClick={handleSaveLiability} disabled={loading || !liabName.trim()} className="px-5 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white shadow-lg">Salvar Dívida</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(6)} className="px-4 py-2.5 rounded-xl bg-white/5 text-xs text-white">
              Voltar
            </button>
            <button
              onClick={() => handleStepChange(8)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold"
            >
              <span>Próximo: Resumo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 8: Resumo & Posição Financeira Pronta */}
      {step === 8 && (
        <div className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sua posição financeira está pronta</h2>
              <p className="text-xs text-muted-foreground">Ponto de partida registrado na data {controlStartDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Dinheiro</span>
              <span className="text-sm sm:text-base font-bold text-cyan-400">{formatCurrencyBRL(totalLiquid)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Investimentos</span>
              <span className="text-sm sm:text-base font-bold text-emerald-400">{formatCurrencyBRL(totalInvestments)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Bens</span>
              <span className="text-sm sm:text-base font-bold text-purple-400">{formatCurrencyBRL(totalPhysical)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Dívidas</span>
              <span className="text-sm sm:text-base font-bold text-rose-400">-{formatCurrencyBRL(totalLiabilities)}</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-center space-y-1">
            <span className="text-xs font-semibold text-emerald-300 uppercase block">Patrimônio Líquido de Abertura</span>
            <span className="text-3xl sm:text-4xl font-black text-white block">{formatCurrencyBRL(netWorth)}</span>
            <p className="text-[11px] text-slate-300 mt-2">
              Esse é o ponto de partida do seu controle. A partir de agora vamos acompanhar como seu patrimônio evolui.
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(7)} className="px-4 py-2.5 rounded-xl bg-white/5 text-xs text-white">
              Voltar
            </button>
            <button
              onClick={handleFinish}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? "Finalizando..." : "Ir para meu Dashboard"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
