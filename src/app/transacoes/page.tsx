import { db } from "@/lib/db";
import { formatCurrencyBRL } from "@/lib/decimal";
import { TRANSACTION_TYPE_LABELS, ALLOCATION_TYPE_LABELS } from "@/lib/translations";
import { ArrowRightLeft, Plus, ArrowUpRight, ArrowDownRight, Layers, Shuffle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getTransactionsData() {
  try {
    const user = await db.user.findFirst({
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 100,
          include: {
            account: true,
            destinationAccount: true,
            category: true,
            allocations: {
              include: { category: true, asset: true, liability: true },
            },
          },
        },
      },
    });

    return user?.transactions || [];
  } catch (error) {
    console.error("Erro ao carregar transações:", error);
    return [];
  }
}

export default async function TransacoesPage() {
  const dbTransactions = await getTransactionsData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transações & Operações</h1>
          <p className="text-xs text-muted-foreground">Histórico real de movimentações registradas no seu patrimônio</p>
        </div>
      </div>

      {dbTransactions.length === 0 ? (
        <div className="glass-card p-8 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
          <ArrowRightLeft className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-white text-base">Nenhuma transação registrada</h3>
          <p className="text-xs text-muted-foreground">
            Utilize o botão <strong className="text-emerald-400">+ Registrar</strong> no topo para lançar seus gastos, receitas ou transferências.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dbTransactions.map((tx) => {
            const isCredit = tx.direction === "CREDIT";
            const isTransfer = tx.transactionType === "TRANSFER";
            const isSplit = tx.allocations.length > 1;
            const label = TRANSACTION_TYPE_LABELS[tx.transactionType] || tx.transactionType;

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
                            <Layers className="w-3 h-3" /> Detalhamento ({tx.allocations.length})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tx.account.name} {tx.destinationAccount ? `➔ ${tx.destinationAccount.name}` : ""} • {new Date(tx.date).toLocaleDateString("pt-BR")}
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
                      {isCredit ? "+" : "-"}{formatCurrencyBRL(tx.amount.toNumber())}
                    </span>
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                  </div>
                </div>

                {/* Detalhamento em Transações Desmembradas */}
                {isSplit && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5 bg-black/20 p-3 rounded-xl">
                    <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                      Detalhamento da movimentação:
                    </p>
                    {tx.allocations.map((alloc) => {
                      const allocLabel = ALLOCATION_TYPE_LABELS[alloc.allocationType] || alloc.allocationType;
                      return (
                        <div key={alloc.id} className="flex items-center justify-between text-xs text-slate-300">
                          <span>• {alloc.category?.name || alloc.asset?.name || alloc.liability?.name || allocLabel}</span>
                          <span className="font-mono font-semibold">{formatCurrencyBRL(alloc.amount.toNumber())}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
