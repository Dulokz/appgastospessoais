"use client";

import { useState } from "react";
import { formatCurrencyBRL } from "@/lib/decimal";
import { Wallet, Plus, Building2, Scale, Trash2, X, Check } from "lucide-react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { ReconcileModal } from "@/components/accounts/ReconcileModal";
import { createAccount, archiveAccount } from "@/lib/actions/db-actions";

interface AccountItem {
  id: string;
  name: string;
  institution: string;
  type: string;
  typeLabel: string;
  balance: number;
  confirmed: number;
  diff: number;
}

interface ContasClientProps {
  initialAccounts: AccountItem[];
}

const INSTITUTIONS_LIST = [
  "Banco do Brasil",
  "Sicredi",
  "Sicoob",
  "Bradesco",
  "Itaú",
  "Nubank",
  "Inter",
  "Santander",
  "Caixa",
  "XP Investimentos",
  "BTG Pactual",
  "Rico",
  "Clear",
  "Outra instituição",
];

const ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Conta corrente" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "CASH", label: "Dinheiro / Carteira" },
  { value: "BROKERAGE", label: "Corretora" },
  { value: "INVESTMENT", label: "Conta de investimento" },
  { value: "OTHER", label: "Outra conta" },
];

export function ContasClient({ initialAccounts }: ContasClientProps) {
  const [accounts, setAccounts] = useState<AccountItem[]>(initialAccounts);
  const [reconcileAccount, setReconcileAccount] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [institutionName, setInstitutionName] = useState(INSTITUTIONS_LIST[0]);
  const [customInstitution, setCustomInstitution] = useState("");
  const [type, setType] = useState("CHECKING");
  const [initialBalanceStr, setInitialBalanceStr] = useState("0");
  const [loading, setLoading] = useState(false);

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  const handleCreate = async () => {
    if (!name) return;
    setLoading(true);

    try {
      const inst = institutionName === "Outra instituição" ? customInstitution : institutionName;
      const initialBal = parseFloat(initialBalanceStr) || 0;

      await createAccount({
        name,
        type: type as any,
        institutionName: inst,
        initialBalance: initialBal,
      });

      setIsAddOpen(false);
      setName("");
      setInitialBalanceStr("0");
      window.location.reload();
    } catch (err) {
      console.error("Erro ao criar conta:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Deseja arquivar esta conta?")) return;
    await archiveAccount(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Contas Financeiras & Liquidez</h1>
          <p className="text-xs text-muted-foreground">Bancos, cooperativas, carteiras de dinheiro e custódia</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
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
      </div>

      {/* Se não houver contas: State Vazio */}
      {accounts.length === 0 ? (
        <div className="glass-card p-8 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
          <Wallet className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-white text-base">Você ainda não cadastrou nenhuma conta</h3>
          <p className="text-xs text-muted-foreground">
            Cadastre seu banco, cooperativa ou carteira em dinheiro para gerenciar sua liquidez disponível.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
          >
            + Adicionar Conta
          </button>
        </div>
      ) : (
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
                  {account.typeLabel}
                </span>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Saldo Calculado</p>
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastrar Conta */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white">Cadastrar Nova Conta</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-xl text-muted-foreground hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Instituição</label>
              <select
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
              >
                {INSTITUTIONS_LIST.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>

            {institutionName === "Outra instituição" && (
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Nome da Instituição</label>
                <input
                  type="text"
                  placeholder="ex: Cooperativa Local"
                  value={customInstitution}
                  onChange={(e) => setCustomInstitution(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Nome da Conta</label>
              <input
                type="text"
                placeholder="ex: Conta Corrente Principal, Carteira"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Tipo da Conta</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">Saldo Inicial (R$)</label>
              <CurrencyInput
                value={initialBalanceStr}
                onChangeValue={(_, rawStr) => setInitialBalanceStr(rawStr)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !name}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-white shadow-lg shadow-emerald-500/20"
              >
                {loading ? "Salvando..." : "Salvar Conta"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReconcileModal
        isOpen={!!reconcileAccount}
        onClose={() => setReconcileAccount(null)}
        account={reconcileAccount}
        onSaveCheck={() => {}}
      />
    </div>
  );
}
