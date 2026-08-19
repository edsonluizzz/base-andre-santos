"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Wallet, Upload, Check, X, Link2, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinanceGuard } from "@/components/financeiro/finance-guard";
import { FinanceNav } from "@/components/financeiro/finance-nav";

type TxStatus = "UNMATCHED" | "MATCHED" | "IGNORED";

type BankTransaction = {
  id: string;
  acctId: string;
  trnType: string;
  amount: number;
  postedAt: string;
  name: string;
  memo: string | null;
  status: TxStatus;
  matchedEntryId: string | null;
  matchedEntry: { id: string; description: string; amount: number; status: string; contract: { code: string } | null } | null;
};

type PendingEntry = { id: string; description: string; amount: number; status: string; date: string };

const STATUS_LABEL: Record<TxStatus, string> = { UNMATCHED: "Não conciliado", MATCHED: "Conciliado", IGNORED: "Ignorado" };
const STATUS_STYLE: Record<TxStatus, string> = {
  UNMATCHED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  MATCHED: "bg-green-500/15 text-green-400 border-green-500/30",
  IGNORED: "bg-white/[0.06] text-muted-foreground border-white/[0.1]",
};

function fmt(n: number) {
  return Math.abs(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
function acctLabel(acctId: string) {
  return `Conta ...${acctId.slice(-4)}`;
}

function ExtratosContent() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterAcct, setFilterAcct] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("UNMATCHED");
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterAcct) params.set("acctId", filterAcct);
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/financeiro/extratos?${params.toString()}`);
    if (res.ok) { const j = await res.json(); setTransactions(j.data ?? []); }
    setLoading(false);
  }, [filterAcct, filterStatus]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/financeiro/entries").then((r) => r.json()).then((j) => {
      const all: PendingEntry[] = (j.data ?? []).map((e: PendingEntry) => e);
      setPendingEntries(all.filter((e) => e.status === "PENDENTE" || e.status === "AGENDADO"));
    }).catch(() => {});
  }, []);

  const accounts = Array.from(new Set(transactions.map((t) => t.acctId))).sort();

  async function handleUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    const files = ev.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    const res = await fetch("/api/financeiro/extratos/import", { method: "POST", body: fd });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (res.ok) {
      const j = await res.json();
      toast.success(`Importado: ${j.imported} novas, ${j.skipped} já existiam, ${j.suggested} com sugestão de vínculo`);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao importar extrato");
    }
  }

  async function confirmSuggestion(tx: BankTransaction) {
    const res = await fetch(`/api/financeiro/extratos/${tx.id}/vincular`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (res.ok) { toast.success("Vínculo confirmado — lançamento marcado como pago"); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao confirmar"); }
  }

  async function rejectSuggestion(tx: BankTransaction) {
    const res = await fetch(`/api/financeiro/extratos/${tx.id}/rejeitar`, { method: "POST" });
    if (res.ok) { toast.success("Sugestão descartada"); load(); }
    else toast.error("Erro ao rejeitar sugestão");
  }

  async function linkManually(tx: BankTransaction, financialEntryId: string) {
    const res = await fetch(`/api/financeiro/extratos/${tx.id}/vincular`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ financialEntryId }),
    });
    setLinkingId(null);
    if (res.ok) { toast.success("Vínculo confirmado — lançamento marcado como pago"); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao vincular"); }
  }

  async function ignore(tx: BankTransaction) {
    const res = await fetch(`/api/financeiro/extratos/${tx.id}/ignorar`, { method: "POST" });
    if (res.ok) { toast.success("Transação ignorada"); load(); }
    else toast.error("Erro ao ignorar");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-4">
      <div className="flex items-end justify-between gap-3">
        <div className="page-header">
          <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> Financeiro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Extratos bancários (OFX) e conciliação</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".ofx" multiple className="hidden" onChange={handleUpload} />
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5 bg-primary text-primary-foreground">
            <Upload className="w-3.5 h-3.5" /> {uploading ? "Importando..." : "Importar OFX"}
          </Button>
        </div>
      </div>

      <FinanceNav />

      <div className="flex flex-wrap gap-3">
        <Select value={filterAcct || "ALL"} onValueChange={(v) => setFilterAcct(v === "ALL" ? "" : v ?? "")}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Conta" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as contas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a} value={a}>{acctLabel(a)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus || "ALL"} onValueChange={(v) => setFilterStatus(v === "ALL" ? "" : v ?? "")}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="UNMATCHED">Não conciliado</SelectItem>
            <SelectItem value="MATCHED">Conciliado</SelectItem>
            <SelectItem value="IGNORED">Ignorado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]" style={{ background: "rgba(13,27,42,0.5)" }}>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Data</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Conta</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Histórico</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Valor</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Status</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma transação importada ainda. Clique em &ldquo;Importar OFX&rdquo; pra começar.</td></tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02] align-top">
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(t.postedAt)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{acctLabel(t.acctId)}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-sm">{t.name}</p>
                    {t.memo && <p className="text-[11px] text-muted-foreground">{t.memo}</p>}
                    {t.status === "UNMATCHED" && t.matchedEntry && (
                      <p className="text-[11px] text-primary mt-1">
                        Sugestão: {t.matchedEntry.description}{t.matchedEntry.contract ? ` (${t.matchedEntry.contract.code})` : ""}
                      </p>
                    )}
                    {t.status === "MATCHED" && t.matchedEntry && (
                      <p className="text-[11px] text-green-400 mt-1">
                        Vinculado: {t.matchedEntry.description}{t.matchedEntry.contract ? ` (${t.matchedEntry.contract.code})` : ""}
                      </p>
                    )}
                    {t.status === "UNMATCHED" && linkingId === t.id && (
                      <div className="mt-2 max-w-xs">
                        <Select onValueChange={(v) => { if (typeof v === "string" && v) linkManually(t, v); }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Escolher lançamento..." /></SelectTrigger>
                          <SelectContent>
                            {pendingEntries.map((e) => (
                              <SelectItem key={e.id} value={e.id}>{e.description} — {fmt(e.amount)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-medium whitespace-nowrap ${t.trnType === "CREDIT" ? "text-green-400" : "text-foreground"}`}>
                    {t.trnType === "CREDIT" ? "+" : "-"}{fmt(t.amount)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {t.status === "UNMATCHED" && (
                      <div className="flex items-center justify-end gap-1">
                        {t.matchedEntry ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => confirmSuggestion(t)} title="Confirmar vínculo"><Check className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => rejectSuggestion(t)} title="Rejeitar sugestão"><X className="w-3.5 h-3.5" /></Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setLinkingId(linkingId === t.id ? null : t.id)} title="Vincular a lançamento">
                            <Link2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => ignore(t)} title="Ignorar"><EyeOff className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ExtratosPage() {
  return (
    <FinanceGuard>
      <ExtratosContent />
    </FinanceGuard>
  );
}
