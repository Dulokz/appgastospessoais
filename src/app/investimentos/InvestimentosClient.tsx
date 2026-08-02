"use client";

import { useState } from "react";
import { formatCurrencyBRL } from "@/lib/decimal";
import { INSTRUMENT_TYPE_LABELS } from "@/lib/translations";
import { InstitutionConsolidationService, AccountItemData, InvestmentPositionItemData } from "@/lib/services/institution-consolidation.service";
import { AssetClassService } from "@/lib/services/asset-class.service";
import { createInvestmentPosition, updatePositionValue, recordInvestmentEvent } from "@/lib/actions/db-actions";
import {
  Building2,
  Plus,
  ChevronDown,
  ChevronUp,
  PieChart,
  DollarSign,
  TrendingUp,
  Wallet,
  X,
  Edit2,
  Gift,
} from "lucide-react";

interface FormattedEvent {
  id: string;
  type: string;
  amount: number;
  dateStr: string;
  instrumentName: string;
  notes?: string | null;
}

interface InvestimentosClientProps {
  initialAccounts: AccountItemData[];
  initialPositions: InvestmentPositionItemData[];
  initialEvents: FormattedEvent[];
}

const INSTRUMENT_TYPES = [
  { value: "STOCK", label: "Ação" },
  { value: "FII", label: "Fundo Imobiliário (FII)" },
  { value: "BDR", label: "BDR" },
  { value: "ETF", label: "ETF" },
  { value: "TREASURY_BOND", label: "Tesouro Direto" },
  { value: "INVESTMENT_FUND", label: "Fundo de Investimento" },
  { value: "FIXED_INCOME", label: "Renda Fixa (CDB/LCI/LCA)" },
  { value: "CRYPTO", label: "Criptoativo" },
  { value: "OTHER", label: "Outro" },
];

