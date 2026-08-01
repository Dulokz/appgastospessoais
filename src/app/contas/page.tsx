"use client";

import { useState } from "react";
import { formatCurrencyBRL } from "@/lib/decimal";
import { Wallet, Plus, Building2, CheckCircle2, Scale } from "lucide-react";
import { ReconcileModal } from "@/components/accounts/ReconcileModal";

const initialAccounts = [
  { id: "1", name: "Banco do Brasil", institution: "Banco do Brasil", type: "CHECKING", balance: 15400.0, confirmed: 15400.0, diff: 0 },
  { id: "2", name: "Sicredi", institution: "Sicredi", type: "CHECKING", balance: 8250.5, confirmed: 8250.5, diff: 0 },
  { id: "3", name: "Sicoob", institution: "Sicoob", type: "SAVINGS", balance: 25000.0, confirmed: 25000.0, diff: 0 },
  { id: "4", name: "Bradesco", institution: "Bradesco", type: "CHECKING", balance: 0.0, confirmed: 0.0, diff: 0 },
  { id: "5", name: "XP Investimentos (Caixa)", institution: "XP Investimentos", type: "BROKERAGE", balance: 1200.0, confirmed: 1200.0, diff: 0 },
];

export default function ContasPage() {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [reconcileAccount, setReconcileAccount] = useState<any | null>(null);

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  const handleSaveCheck = (accountId: string, reportedBalance: number, notes?: string) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id === accountId) {
          const diff = reportedBalance - a.balance;
          return { ...a, confirmed: reportedBalance, diff };
        }
        return a;
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Contas Financeiras & Liquidez</h1>
          <p className="text-xs text-muted-foreground">Instituições bancárias, cooperativas, corretoras e carteiras</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Cadastrar Conta</span>
        </button>
      </div>

      {/* Card de Resumo de Liquidez */}
      <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-cyan-500/20 text-cyan-400">
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Saldo Líquido em Custódia</p>
            <h2 className="text-3xl font-black text-white">{formatCurrencyBRL(totalBalance)}</h2>
          </div>
        </div>

        <div className="glass-panel px-4 py-2.5 rounded-xl border border-white/10 text-xs text-muted-foreground">
          Fonte da verdade: <span className="text-emerald-400 font-semibold">Conciliado via AccountBalanceSnapshot</span>
        </div>
      </div>

      {/* Grid de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((account) => (
          <div key={account.id} className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{account.name}</h3>
                  <p className="text-xs text-muted-foreground">{account.institution}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[11px] font-semibold">
                {account.type}
              </span>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-end justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Saldo Calculado pelo App</p>
                <p className="text-xl font-extrabold text-white">{formatCurrencyBRL(account.balance)}</p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() =>
                    setReconcileAccount({
                      id: account.id,
                      name: account.name,
                      calculatedBalance: account.balance,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-emerald-400 transition-all"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Conferir Saldo</span>
                </button>
                {account.diff !== 0 && (
                  <span className="text-[11px] font-semibold text-amber-400">
                    Diferença: {account.diff > 0 ? "+" : ""}{formatCurrencyBRL(account.diff)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ReconcileModal
        isOpen={!!reconcileAccount}
        onClose={() => setReconcileAccount(null)}
        account={reconcileAccount}
        onSaveCheck={handleSaveCheck}
      />
    </div>
  );
}
