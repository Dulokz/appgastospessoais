"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Check, ChevronRight, FileSpreadsheet, FileText, Loader2, Search, ShieldCheck, Upload, X } from "lucide-react";
import { commitStatementImport } from "@/lib/actions/statement-import-actions";
import { TransactionCategoryPicker } from "@/components/categories/TransactionCategoryPicker";
import { AccountPicker } from "@/components/accounts/AccountPicker";

type Account = { id: string; name: string; type: string; institutionName?: string | null };
type Category = { id: string; name: string; parentName?: string | null };
type Entry = { id: string; date: string; description: string; detail?: string; signedAmount: number; externalId?: string; categoryId: string; ignored: boolean; importKind?: "TRANSFER_IN" | "TRANSFER_OUT"; sourceAccountId?: string };

const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(value));
const transferKindFor = (description: string, signedAmount: number) => { const name = description.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase(); if (/resgate\\s+(?:da?\\s*)?(?:poupanca|aplicacao)|ourocap/.test(name)) return signedAmount > 0 ? "TRANSFER_IN" : "TRANSFER_OUT"; return undefined; };

function parseMoney(value: string) {
  const clean = value.replace(/[^0-9,.-]/g, "").trim();
  if (!clean) return NaN;
  const lastComma = clean.lastIndexOf(",");
  const lastDot = clean.lastIndexOf(".");
  let normalized = clean;
  if (lastComma > lastDot) normalized = clean.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma) normalized = clean.replace(/,/g, "");
  return Number(normalized);
}

function parseDate(value: string) {
  const raw = value.trim();
  const br = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{2,4})$/);
  if (br) return `${br[3].length === 2 ? "20" + br[3] : br[3]}-${br[2]}-${br[1]}`;
  const iso = raw.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ofx = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  return ofx ? `${ofx[1]}-${ofx[2]}-${ofx[3]}` : "";
}

function textTag(block: string, tag: string) {
  return block.match(new RegExp("<" + tag + ">([^<\\r\\n]+)", "i"))?.[1]?.trim() || "";
}

function parseOfx(text: string): Entry[] {
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTRS>|$)/gi) || [];
  return blocks.map((block, index) => {
    const amount = parseMoney(textTag(block, "TRNAMT"));
    const name = textTag(block, "NAME") || "Lançamento importado";
    const memo = textTag(block, "MEMO");
    // OFX do Banco do Brasil: "03/01 14:22 Favorecido". O nome é o que importa na revisão.
    const memoParts = memo.match(/^(\d{2}\/\d{2})\s+(\d{2}:\d{2})\s+(.+)$/);
    const counterpart = memoParts?.[3]?.trim();
    const detail = memoParts ? `${memoParts[1]} às ${memoParts[2]}` : memo || undefined;
    return {
      id: textTag(block, "FITID") || "ofx-" + index,
      externalId: textTag(block, "FITID") || undefined,
      date: parseDate(textTag(block, "DTPOSTED")),
      description: counterpart ? `${name} · ${counterpart}` : name,
      detail,
      signedAmount: amount,
      categoryId: "",
      importKind: transferKindFor(name, amount),
      // Linhas de saldo/fechamento não são fatos financeiros e não devem ser lançadas.
      ignored: !Number.isFinite(amount) || Math.abs(amount) < 0.005 || /^(saldo|balance)/i.test(name),
    };
  }).filter((entry) => entry.date);
}