export function InvestimentosClient({
  initialAccounts,
  initialPositions,
  initialEvents,
}: InvestimentosClientProps) {
  const [accounts] = useState(initialAccounts);
  const [positions, setPositions] = useState(initialPositions);
  const [events, setEvents] = useState(initialEvents);

  const [expandedInst, setExpandedInst] = useState<Record<string, boolean>>({});

  // Modal States
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
  const [isUpdateValueOpen, setIsUpdateValueOpen] = useState<InvestmentPositionItemData | null>(null);
  const [isRecordEventOpen, setIsRecordEventOpen] = useState<InvestmentPositionItemData | null>(null);

  // Add Position Form
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [instrumentName, setInstrumentName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [instrumentType, setInstrumentType] = useState("STOCK");
  const [acquisitionValueStr, setAcquisitionValueStr] = useState("");
  const [currentValueStr, setCurrentValueStr] = useState("");
  const [quantityStr, setQuantityStr] = useState("1");
  const [loading, setLoading] = useState(false);

  // Update Value Form
  const [newValueStr, setNewValueStr] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");

  // Record Event Form
  const [eventType, setEventType] = useState<"DIVIDEND" | "JCP" | "INCOME_RECEIVED" | "CONTRIBUTION" | "WITHDRAWAL">("DIVIDEND");
  const [eventAmountStr, setEventAmountStr] = useState("");
  const [eventAccountTarget, setEventAccountTarget] = useState(accounts[0]?.id || "");
  const [eventNotes, setEventNotes] = useState("");

  // Consolar Posições por Instituição
  const consolidatedInstitutions = InstitutionConsolidationService.consolidateByInstitution(accounts, positions);

  // Consolidar por Classe de Ativo
  const totalLiquid = accounts.reduce((acc, a) => acc + Number(a.calculatedBalance), 0);
  const assetClasses = AssetClassService.consolidateByClass(positions, totalLiquid);

  // Total de Investimentos acumulado
  const totalInvested = positions.reduce((acc, p) => acc + Number(p.currentValue), 0);

  // Calculo de Rendimentos vs Ganhos Não Realizados dos Eventos
  let realizedIncomeSum = 0;
  let unrealizedGainsSum = 0;

  for (const e of events) {
    if (e.type === "DIVIDEND" || e.type === "JCP" || e.type === "INCOME_RECEIVED") {
      realizedIncomeSum += e.amount;
    } else if (e.type === "APPRECIATION") {
      unrealizedGainsSum += e.amount;
    } else if (e.type === "DEPRECIATION") {
      unrealizedGainsSum -= e.amount;
    }
  }

  const toggleInst = (id: string) => {
    setExpandedInst((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreatePosition = async () => {
    if (!instrumentName || !currentValueStr) return;
    setLoading(true);

    try {
      const acq = parseFloat(acquisitionValueStr) || parseFloat(currentValueStr);
      const curr = parseFloat(currentValueStr);
      const qty = parseFloat(quantityStr) || 1;

      await createInvestmentPosition({
        accountId,
        instrumentName,
        symbol,
        instrumentType: instrumentType as any,
        quantity: qty,
        acquisitionValue: acq,
        currentValue: curr,
      });

      setIsAddPositionOpen(false);
      window.location.reload();
    } catch (err) {
      console.error("Erro ao criar posição:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateValue = async () => {
    if (!isUpdateValueOpen || !newValueStr) return;
    setLoading(true);

    try {
      await updatePositionValue({
        positionId: isUpdateValueOpen.id,
        newCurrentValue: parseFloat(newValueStr),
        notes: updateNotes,
      });

      setIsUpdateValueOpen(null);
      window.location.reload();
    } catch (err) {
      console.error("Erro ao atualizar valor:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordEvent = async () => {
    if (!isRecordEventOpen || !eventAmountStr) return;
    setLoading(true);

    try {
      await recordInvestmentEvent({
        positionId: isRecordEventOpen.id,
        eventType,
        amount: parseFloat(eventAmountStr),
        accountId: eventAccountTarget,
        notes: eventNotes,
      });

      setIsRecordEventOpen(null);
      window.location.reload();
    } catch (err) {
      console.error("Erro ao registrar evento:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Posição por Instituição & Carteira</h1>
          <p className="text-xs text-muted-foreground">Consolidação multi-instituição, produtos de investimento e proventos</p>
        </div>

        <button
          onClick={() => setIsAddPositionOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Adicionar Investimento</span>
        </button>
      </div>

      {/* Seção 19: Resultado dos Investimentos */}
      <div className="glass-card p-6 rounded-3xl space-y-4 border-emerald-500/30">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Resultado dos Investimentos</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Recebido em Dinheiro (Dividendos/JCP)</span>
            <span className="text-2xl font-extrabold text-emerald-400">+{formatCurrencyBRL(realizedIncomeSum)}</span>
            <p className="text-[10px] text-muted-foreground mt-1">Creditado na conta corrente / corretora</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Flutuação / Valorização Não Realizada</span>
            <span className={`text-2xl font-extrabold ${unrealizedGainsSum >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
              {unrealizedGainsSum >= 0 ? "+" : ""}{formatCurrencyBRL(unrealizedGainsSum)}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1">Variação de cotação / valor sem resgate</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-purple-500/20">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Total Investido na Carteira</span>
            <span className="text-2xl font-extrabold text-white">{formatCurrencyBRL(totalInvested)}</span>
            <p className="text-[10px] text-muted-foreground mt-1">Soma das posições financeiras ativas</p>
          </div>
        </div>
      </div>

      {/* Seção 5: Resumo por Classe de Ativo */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <PieChart className="w-4 h-4 text-purple-400" />
          <span>Composição por Classe de Ativo</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {assetClasses.map((ac) => (
            <div key={ac.type} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[10px] text-muted-foreground block truncate">{ac.typeLabel}</span>
              <span className="text-sm font-bold text-white block">{formatCurrencyBRL(ac.totalValue)}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">{ac.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Seção 3 & 4: Cards Consolidados por Instituição (Expansíveis) */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-400" />
          <span>Patrimônio por Instituição Financeira</span>
        </h3>

        {consolidatedInstitutions.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center space-y-3">
            <p className="font-bold text-white">Nenhuma instituição ou posição cadastrada</p>
            <p className="text-xs text-muted-foreground">Cadastre suas contas e investimentos para visualizar os cards consolidados.</p>
          </div>
        ) : (
          consolidatedInstitutions.map((inst) => {
            const isExpanded = expandedInst[inst.institutionId];
            return (
              <div key={inst.institutionId} className="glass-card rounded-2xl overflow-hidden transition-all">
                {/* Header Fechado */}
                <div
                  onClick={() => toggleInst(inst.institutionId)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">{inst.institutionName}</h4>
                      <p className="text-xs text-muted-foreground">
                        Disponível: <span className="text-cyan-400 font-semibold">{formatCurrencyBRL(inst.liquidBalance)}</span> • Investido: <span className="text-emerald-400 font-semibold">{formatCurrencyBRL(inst.investmentBalance)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground uppercase font-semibold block">Total</span>
                      <span className="text-xl font-extrabold text-white">{formatCurrencyBRL(inst.totalBalance)}</span>
                    </div>

                    <button className="p-2 rounded-xl bg-white/5 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Conteúdo Expandido */}
                {isExpanded && (
                  <div className="p-5 border-t border-white/10 bg-black/20 space-y-6">
                    {/* Contas Líquidas */}
                    {inst.accounts.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">Dinheiro / Liquidez</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {inst.accounts.map((acc) => (
                            <div key={acc.id} className="p-3 rounded-xl bg-white/5 flex justify-between text-xs">
                              <span className="text-slate-300 font-medium">{acc.name}</span>
                              <span className="font-bold text-white">{formatCurrencyBRL(acc.calculatedBalance)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-right text-xs text-muted-foreground pt-1">
                          Subtotal Disponível: <span className="font-bold text-cyan-400">{formatCurrencyBRL(inst.liquidBalance)}</span>
                        </div>
                      </div>
                    )}

                    {/* Posições de Investimento */}
                    {inst.positions.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Investimentos & Produtos</span>
                        <div className="space-y-2">
                          {inst.positions.map((pos) => (
                            <div key={pos.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-sm">{pos.instrumentName}</span>
                                  {pos.instrumentSymbol && (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                      {pos.instrumentSymbol}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Tipo: {INSTRUMENT_TYPE_LABELS[pos.instrumentType] || pos.instrumentType} • Aplicado: {formatCurrencyBRL(pos.acquisitionValue)}
                                </p>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-auto">
                                <div className="text-right">
                                  <span className="text-[10px] text-muted-foreground block">Valor Atual</span>
                                  <span className="font-bold text-base text-white">{formatCurrencyBRL(pos.currentValue)}</span>
                                </div>

                                <button
                                  onClick={() => setIsUpdateValueOpen(pos)}
                                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400"
                                  title="Atualizar Valor Manual"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => setIsRecordEventOpen(pos)}
                                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                                  title="Registrar Provento / Aporte"
                                >
                                  <Gift className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-right text-xs text-muted-foreground pt-1">
                          Subtotal Investimentos: <span className="font-bold text-emerald-400">{formatCurrencyBRL(inst.investmentBalance)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal + Adicionar Investimento */}
      {isAddPositionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white">Cadastrar Posição de Investimento</h2>
              <button onClick={() => setIsAddPositionOpen(false)} className="p-1 rounded-xl text-muted-foreground hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Conta de Custódia (Instituição)</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.financialInstitutionName} - {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Tipo de Investimento</label>
              <select
                value={instrumentType}
                onChange={(e) => setInstrumentType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
              >
                {INSTRUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Nome do Produto/Investimento</label>
              <input
                type="text"
                placeholder="ex: Tesouro IPCA+ 2035, CDB Banco X 110% CDI, Fundo BB"
                value={instrumentName}
                onChange={(e) => setInstrumentName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Ticker / Código (opcional)</label>
              <input
                type="text"
                placeholder="ex: PETR4, HGLG11"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Valor Aplicado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={acquisitionValueStr}
                  onChange={(e) => setAcquisitionValueStr(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Valor Atual (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={currentValueStr}
                  onChange={(e) => setCurrentValueStr(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setIsAddPositionOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">
                Cancelar
              </button>
              <button
                onClick={handleCreatePosition}
                disabled={loading || !instrumentName || !currentValueStr}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-white shadow-lg shadow-emerald-500/20"
              >
                {loading ? "Salvando..." : "Salvar Investimento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Atualizar Valor Manual */}
      {isUpdateValueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white">Atualizar Valor da Posição</h2>
              <button onClick={() => setIsUpdateValueOpen(null)} className="p-1 rounded-xl text-muted-foreground hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Produto: <span className="text-white font-bold">{isUpdateValueOpen.instrumentName}</span>
            </p>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Novo Valor Atual (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder={isUpdateValueOpen.currentValue.toString()}
                value={newValueStr}
                onChange={(e) => setNewValueStr(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xl font-bold text-white focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setIsUpdateValueOpen(null)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">
                Cancelar
              </button>
              <button
                onClick={handleUpdateValue}
                disabled={loading || !newValueStr}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-white shadow-lg shadow-cyan-500/20"
              >
                {loading ? "Atualizando..." : "Salvar Novo Valor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Provento / Aporte */}
      {isRecordEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white">Registrar Provento ou Aporte</h2>
              <button onClick={() => setIsRecordEventOpen(null)} className="p-1 rounded-xl text-muted-foreground hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Tipo de Evento</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
              >
                <option value="DIVIDEND">Dividendo (Recebido em Dinheiro)</option>
                <option value="JCP">JCP (Recebido em Dinheiro)</option>
                <option value="INCOME_RECEIVED">Rendimento (Recebido em Dinheiro)</option>
                <option value="CONTRIBUTION">Aporte na Posição (Adicionar Valor)</option>
                <option value="WITHDRAWAL">Resgate da Posição (Retirar Valor)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={eventAmountStr}
                onChange={(e) => setEventAmountStr(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xl font-bold text-white focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setIsRecordEventOpen(null)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">
                Cancelar
              </button>
              <button
                onClick={handleRecordEvent}
                disabled={loading || !eventAmountStr}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-white shadow-lg shadow-emerald-500/20"
              >
                {loading ? "Registrando..." : "Confirmar Evento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
