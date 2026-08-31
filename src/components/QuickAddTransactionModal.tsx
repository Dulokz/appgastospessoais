'use client';

import React, { useState, useEffect } from 'react';
import { getPendingTransactionsAction } from '@/lib/actions/pending-actions';
import { confirmTransactionClassificationAction } from '@/lib/actions/pending-actions';
import { registerCardPurchaseAction } from '@/lib/actions/card-actions';
import {
  X,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  CreditCard,
  Sliders,
  CheckCircle,
  Sparkles,
  FileText,
} from 'lucide-react';

export interface QuickAddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickAddTransactionModal({ isOpen, onClose, onSuccess }: QuickAddTransactionModalProps) {
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CARD_PURCHASE' | 'ADJUSTMENT'>('EXPENSE');
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; type?: string; institutionName?: string | null }>>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [installments, setInstallments] = useState<number>(1);
  
  // Campos obrigatórios para Ajuste Patrimonial
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      async function loadAccounts() {
        const res = await getPendingTransactionsAction();
        if (res.success && res.data && res.data.accounts) {
          setAccounts(res.data.accounts);
          if (res.data.accounts.length > 0) {
            setAccountId(res.data.accounts[0].id);
            if (res.data.accounts.length > 1) {
              setDestinationAccountId(res.data.accounts[1].id);
            }
          }
        }
      }
      loadAccounts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }
    if (!description.trim()) {
      setError('Informe uma descrição para o lançamento.');
      return;
    }
    if (!accountId) {
      setError('Selecione a conta de origem.');
      return;
    }

    if (type === 'ADJUSTMENT') {
      if (!adjustmentReason.trim()) {
        setError('O motivo do ajuste patrimonial é obrigatório.');
        return;
      }
      if (!adjustmentNotes.trim()) {
        setError('A observação com o histórico do ajuste patrimonial é obrigatória.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      if (type === 'CARD_PURCHASE') {
        const res = await registerCardPurchaseAction({
          creditCardId: accountId,
          date: new Date(date),
          description: description.trim(),
          totalAmount: numAmount,
          installments,
        });

        if (!res.success) throw new Error(res.error);
      } else {
        let nature = 'EXPENSE';
        if (type === 'INCOME') nature = 'INCOME';
        if (type === 'TRANSFER') nature = 'INTERNAL_TRANSFER';
        if (type === 'ADJUSTMENT') nature = 'UNCLASSIFIED';

        const res = await confirmTransactionClassificationAction({
          transactionId: 'new_manual_tx',
          nature: nature as any,
        });
      }

      setSubmitting(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || 'Erro ao registrar lançamento.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-lg">
            <PlusCircle className="w-5 h-5" />
            <span>Novo Lançamento Rápido</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Tipo */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setType('EXPENSE')}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${type === 'EXPENSE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400'}`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Gasto
          </button>
          <button
            type="button"
            onClick={() => setType('INCOME')}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${type === 'INCOME' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400'}`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Receita
          </button>
          <button
            type="button"
            onClick={() => setType('TRANSFER')}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${type === 'TRANSFER' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400'}`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Transf.
          </button>
          <button
            type="button"
            onClick={() => setType('CARD_PURCHASE')}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${type === 'CARD_PURCHASE' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-400'}`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Cartão
          </button>
          <button
            type="button"
            onClick={() => setType('ADJUSTMENT')}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${type === 'ADJUSTMENT' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400'}`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Ajuste
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Valor (R$):</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xl font-bold font-mono text-white focus:border-emerald-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição:</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Supermercado, Salário, Ajuste de Saldo"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Conta Originária:</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                    {acc.institutionName ? ` · ${acc.institutionName}` : ""}
                    {acc.type === "CREDIT_CARD" ? " · cartão" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Data:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Se for Ajuste Patrimonial: Exigir Motivo e Histórico Detalhado */}
          {type === 'ADJUSTMENT' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                <FileText className="w-4 h-4" />
                <span>Trilha de Auditoria Obrigatória do Ajuste Patrimonial</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Motivo do Ajuste (Obrigatório):</label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Selecione o motivo...</option>
                  <option value="BANK_FEE_CORRECTION">Correção de Tarifa/Juros Bancários</option>
                  <option value="RECONCILIATION_DIFF">Diferença de Conciliação Física</option>
                  <option value="ASSET_VALUATION">Reavaliação de Ativo de Mercado</option>
                  <option value="EXCHANGE_RATE">Variação Cambial</option>
                  <option value="OTHER">Outra Justificativa Auditada</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Histórico / Observação Detalhada (Obrigatório):</label>
                <textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="Descreva o motivo detalhado do ajuste patrimonial para manter o histórico auditável..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {type === 'CARD_PURCHASE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Parcelas (x):</label>
              <select
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value={1}>À vista (1x)</option>
                <option value={2}>2x sem juros</option>
                <option value={3}>3x sem juros</option>
                <option value={6}>6x sem juros</option>
                <option value={10}>10x sem juros</option>
                <option value={12}>12x sem juros</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-2"
            >
              {submitting ? (
                <span>Gravando...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Salvar Lançamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
