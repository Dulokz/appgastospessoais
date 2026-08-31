'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getPendingTransactionsAction,
  confirmTransactionClassificationAction,
  ignoreTransactionAction,
  PendingTransactionsData,
} from '@/lib/actions/pending-actions';
import {
  countMatchingPendingTransactionsAction,
  createClassificationRuleAction,
} from '@/lib/actions/rule-actions';
import {
  getBbAutoRedemptionSuggestionsAction,
  confirmBbAutoRedemptionAction,
  generateMissingBbResgateAction,
  unpairBbAutoRedemptionAction,
} from '@/lib/actions/bb-auto-actions';
import { CategoryPickerModal } from '@/components/CategoryPickerModal';
import { CreateRuleModal } from '@/components/CreateRuleModal';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  ArrowRight,
  Filter,
  Sparkles,
  ArrowLeftRight,
  Lock,
  Layers,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  RefreshCw,
  PlusCircle,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';

const NATURE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'INCOME', label: 'Receita Real' },
  { value: 'EXPENSE', label: 'Despesa / Consumo' },
  { value: 'INTERNAL_TRANSFER', label: 'Transferência Própria (Excluído da DRE)' },
  { value: 'INVESTMENT_CONTRIBUTION', label: 'Aporte em Investimento' },
  { value: 'INVESTMENT_REDEMPTION', label: 'Resgate de Investimento' },
  { value: 'ASSET_ACQUISITION', label: 'Aquisição de Ativo' },
  { value: 'DEBT_PRINCIPAL', label: 'Amortização de Dívida' },
  { value: 'DEBT_INTEREST', label: 'Juros / IOF' },
  { value: 'CREDIT_CARD_PAYMENT', label: 'Pagamento de Fatura' },
  { value: 'THIRD_PARTY_EXPENSE', label: 'Gasto de Terceiros' },
  { value: 'REFUND', label: 'Reembolso / Estorno' },
  { value: 'UNCLASSIFIED', label: 'Não Classificado' },
];

