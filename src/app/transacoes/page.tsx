import { formatCurrencyBRL } from "@/lib/decimal";
import { ArrowRightLeft, Plus, ArrowUpRight, ArrowDownRight, Layers, Shuffle } from "lucide-react";

const mockTransactions = [
  {
    id: "tx-1",
    date: "01/08/2026",
    description: "Pagamento Parcela 80/360 Financiamento CEF",
    account: "Conta Corrente BB",
    amount: 2450.0,
    direction: "DEBIT",
    type: "LIABILITY_PAYMENT",
    allocations: [
      { type: "LIABILITY_REDUCTION", amount: 1650.0, label: "Amortização de Dívida" },
      { type: "INTEREST", amount: 720.0, label: "Juros de Financiamento" },
      { type: "FEE", amount: 80.0, label: "Tarifa / Seguro Habitação" },
    ],
  },
  {
    id: "tx-2",
    date: "30/07/2026",
    description: "Transferência para Aporte na Corretora XP",
    account: "Conta Salário Sicredi",
    destAccount: "Conta Investimento XP",
    amount: 5000.0,
    direction: "DEBIT",
    type: "TRANSFER",
    allocations: [{ type: "TRANSFER", amount: 5000.0, label: "Transferência Interna Neutra" }],
  },
  {
    id: "tx-3",
    date: "28/07/2026",
    description: "Supermercado Carrefour",
    account: "Conta Corrente BB",
    amount: 680.5,
    direction: "DEBIT",
    type: "EXPENSE",
    allocations: [{ type: "EXPENSE", amount: 680.5, label: "Alimentação -> Mercado" }],
  },
  {
    id: "tx-4",
    date: "25/07/2026",
    description: "Recebimento de Salário Mensal",
    account: "Conta Salário Sicredi",
    amount: 12500.0,
    direction: "CREDIT",
    type: "INCOME",
    allocations: [{ type: "INCOME", amount: 12500.0, label: "Receitas -> Salário" }],
  },
];

export default function TransacoesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transações & Operações</h1>
          <p className="text-xs text-muted-foreground">Registro de receitas, despesas, transferências neutras e desmembramentos (Allocations)</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all">
            <Plus className="w-4 h-4" />
            <span>Nova Transação</span>
          </button>
        </div>
      </div>

      {/* Lista de Transações com Allocations e Transferências */}
      <div className="space-y-3">
        {mockTransactions.map((tx) => {
          const isCredit = tx.direction === "CREDIT";
          const isTransfer = tx.type === "TRANSFER";
          const isSplit = tx.allocations.length > 1;

          return (
            <div key={tx.id} className="glass-card p-5 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      isTransfer
                        ? "bg-purple-500/20 text-purple-400"
                        : isCredit
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {isTransfer ? (
                      <Shuffle className="w-5 h-5" />
                    ) : isCredit ? (
                      <ArrowDownRight className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">{tx.description}</h3>
                      {isSplit && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-semibold border border-cyan-500/20">
                          <Layers className="w-3 h-3" /> Desmembrada ({tx.allocations.length})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tx.account} {tx.destAccount ? `➔ ${tx.destAccount}` : ""} • {tx.date}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span
                    className={`text-base font-extrabold ${
                      isTransfer
                        ? "text-purple-400"
                        : isCredit
                        ? "text-emerald-400"
                        : "text-white"
                    }`}
                  >
                    {isCredit ? "+" : "-"}{formatCurrencyBRL(tx.amount)}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {isTransfer ? "Sem impacto no Patrimônio" : tx.type}
                  </p>
                </div>
              </div>

              {/* Detalhamento de Allocations em Transações Desmembradas */}
              {isSplit && (
                <div className="pt-2 border-t border-white/5 space-y-1.5 bg-black/20 p-3 rounded-xl">
                  <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                    Efeitos Econômicos (Allocations):
                  </p>
                  {tx.allocations.map((alloc, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                      <span>• {alloc.label}</span>
                      <span className="font-mono font-semibold">{formatCurrencyBRL(alloc.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
