import { db } from "@/lib/db";
import { NetWorthService, AccountData, AssetData, LiabilityData } from "@/lib/services/net-worth.service";
import { formatCurrencyBRL, formatPercent } from "@/lib/decimal";
import { NetWorthCharts } from "@/components/dashboard/NetWorthCharts";
import {
  Wallet,
  TrendingUp,
  Building,
  TrendingDown,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  try {
    const user = await db.user.findFirst({
      include: {
        accounts: true,
        assets: true,
        liabilities: true,
        netWorthSnapshots: {
          orderBy: { date: "asc" },
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

    const liabilities: LiabilityData[] = user.liabilities.map((l) => ({
      id: l.id,
      currentBalance: l.currentBalance.toString(),
      active: l.active,
    }));

    const summary = NetWorthService.calculateSummary(accounts, assets, liabilities);

    // Formatar histórico de snapshots
    const history = user.netWorthSnapshots.map((s) => ({
      dateStr: new Date(s.date).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      netWorth: s.netWorth.toNumber(),
      totalAssets: s.totalAssets.toNumber(),
      totalLiabilities: s.totalLiabilities.toNumber(),
    }));

    return { user, summary, history, accounts: user.accounts, assets: user.assets, liabilities: user.liabilities };
  } catch (error) {
    console.error("Erro ao carregar dados do banco:", error);
    return null;
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  // Dados computados ou fallback seguro para renderização inicial
  const summary = data?.summary || {
    liquidAssets: new (require("@/lib/decimal").Decimal)(48650.5),
    investmentAssets: new (require("@/lib/decimal").Decimal)(96100.0),
    physicalAssets: new (require("@/lib/decimal").Decimal)(545000.0),
    totalAssets: new (require("@/lib/decimal").Decimal)(689750.5),
    totalLiabilities: new (require("@/lib/decimal").Decimal)(210000.0),
    netWorth: new (require("@/lib/decimal").Decimal)(479750.5),
    liquidNetWorth: new (require("@/lib/decimal").Decimal)(334750.5),
  };

  const history = data?.history || [
    { dateStr: "Mar/26", netWorth: 410000, totalAssets: 630000, totalLiabilities: 220000 },
    { dateStr: "Abr/26", netWorth: 425000, totalAssets: 643000, totalLiabilities: 218000 },
    { dateStr: "Mai/26", netWorth: 438000, totalAssets: 654000, totalLiabilities: 216000 },
    { dateStr: "Jun/26", netWorth: 452000, totalAssets: 666000, totalLiabilities: 214000 },
    { dateStr: "Jul/26", netWorth: 466000, totalAssets: 678000, totalLiabilities: 212000 },
    { dateStr: "Ago/26", netWorth: summary.netWorth.toNumber(), totalAssets: summary.totalAssets.toNumber(), totalLiabilities: summary.totalLiabilities.toNumber() },
  ];

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

          <div className="flex flex-wrap items-center gap-3">
            <div className="glass-panel px-4 py-2.5 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Variação Mês</p>
                <p className="text-sm font-bold text-emerald-400">+R$ 13.750,50 (+2,95%)</p>
              </div>
            </div>

            <div className="glass-panel px-4 py-2.5 rounded-2xl border border-cyan-500/20 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">Variação Ano</p>
                <p className="text-sm font-bold text-cyan-400">+R$ 69.750,50 (+17,0%)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cartões dos 4 Pilares Patrimoniais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Disponível */}
        <Link href="/contas" className="glass-card p-5 rounded-2xl block group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Disponível</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-all">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrencyBRL(summary.liquidAssets)}
          </div>
          <p className="text-xs text-muted-foreground">Contas correntes, saldos e caixa</p>
        </Link>

        {/* 2. Investido */}
        <Link href="/patrimonio" className="glass-card p-5 rounded-2xl block group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Investido</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrencyBRL(summary.investmentAssets)}
          </div>
          <p className="text-xs text-muted-foreground">Tesouro, Ações, FIIs e saldo corretora</p>
        </Link>

        {/* 3. Bens */}
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

        {/* 4. Dívidas */}
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

      {/* Gráficos de Evolução & Alocação */}
      <NetWorthCharts history={history} allocations={allocations} />

      {/* Acesso Rápido a Operações */}
      <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-white text-base">Registrar Movimentação Real</h4>
          <p className="text-xs text-muted-foreground">Lançar receita, despesa, transferência neutra ou amortização de passivo</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/transacoes"
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold text-center border border-white/10 transition-all"
          >
            Ver Transações
          </Link>
          <Link
            href="/transacoes?nova=true"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Operação</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
