import { db } from "@/lib/db";
import { getDefaultUserId } from "@/lib/auth-user";
import { Settings, Shield, User, Database, Calendar, RefreshCw, PlusCircle, Pencil, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ImportRulesClient } from "./ImportRulesClient";

export const dynamic = "force-dynamic";

async function getConfiguracoesData() {
  const userId = await getDefaultUserId();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      controlStartDate: true,
      onboardingStatus: true,
      onboardingStep: true,
      onboardingCompletedAt: true,
    },
  });

  const [accounts, investments, rules] = await Promise.all([
    db.account.findMany({ where: { userId, active: true }, include: { financialInstitution: { select: { name: true } } }, orderBy: { name: "asc" } }),
    db.investmentPosition.findMany({ where: { userId, active: true }, include: { instrument: true, account: { include: { financialInstitution: true } } }, orderBy: { createdAt: "asc" } }),
    db.importClassificationRule.findMany({ where: { userId, active: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return { user, accounts, investments, rules };
}

export default async function ConfiguracoesPage() {
  const { user, accounts, investments, rules } = await getConfiguracoesData();
  const startDateStr = user?.controlStartDate
    ? new Date(user.controlStartDate).toLocaleDateString("pt-BR")
    : "Não definida";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Configurações & Perfil</h1>
        <p className="text-xs text-muted-foreground">Preferências do usuário, posição inicial patrimonial e segurança</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Card de Usuário & Segurança */}
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20">
              UP
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{user?.name || "Usuário Principal"}</h3>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                ID Isolado: {user?.id.substring(0, 8)}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="font-bold text-white">Isolamento Multi-tenant (userId)</p>
                  <p className="text-muted-foreground">Privacidade e segregação estrita de dados</p>
                </div>
              </div>
              <span className="text-emerald-400 font-semibold">Ativo</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="font-bold text-white">Banco de Dados Relacional</p>
                  <p className="text-muted-foreground">PostgreSQL Neon com precisão Decimal (18,4)</p>
                </div>
              </div>
              <span className="text-cyan-400 font-semibold">PostgreSQL</span>
            </div>
          </div>
        </div>

        {/* Card de Configuração Inicial Patrimonial (Regra 25) */}
        <div className="glass-card p-6 rounded-2xl space-y-5 border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configuração Inicial Patrimonial</h3>
              <p className="text-xs text-muted-foreground">Gerencie sua posição inicial e data-base do controle</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status do Onboarding:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {user?.onboardingStatus || "CONCLUÍDO"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Data-Base de Início:</span>
              <span className="font-bold text-white">{startDateStr}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-xs">
            <Link
              href="/onboarding"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Pencil className="w-4 h-4 text-cyan-400" />
                <span>Ver / Editar Posição Inicial</span>
              </div>
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>

            <Link
              href="/onboarding"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Adicionar Item Esquecido Retroativamente</span>
              </div>
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
      <ImportRulesClient
        accounts={accounts.map((account) => ({ id: account.id, name: account.name, institutionName: account.financialInstitution?.name || null }))}
        investments={investments.map((position) => ({ id: position.id, name: position.instrument.name, institutionName: position.account.financialInstitution?.name || null }))}
        rules={rules.map((rule) => ({ id: rule.id, matchText: rule.matchText, action: rule.action as "TRANSFER_IN" | "TRANSFER_OUT" | "INVESTMENT_CONTRIBUTION" | "INVESTMENT_WITHDRAWAL", targetType: rule.investmentPositionId ? "INVESTMENT" as const : "ACCOUNT" as const, targetId: rule.investmentPositionId || rule.counterpartAccountId || "", targetName: rule.investmentPositionId ? investments.find((position) => position.id === rule.investmentPositionId)?.instrument.name || null : accounts.find((account) => account.id === rule.counterpartAccountId)?.name || null }))}
      />
    </div>
  );
}
