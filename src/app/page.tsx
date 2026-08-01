import { db } from "@/lib/db";
import { NetWorthService, AccountData, AssetData, LiabilityData } from "@/lib/services/net-worth.service";
import { formatCurrencyBRL } from "@/lib/decimal";
import { ACCOUNT_TYPE_LABELS, TRANSACTION_TYPE_LABELS } from "@/lib/translations";
import { NetWorthCharts } from "@/components/dashboard/NetWorthCharts";
import {
  Wallet,
  TrendingUp,
  Building,
  TrendingDown,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Shuffle,
  Layers,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  try {
    const user = await db.user.findFirst({
      include: {
        accounts: { where: { active: true } },
        assets: { where: { active: true } },
        investmentPositions: { where: { active: true } },
        liabilities: { where: { active: true } },
        netWorthSnapshots: {
          orderBy: { date: "asc" },
        },
        transactions: {
          orderBy: { date: "desc" },
          take: 10,
          include: {
            account: true,
            destinationAccount: true,
            category: true,
            allocations: {
              include: { category: true },
            },
          },
        },
      },
    });

    if (!user) return null;

    const accounts: AccountData[] = user.accounts.map((a) => ({
      id: a.id,
      type: a.type as any,
      calculatedBalance: a.calculatedBalance.toString(),
      confirmedBalance: a.confirmedBalance?.toString(),
      active: a.active,
    }));

    const assets: AssetData[] = user.assets.map((a) => ({
      id: a.id,
      category: a.category as any,
      currentValue: a.currentValue.toString(),
      considerInNetWorth: a.considerInNetWorth,
      active: a.active,
    }));

    // Adicionar Posições de Investimento aos Ativos de Investimento
    const investmentPositionTotal = user.investmentPositions.reduce(
      (acc, pos) => acc + pos.currentValue.toNumber(),
      0
    );

    const liabilities: LiabilityData[] = user.liabilities.map((l) => ({
      id: l.id,
      currentBalance: l.currentBalance.toString(),
      active: l.active,
    }));

    const summary = NetWorthService.calculateSummary(accounts, assets, liabilities);

    // Somar posições financeiras de investimento ao total de investimentos
    summary.investmentAssets = summary.investmentAssets.add(investmentPositionTotal);
    summary.totalAssets = summary.liquidAssets.add(summary.investmentAssets).add(summary.physicalAssets);
    summary.netWorth = summary.totalAssets.sub(summary.totalLiabilities);

    const history = user.netWorthSnapshots.map((s) => ({
      dateStr: new Date(s.date).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      netWorth: s.netWorth.toNumber(),
      totalAssets: s.totalAssets.toNumber(),
      totalLiabilities: s.totalLiabilities.toNumber(),
    }));

    // Receitas e Despesas do mês atual calculadas das transações reais
    let currentMonthIncome = 0;
    let currentMonthExpenses = 0;

    for (const tx of user.transactions) {
      if (tx.transactionType === "INCOME") {
        currentMonthIncome += tx.amount.toNumber();
      } else if (tx.transactionType === "EXPENSE" || tx.transactionType === "LIABILITY_PAYMENT") {
        // Se houver allocations desmembradas, considera apenas a parte de despesa/juros/tarifas
        if (tx.allocations && tx.allocations.length > 0) {
          for (const alloc of tx.allocations) {
            if (alloc.allocationType === "EXPENSE" || alloc.allocationType === "INTEREST" || alloc.allocationType === "FEE") {
              currentMonthExpenses += alloc.amount.toNumber();
            }
          }
        } else if (tx.transactionType === "EXPENSE") {
          currentMonthExpenses += tx.amount.toNumber();
        }
      }
    }

    return {
      user,
      summary,
      history,
      accounts: user.accounts,
      assets: user.assets,
      liabilities: user.liabilities,
      recentTransactions: user.transactions,
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthResult: currentMonthIncome - currentMonthExpenses,
    };
  } catch (error) {
    console.error("Erro ao carregar dados do banco:", error);
    return null;
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const hasData = data && (data.accounts.length > 0 || data.assets.length > 0 || data.liabilities.length > 0);

  const summary = data?.summary || {
    liquidAssets: new (require("@/lib/decimal").Decimal)(0),
    investmentAssets: new (require("@/lib/decimal").Decimal)(0),
    physicalAssets: new (require("@/lib/decimal").Decimal)(0),
    totalAssets: new (require("@/lib/decimal").Decimal)(0),
    totalLiabilities: new (require("@/lib/decimal").Decimal)(0),
    netWorth: new (require("@/lib/decimal").Decimal)(0),
    liquidNetWorth: new (require("@/lib/decimal").Decimal)(0),
  };

  const history = data?.history || [];

  const allocations = [
    { name: "Disponível", value: summary.liquidAssets.toNumber(), color: "#06b6d4" },
    { name: "Investimentos", value: summary.investmentAssets.toNumber(), color: "#10b981" },
    { name: "Bens", value: summary.physicalAssets.toNumber(), color: "#a855f7" },
    { name: "Dívidas", value: summary.totalLiabilities.toNumber(), color: "#f43f5e" },
  ];

  return (
    <div className="space-y-8">
      {/* Header Principal de Patrimônio Líquido */}
      <div className="glass-card p-6 md:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                Patrimônio Líquido Consolidado
              </span>
            </div>
            <div className="text-4xl md:text-5xl font-black text-white tracking-tight">
              {formatCurrencyBRL(summary.netWorth)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total de Ativos ({formatCurrencyBRL(summary.totalAssets)}) menos Passivos Totais ({formatCurrencyBRL(summary.totalLiabilities)})
            </p>
          </div>

          {!hasData && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
              <p className="font-bold">Bem-vindo ao Aegis Riqueza!</p>
              <p className="text-emerald-300/80">Comece cadastrando suas contas, bens e investimentos para ver a evolução patrimonial real.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cartões dos 4 Pilares Patrimoniais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/contas" className="glass-card p-5 rounded-2xl block group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dinheiro Disponível</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-all">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrencyBRL(summary.liquidAssets)}
          </div>
          <p className="text-xs text-muted-foreground">Contas correntes, poupança e carteira</p>
        </Link>

        <Link href="/patrimonio" className="glass-card p-5 rounded-2xl block group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Investimentos</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrencyBRL(summary.investmentAssets)}
          </div>
          <p className="text-xs text-muted-foreground">Tesouro, Ações, FIIs e saldo corretora</p>
        </Link>

        <Link href="/patrimonio" className="glass-card p-5 rounded-2xl block group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bens Patrimoniais</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-all">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrencyBRL(summary.physicalAssets)}
          </div>
          <p className="text-xs text-muted-foreground">Imóveis, veículos e equipamentos</p>
        </Link>

        <Link href="/dividas" className="glass-card p-5 rounded-2xl block group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dívidas (Passivos)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 transition-all">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 mb-1">
            {formatCurrencyBRL(summary.totalLiabilities)}
          </div>
          <p className="text-xs text-muted-foreground">Financiamentos e empréstimos</p>
        </Link>
      </div>

      {/* Bloco Este Mês */}
      <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-white text-base">Este Mês (Movimentações Reais)</h3>
          <p className="text-xs text-muted-foreground">Resumo de receitas operacionais e despesas de consumo</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="glass-panel px-4 py-2 rounded-xl border border-emerald-500/20 text-center">
            <span className="text-[10px] text-muted-foreground uppercase block">Recebi</span>
            <span className="text-sm font-bold text-emerald-400">+{formatCurrencyBRL(data?.currentMonthIncome || 0)}</span>
          </div>

          <div className="glass-panel px-4 py-2 rounded-xl border border-rose-500/20 text-center">
            <span className="text-[10px] text-muted-foreground uppercase block">Gastei</span>
            <span className="text-sm font-bold text-rose-400">-{formatCurrencyBRL(data?.currentMonthExpenses || 0)}</span>
          </div>

          <div className="glass-panel px-4 py-2 rounded-xl border border-white/10 text-center">
            <span className="text-[10px] text-muted-foreground uppercase block">Resultado</span>
            <span className="text-sm font-bold text-white">{formatCurrencyBRL(data?.currentMonthResult || 0)}</span>
          </div>
        </div>
      </div>

      {/* Gráficos de Evolução & Alocação */}
      {history.length > 0 ? (
        <NetWorthCharts history={history} allocations={allocations} />
      ) : (
        <div className="glass-card p-8 rounded-2xl text-center text-xs text-muted-foreground space-y-2">
          <p className="font-bold text-white">Histórico de Evolução Patrimonial</p>
          <p>O gráfico de evolução histórica será disponibilizado após os primeiros registros do seu patrimônio.</p>
        </div>
      )}

      {/* Feed de Transações Recentes */}
      {data?.recentTransactions && data.recentTransactions.length > 0 && (
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Últimas Movimentações</h3>
            <Link href="/transacoes" className="text-xs text-emerald-400 hover:underline font-semibold">
              Ver todas
            </Link>
          </div>

          <div className="space-y-2.5">
            {data.recentTransactions.map((tx) => {
              const isCredit = tx.direction === "CREDIT";
              const isTransfer = tx.transactionType === "TRANSFER";
              const label = TRANSACTION_TYPE_LABELS[tx.transactionType] || tx.transactionType;

              return (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-xs">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isTransfer ? "bg-purple-500/20 text-purple-400" : isCredit ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                      {isTransfer ? <Shuffle className="w-4 h-4" /> : isCredit ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-white">{tx.description}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {tx.account.name} {tx.destinationAccount ? `➔ ${tx.destinationAccount.name}` : ""} • {label}
                      </p>
                    </div>
                  </div>

                  <span className={`font-bold text-sm ${isTransfer ? "text-purple-400" : isCredit ? "text-emerald-400" : "text-white"}`}>
                    {isCredit ? "+" : "-"}{formatCurrencyBRL(tx.amount.toNumber())}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
