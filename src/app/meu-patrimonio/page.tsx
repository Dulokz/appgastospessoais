import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { formatCurrencyBRL } from "@/lib/decimal";
import { Wallet, TrendingUp, Building, TrendingDown, ShieldCheck, Pencil } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getMeuPatrimonioData() {
  try {
    const userId = await getDefaultUserId();

    const accounts = await db.account.findMany({
      where: { userId, active: true },
      include: { financialInstitution: true },
    });

    const positions = await db.investmentPosition.findMany({
      where: { userId, active: true },
      include: { instrument: true },
    });

    const assets = await db.asset.findMany({
      where: { userId, active: true },
    });

    const liabilities = await db.liability.findMany({
      where: { userId, active: true },
    });

    return { accounts, positions, assets, liabilities };
  } catch (error) {
    console.error("Erro ao carregar dados do patrimônio:", error);
    return { accounts: [], positions: [], assets: [], liabilities: [] };
  }
}

export default async function MeuPatrimonioPage() {
  const { accounts, positions, assets, liabilities } = await getMeuPatrimonioData();

  const liquidItems = accounts.map((a) => ({
    id: a.id,
    name: `${a.name} (${a.financialInstitution?.name || "Conta"})`,
    value: a.calculatedBalance.toNumber(),
  }));

  const investmentItems = positions.map((p) => ({
    id: p.id,
    name: `${p.instrument.name} (${p.instrument.symbol || p.instrument.instrumentType})`,
    value: p.currentValue.toNumber(),
  }));

  const physicalItems = assets.map((a) => ({
    id: a.id,
    name: a.name,
    value: a.currentValue.toNumber(),
  }));

  const liabilityItems = liabilities.map((l) => ({
    id: l.id,
    name: `${l.name} ${l.institution ? `(${l.institution})` : ""}`,
    value: l.currentBalance.toNumber(),
  }));

  const totalLiquid = liquidItems.reduce((acc, i) => acc + i.value, 0);
  const totalInvestments = investmentItems.reduce((acc, i) => acc + i.value, 0);
  const totalPhysical = physicalItems.reduce((acc, i) => acc + i.value, 0);

  const totalAssets = totalLiquid + totalInvestments + totalPhysical;
  const totalLiabilities = liabilityItems.reduce((acc, i) => acc + i.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  const hasItems = totalAssets > 0 || totalLiabilities > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Meu Patrimônio</h1>
          <p className="text-xs text-muted-foreground">Balanço Patrimonial Pessoal: Ativos, Dívidas e Patrimônio Líquido Real</p>
        </div>
        <Link href="/patrimonio" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-bold">
          <Pencil className="w-4 h-4" /> Gerenciar bens
        </Link>
      </div>

      {/* Header do Balanço */}
      <div className="glass-card p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 border-emerald-500/30">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
            Patrimônio Líquido (Ativos - Dívidas)
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white">{formatCurrencyBRL(netWorth)}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Posição consolidada de todos os seus recursos e obrigações reais cadastrados
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 text-center flex-1 sm:flex-initial">
            <span className="text-[11px] text-muted-foreground block">Total de Ativos</span>
            <span className="text-lg font-bold text-emerald-400">{formatCurrencyBRL(totalAssets)}</span>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-rose-500/20 text-center flex-1 sm:flex-initial">
            <span className="text-[11px] text-muted-foreground block">Total de Dívidas</span>
            <span className="text-lg font-bold text-rose-400">{formatCurrencyBRL(totalLiabilities)}</span>
          </div>
        </div>
      </div>

      {!hasItems ? (
        <div className="glass-card p-8 rounded-2xl text-center space-y-3 max-w-lg mx-auto">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-white text-base">Nenhum item patrimonial cadastrado</h3>
          <p className="text-xs text-muted-foreground">
            Cadastre suas contas bancárias, ativos, investimentos e passivos para visualizar o balanço patrimonial completo.
          </p>
        </div>
      ) : (
        /* Seções do Balanço Patrimonial */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ativos */}
          <div className="glass-card p-6 rounded-2xl space-y-5">
            <h3 className="font-bold text-white text-lg border-b border-white/10 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>ATIVOS ({formatCurrencyBRL(totalAssets)})</span>
            </h3>

            {/* 1. Dinheiro Disponível */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase">
                <Wallet className="w-4 h-4" />
                <span>Dinheiro Disponível ({formatCurrencyBRL(totalLiquid)})</span>
              </div>
              {liquidItems.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic pl-6">Nenhuma conta ativa.</p>
              ) : (
                liquidItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs py-1.5 px-3 rounded-xl bg-white/5">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="font-semibold text-white">{formatCurrencyBRL(item.value)}</span>
                  </div>
                ))
              )}
            </div>

            {/* 2. Investimentos */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase">
                <TrendingUp className="w-4 h-4" />
                <span>Investimentos ({formatCurrencyBRL(totalInvestments)})</span>
              </div>
              {investmentItems.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic pl-6">Nenhum investimento cadastrado.</p>
              ) : (
                investmentItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs py-1.5 px-3 rounded-xl bg-white/5">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="font-semibold text-white">{formatCurrencyBRL(item.value)}</span>
                  </div>
                ))
              )}
            </div>

            {/* 3. Bens */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase">
                <Building className="w-4 h-4" />
                <span>Bens Patrimoniais ({formatCurrencyBRL(totalPhysical)})</span>
              </div>
              {physicalItems.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic pl-6">Nenhum bem cadastrado.</p>
              ) : (
                physicalItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs py-1.5 px-3 rounded-xl bg-white/5">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="font-semibold text-white">{formatCurrencyBRL(item.value)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Passivos & Balanço Final */}
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-lg border-b border-white/10 pb-3 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                <span>DÍVIDAS & PASSIVOS ({formatCurrencyBRL(totalLiabilities)})</span>
              </h3>

              <div className="space-y-2">
                {liabilityItems.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">Nenhuma dívida cadastrada.</p>
                ) : (
                  liabilityItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs py-2 px-3 rounded-xl bg-white/5">
                      <span className="text-slate-300">{item.name}</span>
                      <span className="font-bold text-rose-400">{formatCurrencyBRL(item.value)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl space-y-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/30">
              <h4 className="text-sm font-bold text-white">Resumo do Balanço</h4>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total de Ativos:</span>
                <span className="font-semibold text-emerald-400">{formatCurrencyBRL(totalAssets)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total de Dívidas:</span>
                <span className="font-semibold text-rose-400">-{formatCurrencyBRL(totalLiabilities)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10 text-white">
                <span>Patrimônio Líquido:</span>
                <span className="text-emerald-400">{formatCurrencyBRL(netWorth)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
