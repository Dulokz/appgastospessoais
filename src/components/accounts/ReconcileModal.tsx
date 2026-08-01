"use client";

import { useState } from "react";
import { X, CheckCircle2, AlertTriangle, Scale } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/decimal";

interface ReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: {
    id: string;
    name: string;
    calculatedBalance: number;
  } | null;
  onSaveCheck: (accountId: string, reportedBalance: number, notes?: string) => void;
}

export function ReconcileModal({
  isOpen,
  onClose,
  account,
  onSaveCheck,
}: ReconcileModalProps) {
  const [reportedStr, setReportedStr] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  if (!isOpen || !account) return null;

  const calculated = account.calculatedBalance;
  const reported = reportedStr !== "" ? parseFloat(reportedStr) : calculated;
  const difference = reported - calculated;
  const hasDiff = Math.abs(difference) > 0.001;

  const handleSave = () => {
    onSaveCheck(account.id, reported, notes);
    setReportedStr("");
    setNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Conferir Saldo bancário</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-muted-foreground hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Conta selecionada:</p>
          <p className="text-sm font-bold text-white">{account.name}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <p className="text-xs text-muted-foreground">Saldo calculado pelo App:</p>
          <p className="text-xl font-extrabold text-emerald-400">{formatCurrencyBRL(calculated)}</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-semibold block mb-1">
            Saldo informado pelo Banco (R$)
          </label>
          <input
            type="number"
            step="0.01"
            placeholder={calculated.toString()}
            value={reportedStr}
            onChange={(e) => setReportedStr(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-lg font-bold text-white focus:outline-none focus:border-emerald-500"
            autoFocus
          />
        </div>

        {/* Exibição da Diferença */}
        <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
          hasDiff ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
        }`}>
          <div className="flex items-center justify-between font-bold">
            <span>Diferença encontrada:</span>
            <span>{hasDiff ? (difference > 0 ? "+" : "") + formatCurrencyBRL(difference) : "Exato (R$ 0,00)"}</span>
          </div>
          {hasDiff ? (
            <p className="text-[11px] text-amber-300/80">
              Existem {formatCurrencyBRL(Math.abs(difference))} de diferença entre seu banco e os lançamentos. O histórico de transações passadas não será alterado silenciosamente.
            </p>
          ) : (
            <p className="text-[11px] text-emerald-300/80">
              O saldo informado pelo banco é exatamente igual aos lançamentos registrados!
            </p>
          )}
        </div>

        {/* Observações */}
        <div>
          <label className="text-xs text-muted-foreground font-semibold block mb-1">Observações da conferência</label>
          <input
            type="text"
            placeholder="ex: Verificação via app do banco"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 text-xs font-semibold text-white">
            Cancelar
          </button>
          <button onClick={handleSave} className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-white shadow-lg shadow-emerald-500/20">
            Salvar Conferência
          </button>
        </div>
      </div>
    </div>
  );
}