function parseCsv(text: string): Entry[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const separator = lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
  const cells = (line: string) => {
    const values: string[] = []; let current = ""; let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === "\"") { if (quoted && line[i + 1] === "\"") { current += char; i++; } else quoted = !quoted; }
      else if (char === separator && !quoted) { values.push(current.trim()); current = ""; }
      else current += char;
    }
    values.push(current.trim()); return values;
  };
  const header = cells(lines[0]).map((value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  const find = (...names: string[]) => header.findIndex((value) => names.some((name) => value.includes(name)));
  const dateIndex = find("data", "date");
  const descriptionIndex = find("descricao", "historico", "lancamento", "memo", "description");
  const valueIndex = find("valor", "amount", "quantia", "value");
  const creditIndex = find("credito", "credit");
  const debitIndex = find("debito", "debit");
  return lines.slice(1).map((line, index) => {
    const row = cells(line);
    const credit = creditIndex >= 0 ? parseMoney(row[creditIndex] || "") : NaN;
    const debit = debitIndex >= 0 ? parseMoney(row[debitIndex] || "") : NaN;
    const rawAmount = valueIndex >= 0 ? parseMoney(row[valueIndex] || "") : Number.isFinite(credit) ? credit : -debit;
    const signedAmount = Number.isFinite(credit) && Number.isFinite(debit) ? credit - debit : rawAmount;
    return {
      id: "csv-" + index,
      date: parseDate(row[dateIndex] || ""),
      description: row[descriptionIndex] || row.find((value) => /[a-zà-ú]/i.test(value)) || "Lançamento importado",
      signedAmount,
      categoryId: "",
      ignored: !Number.isFinite(signedAmount),
    };
  }).filter((entry) => entry.date);
}

function parsePdfText(text: string): Entry[] {
  const readable = Array.from(text.matchAll(/\(([^()]*)\)\s*(?:Tj|'|\])/g))
    .map((match) => match[1].replace(/\\([()\\])/g, "$1"))
    .join(" ");
  const rows: Entry[] = [];
  const expression = /(\d{2}[/-]\d{2}[/-]\d{2,4}|\d{4}[/-]\d{2}[/-]\d{2})\s+(.{3,}?)\s+([+-]?\s*(?:R\$\s*)?[\d.]+(?:,\d{2})?)(?=\s+(?:\d{2}[/-]\d{2}[/-]\d{2,4}|\d{4}[/-]\d{2}[/-]\d{2})|$)/g;
  for (const match of readable.matchAll(expression)) {
    const signedAmount = parseMoney(match[3]);
    rows.push({ id: "pdf-" + rows.length, date: parseDate(match[1]), description: match[2].trim(), signedAmount, categoryId: "", ignored: !Number.isFinite(signedAmount) });
  }
  return rows;
}

export function StatementImportClient({ accounts, categories }: { accounts: Account[]; categories: Category[] }) {
  const [accountId, setAccountId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number; ignored: number } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkTransferSource, setBulkTransferSource] = useState("");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => entries.filter((entry) => entry.description.toLowerCase().includes(query.toLowerCase())), [entries, query]);
  const pending = entries.filter((entry) => !entry.ignored);
  const account = accounts.find((item) => item.id === accountId);
  const selectedEntries = entries.filter((entry) => selected.includes(entry.id) && !isAutomaticTransfer(entry));
  const bulkDirection = selectedEntries.length && selectedEntries.every((entry) => entry.signedAmount > 0) ? "INCOME" : "EXPENSE";
  const isBancoDoBrasil = account?.institutionName?.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase() === "banco do brasil";
  const isAutomaticTransfer = (entry: Entry) => isBancoDoBrasil && !!entry.importKind;
  const transferEntries = entries.filter((entry) => !entry.ignored && isAutomaticTransfer(entry));
  const transferSources = accounts.filter((item) => item.id !== accountId && item.type !== "CREDIT_CARD");

  const updateEntry = (id: string, patch: Partial<Entry>) => setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setResult(null); setLoading(true);
    try {
      const text = await file.text();
      const lower = file.name.toLowerCase();
      const parsed = lower.endsWith(".ofx") || lower.endsWith(".qfx") ? parseOfx(text) : lower.endsWith(".pdf") ? parsePdfText(text) : parseCsv(text);
      if (!parsed.length) throw new Error(lower.endsWith(".pdf") ? "Não consegui ler itens neste PDF. Ele pode ser escaneado ou protegido; exporte o extrato em OFX/CSV para uma importação segura." : "Não encontrei linhas com data e valor. Confira o formato do arquivo.");
      setEntries(parsed); setFileName(file.name); setSelected(parsed.filter((entry) => !entry.ignored).map((entry) => entry.id));
    } catch (cause: any) {
      setEntries([]); setError(cause.message || "Não foi possível ler o arquivo.");
    } finally { setLoading(false); event.target.value = ""; }
  }

  async function commit() {
    if (!accountId) return setError("Escolha para qual conta ou cartão estes itens pertencem.");
    if (!pending.length) return setError("Marque ao menos um item para importar.");
    setLoading(true); setError("");
    try {
      const response = await commitStatementImport({
        accountId,
        sourceName: fileName,
        entries: entries.map(({ id: _id, ...entry }) => ({ ...entry, importKind: isAutomaticTransfer(entry) ? entry.importKind : undefined, externalId: entry.externalId || undefined })),
      });
      setResult(response);
      if (response.imported) setEntries((current) => current.map((entry) => ({ ...entry, ignored: true })));
    } catch (cause: any) {
      setError(cause.message || "Não foi possível concluir a importação.");
    } finally { setLoading(false); }
  }

  return <div className="space-y-6">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div><p className="text-xs uppercase tracking-[0.16em] text-emerald-400 font-bold">Importação assistida</p><h1 className="mt-1 text-3xl font-black text-white">Traga seu extrato sem perder o controle</h1><p className="mt-2 text-sm text-muted-foreground">Leia o arquivo, confira cada linha e classifique antes de qualquer saldo ser alterado.</p></div>
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100"><ShieldCheck className="inline w-4 h-4 mr-2 text-emerald-300"/>Nada é lançado automaticamente.</div>
    </div>

    <div className="grid gap-3 md:grid-cols-3">
      {["1. Escolha a conta", "2. Leia e classifique", "3. Confirme o resultado"].map((step, index) => <div key={step} className={"rounded-2xl border p-4 " + (entries.length && index < 2 ? "border-emerald-400/30 bg-emerald-500/5" : "border-white/10 bg-white/[0.03]")}><span className="text-xs font-bold text-emerald-300">{step}</span><p className="mt-1 text-xs text-muted-foreground">{index === 0 ? "Banco, carteira ou cartão correto." : index === 1 ? "Categorias e itens ignorados ficam sob seu comando." : "Só então o sistema atualiza tudo."}</p></div>)}
    </div>

    <section className="glass-card rounded-3xl p-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1.4fr]">
        <label className="text-xs text-slate-300">Para qual conta/cartão é este arquivo?<select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800 p-3 text-sm text-white"><option value="">Selecione...</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}{item.institutionName ? " · " + item.institutionName : ""}{item.type === "CREDIT_CARD" ? " · cartão" : ""}</option>)}</select></label>
        <label className="flex min-h-[76px] cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-cyan-400/35 bg-cyan-500/5 px-4 text-center hover:bg-cyan-500/10"><input type="file" accept=".ofx,.qfx,.csv,.pdf,text/csv,application/pdf" className="hidden" onChange={readFile}/>{loading ? <Loader2 className="w-5 h-5 animate-spin text-cyan-300"/> : <Upload className="w-5 h-5 text-cyan-300"/>}<span className="text-sm font-bold text-white">Selecionar OFX, CSV ou PDF</span><span className="text-[11px] text-muted-foreground">PDF com texto selecionável</span></label>
      </div>
      {account?.type === "CREDIT_CARD" && <p className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-100">Compras importadas neste cartão entram na fatura correspondente à data. Créditos do próprio extrato são tratados como pagamento de fatura, não como receita.</p>}
      {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p>}
      {fileName && <p className="text-xs text-cyan-200"><FileText className="inline w-4 h-4 mr-1"/>{fileName} · {entries.length} itens encontrados</p>}
    </section>

    {entries.length > 0 && <section className="space-y-4">
      {transferEntries.length > 0 && <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4 text-sm text-violet-100"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><p className="flex-1"><strong>Movimentação de aplicação identificada.</strong> Escolha a conta vinculada (Poupança ou Ourocap). Aplicações e resgates serão transferências internas, nunca despesa ou receita.</p><div className="w-full sm:w-72"><AccountPicker accounts={transferSources} value={bulkTransferSource} onChange={(sourceAccountId) => { setBulkTransferSource(sourceAccountId); setEntries((current) => current.map((entry) => !!isAutomaticTransfer(entry) && !entry.ignored ? { ...entry, sourceAccountId } : entry)); }} placeholder="Escolher origem dos resgates" disabled={!accountId} /></div></div></div>}
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex-1"><strong className="text-white">{pending.length} itens prontos para revisar</strong><p className="text-xs text-muted-foreground">Selecione vários e aplique uma categoria de uma vez.</p></div>
        <div className="w-full max-w-xs"><TransactionCategoryPicker categories={categories} value={bulkCategory} direction={bulkDirection} onChange={setBulkCategory} compact /></div>
        <button type="button" disabled={!bulkCategory || !selected.length} onClick={() => { setEntries((current) => current.map((entry) => selected.includes(entry.id) && !isAutomaticTransfer(entry) ? { ...entry, categoryId: bulkCategory } : entry)); setBulkCategory(""); }} className="rounded-xl bg-cyan-500/15 px-3 py-2 text-sm font-bold text-cyan-200 disabled:opacity-40">Aplicar em {selected.length || "..."}</button>
      </div>

      <div className="rounded-3xl border border-white/10 overflow-hidden bg-slate-950">
        <div className="flex items-center gap-2 border-b border-white/10 p-3"><Search className="w-4 h-4 text-muted-foreground"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar item do extrato..." className="w-full bg-transparent text-sm text-white outline-none"/><button type="button" onClick={() => setSelected(selected.length === pending.length ? [] : pending.map((entry) => entry.id))} className="text-xs text-cyan-300">{selected.length === pending.length ? "Limpar seleção" : "Selecionar pendentes"}</button></div>
        <div className="divide-y divide-white/5">
          {visible.map((entry) => <div key={entry.id} className={"grid gap-3 p-3 md:grid-cols-[24px_96px_1fr_190px_120px_32px] md:items-center " + (entry.ignored ? "opacity-45" : "")}>
            <input type="checkbox" checked={selected.includes(entry.id)} disabled={entry.ignored} onChange={() => toggle(entry.id)} />
            <span className="text-xs text-slate-400">{new Date(entry.date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
            <div><p className="text-sm font-semibold text-white">{entry.description}</p><p className="text-[11px] text-muted-foreground">{entry.detail ? entry.detail + " · " : ""}{entry.externalId ? "ID do banco: " + entry.externalId : "Sem identificador do banco"}</p></div>
            {isAutomaticTransfer(entry) ? <div><p className="mb-1 text-[11px] font-semibold text-violet-200">Movimentação de aplicação</p><AccountPicker accounts={transferSources} value={entry.sourceAccountId || ""} onChange={(sourceAccountId) => updateEntry(entry.id, { sourceAccountId })} placeholder="Escolher origem" disabled={entry.ignored || !accountId} /></div> : <TransactionCategoryPicker categories={categories} value={entry.categoryId} direction={entry.signedAmount > 0 ? "INCOME" : "EXPENSE"} disabled={entry.ignored || account?.type === "CREDIT_CARD" && entry.signedAmount > 0} onChange={(categoryId) => updateEntry(entry.id, { categoryId })} compact />}
            <strong className={entry.signedAmount > 0 ? "text-emerald-300 text-sm text-right" : "text-rose-300 text-sm text-right"}>{entry.signedAmount > 0 ? "+" : "-"}{currency(entry.signedAmount)}</strong>
            <button type="button" onClick={() => updateEntry(entry.id, { ignored: !entry.ignored })} title={entry.ignored ? "Importar item" : "Ignorar item"} className={"rounded-lg p-2 " + (entry.ignored ? "bg-white/5 text-slate-400" : "bg-rose-500/10 text-rose-300")}>{entry.ignored ? <Check className="w-4 h-4"/> : <X className="w-4 h-4"/>}</button>
          </div>)}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground"><FileSpreadsheet className="inline w-4 h-4 mr-1"/>A mesma linha não será criada duas vezes na mesma conta, mesmo se o arquivo for reenviado.</p>
        <button type="button" onClick={commit} disabled={loading || !pending.length || !accountId} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{loading ? "Importando..." : "Confirmar " + pending.length + " lançamento(s)"}</button>
      </div>
      {result && <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100"><strong>Importação concluída.</strong> {result.imported} criado(s), {result.duplicates} duplicado(s) ignorado(s) e {result.ignored} deixado(s) de fora.</div>}
    </section>}
  </div>;
}
