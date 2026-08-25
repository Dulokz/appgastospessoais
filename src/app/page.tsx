import { db } from "@/lib/db";
import { NetWorthService, AccountData, AssetData, LiabilityData } from "@/lib/services/net-worth.service";
import { formatCurrencyBRL } from "@/lib/decimal";
import { NetWorthCharts } from "@/components/dashboard/NetWorthCharts";
import {
  Wallet,
  TrendingUp,
  Building2,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  CircleDollarSign,
  Receipt,
  Landmark,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const user = await db.user.findFirst({
      include: {
        accounts: { where: { active: true } },
        assets: { where: { active: true } },
        investmentPositions: { where: { active: true } },
        liabilities: { where: { active: true } },
        netWorthSnapshots: { orderBy: { date: "asc" } },
      },
    });

    if (!user) return null;

    const currentMonthTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: startOfMonth, lt: startOfNextMonth },
      },
      include: { allocations: true },
    });

    const accounts: AccountData[] = user.accounts.map((a) => ({
      id: a.id,
      type: a.type as AccountData["type"],
      calculatedBalance: a.calculatedBalance.toString(),
      confirmedBalance: a.confirmedBalance?.toString(),
      active: a.active,
    }));

    const assets: AssetData[] = user.assets.map((a) => ({
      id: a.id,
      category: a.category as AssetData["category"],
      currentValue: a.currentValue.toString(),
      considerInNetWorth: a.considerInNetWorth,
      active: a.active,
    }));

    const liabilities: LiabilityData[] = user.liabilities.map((l) => ({
      id: l.id,
      currentBalance: l.currentBalance.toString(),
      active: l.active,
    }));

    const summary = NetWorthService.calculateSummary(accounts, assets, liabilities);
    const positionsTotal = user.investmentPositions.reduce((acc, pos) => acc + pos.currentValue.toNumber(), 0);
    summary.investmentAssets = summary.investmentAssets.add(positionsTotal);
    summary.totalAssets = summary.liquidAssets.add(summary.investmentAssets).add(summary.physicalAssets);
    summary.netWorth = summary.totalAssets.sub(summary.totalLiabilities);
    summary.liquidNetWorth = summary.liquidAssets.add(summary.investmentAssets).sub(summary.totalLiabilities);

    let income = 0;
    let expenses = 0;
    for (const tx of currentMonthTransactions) {
      if (tx.transactionType === "INCOME") income += tx.amount.toNumber();
      if (tx.transactionType === "EXPENSE") expenses += tx.amount.toNumber();
      if (tx.transactionType === "LIABILITY_PAYMENT") {
        for (const alloc of tx.allocations) {
          if (["EXPENSE", "INTEREST", "FEE"].includes(alloc.allocationType)) expenses += alloc.amount.toNumber();
        }
      }
    }

    const history = user.netWorthSnapshots.map((s) => ({
      dateStr: new Date(s.date).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      netWorth: s.netWorth.toNumber(),
      totalAssets: s.totalAssets.toNumber(),
      totalLiabilities: s.totalLiabilities.toNumber(),
    }));

    const previousNetWorth = history.length >= 2 ? history[history.length - 2].netWorth : null;
    const snapshotNetWorth = history.length ? history[history.length - 1].netWorth : summary.netWorth.toNumber();
    const netWorthChange = previousNetWorth === null ? null : snapshotNetWorth - previousNetWorth;
    const netWorthChangePct = previousNetWorth && previousNetWorth !== 0 ? (netWorthChange! / previousNetWorth) * 100 : null;

    const negativeAccounts = user.accounts.filter((a) => a.calculatedBalance.toNumber() < 0).length;
    const reconciliationAlerts = user.accounts.filter((a) => Math.abs(a.reconciliationDiff.toNumber()) > 0.01).length;

    return {
      summary,
      history,
      income,
      expenses,
      monthResult: income - expenses,
      negativeAccounts,
      reconciliationAlerts,
      activeLiabilities: user.liabilities.length,
      netWorthChange,
      netWorthChangePct,
    };
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
    return null;
  }
}

