import Link from "next/link";
import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { formatCurrencyBRL } from "@/lib/decimal";
import { MonthlyResultService } from "@/lib/services/monthly-result.service";
import { ArrowRight, CalendarClock, CreditCard, Receipt, TrendingDown, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResultadoMesPage() {
  const userId = await getDefaultUserId();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [transactions, pendingCommitments, accounts] = await Promise.all([
    db.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: startOfMonth, lt: startOfNextMonth } },
      include: { category: true, allocations: { include: { category: true } } },
    }),
    db.scheduledCommitment.findMany({
      where: { userId, status: "PENDING", dueDate: { gte: startOfMonth, lt: startOfNextMonth } },
      include: { account: { include: { financialInstitution: true } }, category: { include: { parent: true } } },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    db.account.findMany({
      where: { userId, active: true },
      include: { financialInstitution: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const report = MonthlyResultService.calculateReport(transactions.map((item) => ({
    id: item.id,
    type: item.transactionType,
    amount: item.amount.toNumber(),
    categoryName: item.category?.name,
    allocations: item.allocations.map((allocation) => ({
      type: allocation.allocationType,
      amount: allocation.amount.toNumber(),
      categoryName: allocation.category?.name,
    })),
  })));

  const income = report.totalIncome.toNumber();
  const expenses = report.totalExpenses.toNumber();
  const result = report.monthlyResult.toNumber();
  const predictedExpenses = pendingCommitments.reduce((total, item) => total + item.amount.toNumber(), 0);
  const projectedResult = result - predictedExpenses;
  const availableCash = accounts
    .filter((item) => !["CREDIT_CARD", "INVESTMENT", "BROKERAGE"].includes(item.type))
    .reduce((total, item) => total + item.calculatedBalance.toNumber(), 0);
  const openCards = accounts
    .filter((item) => item.type === "CREDIT_CARD" && item.calculatedBalance.toNumber() < -0.005)
    .map((item) => ({ id: item.id, name: item.name, institution: item.financialInstitution?.name || "Instituição", openAmount: Math.abs(item.calculatedBalance.toNumber()) }));
  const cardsOpenTotal = openCards.reduce((total, item) => total + item.openAmount, 0);
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-400 font-bold">Decisão financeira do mês</p>
          <h1 className="text-3xl font-black text-white tracking-tight mt-1">Meu Mês</h1>
          <p className="text-sm text-muted-foreground mt-1">O realizado não se mistura com o que ainda está previsto.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 capitalize">
          <CalendarClock className="w-4 h-4 text-emerald-400" /> {monthLabel}
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs text-muted-foreground">Disponível nas contas</p>
          <p className="text-2xl font-black text-white mt-2">{formatCurrencyBRL(availableCash)}</p>
          <p className="text-[11px] text-muted-foreground mt-2">Conta, dinheiro e poupança. Não inclui cartão nem investimentos.</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
          <p className="text-xs text-emerald-200">Entrou no mês · realizado</p>
          <p className="text-2xl font-black text-emerald-400 mt-2">{formatCurrencyBRL(income)}</p>
          <p className="text-[11px] text-emerald-100/70 mt-2">Receitas já registradas.</p>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-5">
          <p className="text-xs text-rose-200">Saiu no mês · realizado</p>
          <p className="text-2xl font-black text-rose-400 mt-2">{formatCurrencyBRL(expenses)}</p>
          <p className="text-[11px] text-rose-100/70 mt-2">Despesas já confirmadas, inclusive compras no cartão.</p>
        </div>
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] p-5">
          <p className="text-xs text-cyan-200">Resultado realizado</p>
          <p className={"text-2xl font-black mt-2 " + (result >= 0 ? "text-cyan-300" : "text-rose-400")}>{formatCurrencyBRL(result)}</p>
          <p className="text-[11px] text-cyan-100/70 mt-2">Receitas menos despesas já ocorridas.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 rounded-3xl border border-white/10 bg-white/[0.025] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-amber-300 font-bold">Ainda pode acontecer neste mês</p>
              <h2 className="text-xl font-black text-white mt-1">Compromissos previstos</h2>
              <p className="text-xs text-muted-foreground mt-1">São lembretes financeiros; não diminuíram saldo nem resultado ainda.</p>
            </div>
            <Link href="/compromissos" className="text-xs text-emerald-400 font-semibold flex items-center gap-1">Gerenciar <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="mt-5 flex flex-col sm:flex-row sm:items-end gap-4 border-b border-white/10 pb-5">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Total previsto até o fim do mês</p>
              <p className="text-3xl font-black text-amber-300 mt-1">{formatCurrencyBRL(predictedExpenses)}</p>
            </div>
            <div className="rounded-xl bg-black/20 px-4 py-3">
              <p className="text-[11px] text-muted-foreground">Resultado se tudo vencer</p>
              <p className={"font-bold mt-1 " + (projectedResult >= 0 ? "text-white" : "text-rose-400")}>{formatCurrencyBRL(projectedResult)}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {pendingCommitments.length === 0 ? <p className="text-sm text-muted-foreground py-5 text-center">Nenhum compromisso pendente neste mês.</p> : pendingCommitments.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white/[0.035] px-3 py-3">
                <CalendarClock className="w-4 h-4 text-amber-300 shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white truncate">{item.description}</p><p className="text-[11px] text-muted-foreground">{item.dueDate.toLocaleDateString("pt-BR")} · {item.account.name}{item.category ? " · " + (item.category.parent ? item.category.parent.name + " › " : "") + item.category.name : ""}</p></div>
                <strong className="text-sm text-amber-200">{formatCurrencyBRL(item.amount.toNumber())}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 rounded-3xl border border-violet-500/20 bg-violet-500/[0.04] p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-violet-300 font-bold">Compras já feitas</p><h2 className="text-xl font-black text-white mt-1">Faturas abertas</h2></div><CreditCard className="w-5 h-5 text-violet-300" /></div>
          <p className="text-3xl font-black text-white mt-5">{formatCurrencyBRL(cardsOpenTotal)}</p>
          <p className="text-xs text-violet-100/70 mt-1">Dívida atual nos cartões. Pagar fatura não gera nova despesa.</p>
          <div className="mt-5 space-y-2">
            {openCards.length === 0 ? <p className="text-sm text-violet-100/70">Nenhuma fatura em aberto.</p> : openCards.map((card) => <Link href={"/cartoes/" + card.id} key={card.id} className="block rounded-xl bg-black/15 px-3 py-3 hover:bg-black/25"><div className="flex justify-between gap-3"><span className="text-sm font-semibold text-white">{card.name}</span><span className="text-sm font-bold text-violet-200">{formatCurrencyBRL(card.openAmount)}</span></div><p className="text-[11px] text-violet-100/60 mt-1">{card.institution} · Ver fatura</p></Link>)}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="flex gap-2 items-center pb-3 border-b border-white/10"><TrendingUp className="w-4 h-4 text-emerald-400" /><h2 className="font-bold text-white">De onde veio o dinheiro</h2></div>
          <div className="mt-3 space-y-2">{report.incomeCategories.length ? report.incomeCategories.map((item, index) => <div key={index} className="flex justify-between gap-3 text-sm"><span className="text-slate-300">{item.name}</span><strong className="text-emerald-400">{formatCurrencyBRL(item.total.toNumber())}</strong></div>) : <p className="text-sm text-muted-foreground">Nenhuma receita registrada.</p>}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="flex gap-2 items-center pb-3 border-b border-white/10"><TrendingDown className="w-4 h-4 text-rose-400" /><h2 className="font-bold text-white">Para onde foi o dinheiro</h2></div>
          <div className="mt-3 space-y-2">{report.expenseCategories.length ? report.expenseCategories.map((item, index) => <div key={index} className="flex justify-between gap-3 text-sm"><span className="text-slate-300">{item.name}</span><strong className="text-rose-400">{formatCurrencyBRL(item.total.toNumber())}</strong></div>) : <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>}</div>
        </div>
      </section>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <Receipt className="w-5 h-5 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground flex-1">Registre o que aconteceu em Transações. Para uma assinatura ou parcela futura, use Compromissos. Para pagar compras já feitas no cartão, use a Fatura.</p>
        <Link href="/transacoes" className="text-xs font-bold text-emerald-400">Registrar agora</Link>
      </div>
    </div>
  );
}