export default function PendingTransactionsPage() {
  const [data, setData] = useState<PendingTransactionsData | null>(null);
  const [bbSuggestions, setBbSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'LIVE' | 'HISTORICAL' | 'FLAGGED'>('ALL');

  // Modais de Categoria e Regra
  const [categoryModalTxId, setCategoryModalTxId] = useState<string | null>(null);
  const [ruleModalTx, setRuleModalTx] = useState<any | null>(null);
  const [generatingResgateForId, setGeneratingResgateForId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [pendingRes, bbRes] = await Promise.all([
      getPendingTransactionsAction(),
      getBbAutoRedemptionSuggestionsAction(),
    ]);

    if (pendingRes.success && pendingRes.data) {
      setData(pendingRes.data);
    } else {
      setError(pendingRes.error || 'Erro ao carregar transações pendentes.');
    }

    if (bbRes.success && bbRes.suggestions) {
      setBbSuggestions(bbRes.suggestions);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const filteredTxs = (data?.transactions || []).filter((tx) => {
    if (filterMode === 'LIVE') return tx.periodType === 'LIVE_CONTROL';
    if (filterMode === 'HISTORICAL') return tx.periodType === 'HISTORICAL_IMPORT';
    if (filterMode === 'FLAGGED') return tx.classificationStatus === 'FLAGGED_DUPLICATE';
    return true;
  });

  const handleConfirm = async (
    txId: string,
    nature: string,
    categoryId?: string | null,
    subcategoryId?: string | null
  ) => {
    const tx = data?.transactions.find((t) => t.id === txId);
    if (!tx) return;

    const targetNature = (nature as any) || tx.nature || 'EXPENSE';
    const targetCategory = categoryId !== undefined ? categoryId : tx.categoryId;
    const targetSubcategory = subcategoryId !== undefined ? subcategoryId : tx.subcategoryId;

    const res = await confirmTransactionClassificationAction({
      transactionId: txId,
      nature: targetNature,
      categoryId: targetCategory,
      subcategoryId: targetSubcategory,
      counterpartyName: tx.counterpartyName,
    });

    if (res.success) {
      loadPending();
    } else {
      alert(res.error || 'Erro ao confirmar lançamento.');
    }
  };

  const handleConfirmBbRedemption = async (
    txId: string,
    matchedTxId?: string,
    createSavingsAcc: boolean = true,
    targetAccId?: string
  ) => {
    const res = await confirmBbAutoRedemptionAction({
      transactionId: txId,
      matchedTransactionId: matchedTxId,
      createSavingsAccountIfMissing: createSavingsAcc,
      targetAccountId: targetAccId,
    });

    if (res.success) {
      loadPending();
    } else {
      alert(res.error || 'Erro ao confirmar resgate automático.');
    }
  };

  const handleGenerateMissingBbResgate = async (txId: string) => {
    setGeneratingResgateForId(txId);
    const res = await generateMissingBbResgateAction(txId);
    setGeneratingResgateForId(null);

    if (res.success) {
      loadPending();
    } else {
      alert(res.error || 'Erro ao gerar lançamento automático de Resgate Poupança BB.');
    }
  };

  const handleIgnore = async (txId: string) => {
    const res = await ignoreTransactionAction(txId);
    if (res.success) {
      loadPending();
    }
  };

  const handleCreateNewCategory = async (name: string) => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const cData = await res.json();
      if (cData.category && categoryModalTxId) {
        handleConfirm(categoryModalTxId, 'EXPENSE', cData.category.id);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center space-x-3 text-emerald-400">
          <Zap className="w-6 h-6 animate-spin" />
          <span className="text-lg font-medium">Carregando Fila de Triagem Financeira...</span>
        </div>
      </div>
    );
  }

  const formatEffectiveDate = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const activeCategoryModalTx = data?.transactions.find((t) => t.id === categoryModalTxId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                Caixa de Entrada Financeira
              </h1>
              <p className="text-slate-400 text-sm">
                Triagem rápida e confirmação por linha dos lançamentos pendentes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">PENDENTES</span>
            <span className="text-lg font-extrabold font-mono text-emerald-400">
              {data?.summary.totalPending || 0}
            </span>
          </div>

          <Link
            href="/transacoes"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5"
          >
            <span>Ver Extrato Completo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* BANNERS DE SUGESTÃO AUTOMÁTICA BB */}
      {bbSuggestions.length > 0 && (
        <div className="space-y-3">
          {bbSuggestions.map((sug, idx) => (
            <div
              key={idx}
              className="bg-purple-950/40 border border-purple-500/40 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Identificado Resgate/Aplicação Automática do Banco do Brasil</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] uppercase font-bold">
                      Movimentação Própria
                    </span>
                  </h4>
                  <p className="text-xs text-purple-200/80 mt-0.5">{sug.message}</p>
                </div>
              </div>

              <button
                onClick={() =>
                  handleConfirmBbRedemption(
                    sug.redemptionTx.id,
                    sug.matchingDebitTx?.id,
                    true
                  )
                }
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl text-xs shadow-lg transition-all flex items-center space-x-1.5 self-end md:self-auto"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirmar Resgate Próprio</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FILTROS E MODO DE EXIBIÇÃO */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'ALL'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas Pendências ({data?.summary.totalPending || 0})
          </button>
        </div>
      </div>

      {/* LISTA DE LANÇAMENTOS PENDENTES DA FILA */}
      {filteredTxs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center space-y-4 max-w-lg mx-auto shadow-2xl">
          <ShieldCheck className="w-16 h-16 text-emerald-400 mx-auto" />
          <h3 className="text-xl font-bold text-white">Tudo em dia! Nenhuma pendência na Caixa de Entrada.</h3>
          <p className="text-xs text-slate-400">
            Todos os seus lançamentos importados foram devidamente classificados e pareados.
          </p>
          <div className="pt-2">
            <Link
              href="/transacoes"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition-all shadow-lg"
            >
              <span>Ver Extrato Completo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTxs.map((tx) => {
            const isCredit = tx.direction === 'CREDIT';
            const catName = data?.categories.find((c) => c.id === tx.categoryId)?.name || tx.categoryName || 'Não classificado';

            return (
              <div
                key={tx.id}
                className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl hover:border-slate-700 transition-all"
              >
                {/* Linha 1: Metadados e Tags */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                        isCredit
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isCredit ? '↗ ' : '↘ '}
                      {formatEffectiveDate(tx.date)} • {isCredit ? 'Entrada' : 'Saída'}
                    </span>

                    <span className="text-slate-400 text-[11px] flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-slate-500" />
                      <span>{tx.accountName}</span>
                      <span>• Importado do extrato (OFX)</span>
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                    [{catName}]
                  </span>
                </div>

                {/* Linha 2: Descrição da Transação e Valor */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      {tx.originalDescription || tx.description}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">FITID: {tx.fitId || 'N/A'}</p>
                  </div>

                  <div className="text-left md:text-right flex-shrink-0">
                    <div className={`text-2xl font-extrabold font-mono ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isCredit ? '+' : '−'} R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Linha 3: Controles Rápidos de Classificação por Linha */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/40">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Seletor de Natureza */}
                    <div className="flex items-center space-x-1.5">
                      <label className="text-xs font-semibold text-slate-400">Natureza:</label>
                      <select
                        value={tx.nature}
                        onChange={(e) => handleConfirm(tx.id, e.target.value, tx.categoryId)}
                        className="bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-1.5 focus:border-emerald-500 focus:outline-none"
                      >
                        {NATURE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Botão Modal Pesquisar Categoria */}
                    <div className="flex items-center space-x-1.5">
                      <label className="text-xs font-semibold text-slate-400">Categoria:</label>
                      <button
                        type="button"
                        onClick={() => setCategoryModalTxId(tx.id)}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-purple-300 font-medium transition-all flex items-center space-x-1.5 max-w-[180px] truncate"
                      >
                        <Tag className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span className="truncate">{catName}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Botão de Criar Regra Inteligente */}
                    <button
                      onClick={() => setRuleModalTx(tx)}
                      className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 font-bold rounded-xl text-xs transition-all flex items-center space-x-1"
                      title="Criar regra para classificar lançamentos iguais automaticamente no futuro"
                    >
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      <span>⚡ Criar Regra</span>
                    </button>

                    {/* Botão inteligente para criar Resgate Poupança BB em 1-clique para saídas */}
                    {!isCredit && (
                      <button
                        onClick={() => handleGenerateMissingBbResgate(tx.id)}
                        disabled={generatingResgateForId === tx.id}
                        className="px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/40 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5"
                        title="Gerar crédito de Resgate Poupança BB equivalente para equilibrar o saldo e ISOLAR da DRE"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>
                          {generatingResgateForId === tx.id
                            ? 'Gerando...'
                            : `⚡ Gerar Resgate Poupança BB (+ R$ ${Math.abs(tx.amount).toFixed(2)})`}
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => handleConfirm(tx.id, tx.nature, tx.categoryId)}
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirmar (C)</span>
                    </button>

                    <button
                      onClick={() => handleIgnore(tx.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs transition-all"
                      title="Ignorar Lançamento"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Busca de Categorias Hierárquicas */}
      <CategoryPickerModal
        isOpen={Boolean(categoryModalTxId)}
        onClose={() => setCategoryModalTxId(null)}
        categories={data?.categories || []}
        selectedCategoryId={activeCategoryModalTx?.categoryId}
        selectedSubcategoryId={activeCategoryModalTx?.subcategoryId}
        onSelectCategory={(catId, subcatId) => {
          if (categoryModalTxId) {
            handleConfirm(categoryModalTxId, activeCategoryModalTx?.nature || 'EXPENSE', catId, subcatId);
          }
        }}
        onCreateNewCategory={handleCreateNewCategory}
      />

      {/* Modal de Regra Inteligente */}
      {ruleModalTx && (
        <CreateRuleModal
          isOpen={Boolean(ruleModalTx)}
          onClose={() => setRuleModalTx(null)}
          initialDescription={ruleModalTx.description || ruleModalTx.originalDescription || ''}
          initialNature={ruleModalTx.nature || 'EXPENSE'}
          initialCategoryId={ruleModalTx.categoryId}
          categories={data?.categories || []}
          onSuccess={() => loadPending()}
        />
      )}
    </div>
  );
}