function MetricCard({
  label,
  value,
  detail,
  href,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: React.ElementType;
  danger?: boolean;
}) {
  return (
    <Link href={href} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 hover:bg-white/[0.045] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">{label}</p>
          <p className={`text-2xl font-bold mt-2 ${danger ? "text-rose-400" : "text-white"}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{detail}</p>
        </div>
        <Icon className={`w-5 h-5 ${danger ? "text-rose-400" : "text-muted-foreground"}`} />
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const summary = data?.summary;
  const netWorth = summary?.netWorth.toNumber() ?? 0;
  const totalAssets = summary?.totalAssets.toNumber() ?? 0;
  const totalLiabilities = summary?.totalLiabilities.toNumber() ?? 0;
  const liquidAssets = summary?.liquidAssets.toNumber() ?? 0;
  const investmentAssets = summary?.investmentAssets.toNumber() ?? 0;
  const physicalAssets = summary?.physicalAssets.toNumber() ?? 0;

  const allocations = [
    { name: "Disponível", value: liquidAssets, color: "#94a3b8" },
    { name: "Investimentos", value: investmentAssets, color: "#10b981" },
    { name: "Bens", value: physicalAssets, color: "#64748b" },
    { name: "Dívidas", value: totalLiabilities, color: "#f43f5e" },
  ];

  const totalAlerts = (data?.negativeAccounts ?? 0) + (data?.reconciliationAlerts ?? 0);
  const changePositive = (data?.netWorthChange ?? 0) >= 0;

  return (
    <div className="space-y-5 md:space-y-7">
      {/* MOBILE: síntese e ação rápida */}
      <section className="md:hidden space-y-4">
        <div className="pt-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">Patrimônio líquido</p>
          <h1 className="text-4xl font-black text-white tracking-tight mt-2">{formatCurrencyBRL(netWorth)}</h1>
          {data?.netWorthChange !== null && data?.netWorthChange !== undefined ? (
            <p className={`text-sm font-semibold mt-2 ${changePositive ? "text-emerald-400" : "text-rose-400"}`}>
              {changePositive ? "▲" : "▼"} {formatCurrencyBRL(Math.abs(data.netWorthChange))}
              {data.netWorthChangePct !== null ? ` (${Math.abs(data.netWorthChangePct).toFixed(1)}%)` : ""} desde o último fechamento
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">O histórico começa após o primeiro fechamento patrimonial.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Disponível" value={formatCurrencyBRL(liquidAssets)} detail="contas e caixa" href="/contas" icon={Wallet} />
          <MetricCard label="Investimentos" value={formatCurrencyBRL(investmentAssets)} detail="carteira consolidada" href="/investimentos" icon={TrendingUp} />
          <MetricCard label="Bens" value={formatCurrencyBRL(physicalAssets)} detail="imóveis e veículos" href="/meu-patrimonio" icon={Building2} />
          <MetricCard label="Dívidas" value={formatCurrencyBRL(totalLiabilities)} detail="passivos ativos" href="/dividas" icon={TrendingDown} danger />
        </div>

        <Link href="/resultado-mes" className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.025] p-4">
          <div>
            <p className="text-xs text-muted-foreground">Resultado deste mês</p>
            <p className={`text-xl font-bold mt-1 ${(data?.monthResult ?? 0) >= 0 ? "text-white" : "text-rose-400"}`}>
              {formatCurrencyBRL(data?.monthResult ?? 0)}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        {totalAlerts > 0 && (
          <Link href="/contas" className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{totalAlerts} {totalAlerts === 1 ? "item precisa" : "itens precisam"} de revisão</p>
              <p className="text-xs text-muted-foreground">Saldo negativo ou diferença de conciliação.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        )}
      </section>

      {/* DESKTOP: central de comando */}
      <section className="hidden md:block space-y-6">
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-8 rounded-3xl border border-white/8 bg-white/[0.025] p-7">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">Patrimônio líquido consolidado</p>
                <h1 className="text-5xl font-black text-white tracking-tight mt-3">{formatCurrencyBRL(netWorth)}</h1>
                <p className="text-sm text-muted-foreground mt-3">
                  {formatCurrencyBRL(totalAssets)} em ativos · {formatCurrencyBRL(totalLiabilities)} em passivos
                </p>
              </div>
              <Link href="/meu-patrimonio" className="text-xs font-semibold text-emerald-400 flex items-center gap-1 hover:underline">
                Ver patrimônio <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-white/8 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Variação desde o último fechamento</p>
                {data?.netWorthChange !== null && data?.netWorthChange !== undefined ? (
                  <p className={`text-2xl font-bold mt-1 ${changePositive ? "text-emerald-400" : "text-rose-400"}`}>
                    {changePositive ? "+" : "-"}{formatCurrencyBRL(Math.abs(data.netWorthChange))}
                    <span className="text-sm ml-2 font-semibold">{data.netWorthChangePct !== null ? `${data.netWorthChangePct.toFixed(1)}%` : ""}</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Sem fechamento anterior para comparar.</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Resultado financeiro do mês</p>
                <p className={`text-2xl font-bold mt-1 ${(data?.monthResult ?? 0) >= 0 ? "text-white" : "text-rose-400"}`}>
                  {formatCurrencyBRL(data?.monthResult ?? 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-4 rounded-3xl border border-white/8 bg-white/[0.025] p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">Situação agora</p>
            <div className="space-y-4 mt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><CircleDollarSign className="w-4 h-4" /> Entrou no mês</div>
                <span className="text-sm font-bold text-white">{formatCurrencyBRL(data?.income ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Receipt className="w-4 h-4" /> Saiu no mês</div>
                <span className="text-sm font-bold text-white">{formatCurrencyBRL(data?.expenses ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingDown className="w-4 h-4" /> Dívidas ativas</div>
                <span className="text-sm font-bold text-white">{data?.activeLiabilities ?? 0}</span>
              </div>
              <div className="pt-4 border-t border-white/8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="w-4 h-4" /> Revisões</div>
                  <span className={`text-sm font-bold ${totalAlerts > 0 ? "text-amber-400" : "text-emerald-400"}`}>{totalAlerts}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <MetricCard label="Disponível" value={formatCurrencyBRL(liquidAssets)} detail="contas correntes, poupança e dinheiro" href="/contas" icon={Wallet} />
          <MetricCard label="Investimentos" value={formatCurrencyBRL(investmentAssets)} detail="ações, fundos, renda fixa e corretoras" href="/investimentos" icon={TrendingUp} />
          <MetricCard label="Bens" value={formatCurrencyBRL(physicalAssets)} detail="imóveis, veículos e outros ativos" href="/meu-patrimonio" icon={Landmark} />
          <MetricCard label="Passivos" value={formatCurrencyBRL(totalLiabilities)} detail="financiamentos, cartões e empréstimos" href="/dividas" icon={TrendingDown} danger />
        </div>

        {data?.history && data.history.length > 0 ? (
          <NetWorthCharts history={data.history} allocations={allocations} />
        ) : (
          <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-8 text-center">
            <p className="font-semibold text-white">Evolução patrimonial</p>
            <p className="text-sm text-muted-foreground mt-2">O gráfico aparecerá após os primeiros fechamentos patrimoniais.</p>
          </div>
        )}
      </section>
    </div>
  );
}
