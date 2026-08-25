"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  TrendingUp,
  Building2,
  TrendingDown,
  ArrowLeft,
  CheckCircle2,
  Info,
} from "lucide-react";
import { addForgottenInitialPosition } from "@/lib/actions/initial-position-actions";
import { ASSET_CATEGORY_GROUPS, ASSET_CATEGORY_OPTIONS } from "@/lib/asset-categories";

interface Props {
  controlStartDate: string | null;
  accounts: { id: string; name: string }[];
}

type Kind = "ACCOUNT" | "INVESTMENT" | "ASSET" | "LIABILITY";

const kinds = [
  { id: "ACCOUNT" as const, title: "Conta / dinheiro", text: "Saldo que já existia na data inicial.", icon: Wallet },
  { id: "INVESTMENT" as const, title: "Investimento", text: "Aplicação ou posição que ficou de fora.", icon: TrendingUp },
  { id: "ASSET" as const, title: "Bem", text: "Imóvel, veículo, eletrônico, ferramenta, máquina ou outro ativo.", icon: Building2 },
  { id: "LIABILITY" as const, title: "Dívida", text: "Passivo que já existia e não foi cadastrado.", icon: TrendingDown },
];

export function InitialPositionAdjustmentClient({ controlStartDate, accounts }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind | null>(null);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [secondaryValue, setSecondaryValue] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [subtype, setSubtype] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dateLabel = useMemo(() => {
    if (!controlStartDate) return "data inicial do controle";
    return new Date(`${controlStartDate}T12:00:00`).toLocaleDateString("pt-BR");
  }, [controlStartDate]);

  const reset = () => {
    setKind(null);
    setName("");
    setValue("");
    setSecondaryValue("");
    setInstitution("");
    setSubtype("");
    setError(null);
    setSaved(false);
  };

  async function save() {
    const amount = Number(value.replace(",", "."));
    if (!kind || !name.trim() || !Number.isFinite(amount) || amount < 0) {
      setError("Informe uma descrição e um valor válido.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (kind === "ACCOUNT") {
        await addForgottenInitialPosition({
          itemType: "ACCOUNT",
          data: { name: name.trim(), type: subtype || "CHECKING", initialBalance: amount },
        });
      }

      if (kind === "INVESTMENT") {
        if (!accountId) throw new Error("Cadastre uma conta/corretora antes do investimento.");
        await addForgottenInitialPosition({
          itemType: "INVESTMENT",
          data: {
            accountId,
            instrumentName: name.trim(),
            instrumentType: subtype || "OTHER",
            currentValue: amount,
          },
        });
      }

      if (kind === "ASSET") {
        await addForgottenInitialPosition({
          itemType: "ASSET",
          data: { name: name.trim(), category: subtype || "OTHER", currentValue: amount },
        });
      }

      if (kind === "LIABILITY") {
        const original = Number(secondaryValue.replace(",", "."));
        await addForgottenInitialPosition({
          itemType: "LIABILITY",
          data: {
            name: name.trim(),
            type: subtype || "OTHER",
            institution: institution.trim() || undefined,
            currentBalance: amount,
            originalValue: Number.isFinite(original) && original > 0 ? original : amount,
          },
        });
      }

      setSaved(true);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Não foi possível ajustar a posição inicial.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-400 font-semibold">Correção patrimonial</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Esqueci algo da posição inicial</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Use somente para algo que <strong className="text-slate-300">já existia em {dateLabel}</strong>. O ajuste corrige o patrimônio de abertura, mas não cria receita, despesa ou movimentação bancária hoje.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-white">Isso não é um lançamento do dia a dia.</p>
          <p className="text-xs text-muted-foreground mt-1">Se você comprou, recebeu, transferiu ou contraiu a dívida depois da data inicial, registre como movimentação normal para que as contrapartidas sejam geradas.</p>
        </div>
      </div>

      {!kind ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {kinds.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setKind(item.id)}
                className="text-left rounded-2xl border border-white/10 bg-white/[0.025] p-5 hover:bg-white/[0.05] hover:border-white/15 transition-colors"
              >
                <Icon className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-white mt-4">{item.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">{item.text}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 md:p-7 space-y-5">
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> escolher outro tipo
          </button>

          {saved ? (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-white">Posição inicial corrigida</h2>
                <p className="text-sm text-muted-foreground mt-1">O item foi incluído sem virar movimento do mês atual.</p>
              </div>
              <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-white/10 text-sm font-semibold text-white">Adicionar outro item</button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Descrição</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "ASSET" ? "Ex.: Notebook, furadeira, Jetta, apartamento..." : kind === "LIABILITY" ? "Ex.: Saldo devedor apartamento" : kind === "INVESTMENT" ? "Ex.: BBAS3 / Previdência" : "Ex.: Conta Sicoob"} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white outline-none focus:border-emerald-500/50" />
              </div>

              {kind === "ACCOUNT" && (
                <div>
                  <label className="text-xs text-muted-foreground font-semibold block mb-1">Tipo</label>
                  <select value={subtype} onChange={(e) => setSubtype(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">
                    <option value="CHECKING">Conta corrente</option><option value="SAVINGS">Poupança</option><option value="CASH">Dinheiro</option><option value="BROKERAGE">Corretora</option><option value="INVESTMENT">Conta de investimento</option><option value="OTHER">Outra</option>
                  </select>
                </div>
              )}

              {kind === "INVESTMENT" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="text-xs text-muted-foreground font-semibold block mb-1">Custódia</label><select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white">{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                  <div><label className="text-xs text-muted-foreground font-semibold block mb-1">Tipo</label><select value={subtype} onChange={(e) => setSubtype(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white"><option value="STOCK">Ação</option><option value="FII">FII</option><option value="FIXED_INCOME">Renda fixa</option><option value="INVESTMENT_FUND">Fundo</option><option value="CRYPTO">Cripto</option><option value="OTHER">Outro</option></select></div>
                </div>
              )}

              {kind === "ASSET" && (
                <div>
                  <label className="text-xs text-muted-foreground font-semibold block mb-1">Categoria patrimonial</label>
                  <select
                    value={subtype}
                    onChange={(e) => setSubtype(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white"
                  >
                    <option value="">Selecione a categoria...</option>
                    {ASSET_CATEGORY_GROUPS.map((group) => (
                      <optgroup key={group} label={group}>
                        {ASSET_CATEGORY_OPTIONS.filter((item) => item.group === group).map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}{item.examples ? ` — ${item.examples}` : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Cadastre somente bens com relevância econômica. Não precisa transformar cada objeto pequeno da casa em patrimônio.
                  </p>
                </div>
              )}

              {kind === "LIABILITY" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="text-xs text-muted-foreground font-semibold block mb-1">Tipo</label><select value={subtype} onChange={(e) => setSubtype(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white"><option value="MORTGAGE">Financiamento imobiliário</option><option value="VEHICLE_LOAN">Financiamento veicular</option><option value="PERSONAL_LOAN">Empréstimo</option><option value="INSTALLMENT">Parcelamento</option><option value="CREDIT_CARD">Cartão</option><option value="OTHER">Outra</option></select></div>
                  <div><label className="text-xs text-muted-foreground font-semibold block mb-1">Instituição (opcional)</label><input value={institution} onChange={(e) => setInstitution(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" /></div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground font-semibold block mb-1">{kind === "LIABILITY" ? "Saldo devedor na data inicial" : "Valor na data inicial"}</label><input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-lg font-bold text-white" /></div>
                {kind === "LIABILITY" && <div><label className="text-xs text-muted-foreground font-semibold block mb-1">Valor original (opcional)</label><input inputMode="decimal" value={secondaryValue} onChange={(e) => setSecondaryValue(e.target.value)} placeholder="0,00" className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white" /></div>}
              </div>

              {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-300">{error}</div>}

              <div className="flex justify-end pt-2"><button disabled={loading} onClick={save} className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-sm font-bold text-slate-950">{loading ? "Salvando..." : "Corrigir posição inicial"}</button></div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
