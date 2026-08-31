'use client';

import React, { useState } from 'react';
import { X, Sparkles, Zap, Check, AlertCircle } from 'lucide-react';
import { createClassificationRuleAction, countMatchingPendingTransactionsAction } from '@/lib/actions/rule-actions';

interface CreateRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDescription?: string;
  initialNature?: string;
  initialCategoryId?: string | null;
  categories: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

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
];

export function CreateRuleModal({
  isOpen,
  onClose,
  initialDescription = '',
  initialNature = 'EXPENSE',
  initialCategoryId = null,
  categories,
  onSuccess,
}: CreateRuleModalProps) {
  const [matchValue, setMatchValue] = useState<string>(initialDescription);
  const [nature, setNature] = useState<string>(initialNature);
  const [categoryId, setCategoryId] = useState<string>(initialCategoryId || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [affectedCount, setAffectedCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handlePreview = async () => {
    if (!matchValue.trim()) return;
    setLoading(true);
    const res = await countMatchingPendingTransactionsAction({
      matchValue: matchValue.trim(),
    });
    setLoading(false);
    if (res.success) {
      setAffectedCount(res.affectedCount || 0);
    }
  };

  const handleCreateRule = async () => {
    if (!matchValue.trim()) return;
    setLoading(true);

    const res = await createClassificationRuleAction({
      name: `Regra: ${matchValue.trim()}`,
      matchValue: matchValue.trim(),
      nature: nature as any,
      categoryId: categoryId || undefined,
      applyToExistingPending: true,
    });

    setLoading(false);

    if (res.success) {
      alert(`⚡ Regra de automação criada com sucesso! ${res.affectedCount || 0} lançamento(s) categorizado(s) automaticamente.`);
      onSuccess();
      onClose();
    } else {
      alert(res.error || 'Erro ao criar regra.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">⚡ Criar Regra de Automação</h2>
              <p className="text-xs text-slate-400">Classificar lançamentos semelhantes automaticamente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Quando a descrição contiver o texto:
            </label>
            <input
              type="text"
              value={matchValue}
              onChange={(e) => setMatchValue(e.target.value)}
              placeholder="ex: RESGATE POUPANÇA, MAIRA FAITA, UBER"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Classificar Natureza como:</label>
            <select
              value={nature}
              onChange={(e) => setNature(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {NATURE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">E Vincular à Categoria:</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Sem Categoria Específica</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prévia de Lançamentos Afetados */}
        {affectedCount !== null && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
            <div className="font-bold flex items-center space-x-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Esta regra irá classificar {affectedCount} lançamento(s) pendente(s) agora mesmo!</span>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePreview}
            disabled={loading || !matchValue.trim()}
            className="text-xs font-semibold text-slate-400 hover:text-white"
          >
            Ver Prévia
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateRule}
              disabled={loading || !matchValue.trim()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{loading ? 'Salvando...' : 'Salvar e Aplicar Regra'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
