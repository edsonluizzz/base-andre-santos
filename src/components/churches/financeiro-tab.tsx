"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Wallet, Download, FileDown, FileText, Mail, MessageCircle, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type PendingAssignment = {
  assignmentId: string;
  churchName: string;
  deliveredAt: string | null;
  member: "member1" | "member2";
  payingEntityId: string | null;
  payingEntityName: string | null;
  value: number;
  customValue: boolean;
};
type PayingEntity = { id: string; name: string; active: boolean };
type PaymentMethod = "PIX" | "DINHEIRO" | "TRANSFERENCIA" | "BOLETO" | "CARTAO" | "OUTRO";
const METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "PIX", DINHEIRO: "Dinheiro", TRANSFERENCIA: "Transferência", BOLETO: "Boleto", CARTAO: "Cartão", OUTRO: "Outro",
};
type ReceiptChannelStatus = "SKIPPED" | "SENT" | "FAILED";
type ReceiptSummary = {
  id: string;
  pdfUrl: string | null;
  emailStatus: ReceiptChannelStatus;
  whatsappStatus: ReceiptChannelStatus;
};
type CollaboratorRow = {
  collaboratorId: string;
  name: string;
  deliveredCount: number;
  paidCount: number;
  pendingCount: number;
  amountPending: number;
  amountPaid: number;
  pendingAssignments: PendingAssignment[];
  latestReceipt: ReceiptSummary | null;
};
type PaymentsData = {
  rate: number;
  collaborators: CollaboratorRow[];
  totals: { amountPending: number; amountPaid: number };
};

function ChannelIndicator({
  status,
  icon: Icon,
  onResend,
  busy,
}: {
  status: ReceiptChannelStatus;
  icon: typeof Mail;
  onResend: () => void;
  busy: boolean;
}) {
  if (status === "SKIPPED") {
    return (
      <button
        onClick={onResend}
        disabled={busy}
        className="inline-flex items-center gap-1 text-muted-foreground/50 hover:text-foreground disabled:opacity-50"
        title="Sem contato cadastrado — clique pra tentar enviar mesmo assim"
      >
        <Icon className="w-3.5 h-3.5" /> —
      </button>
    );
  }
  if (status === "SENT") {
    return (
      <button
        onClick={onResend}
        disabled={busy}
        className="inline-flex items-center gap-1 text-emerald-500 hover:text-emerald-400 disabled:opacity-50"
        title="Enviado — clique pra reenviar"
      >
        <Icon className="w-3.5 h-3.5" /> ✓
      </button>
    );
  }
  return (
    <button
      onClick={onResend}
      disabled={busy}
      className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 disabled:opacity-50"
      title="Falhou — clique para reenviar"
    >
      <Icon className="w-3.5 h-3.5" /> ✗ <RotateCw className="w-3 h-3" />
    </button>
  );
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinanceiroTab() {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rateInput, setRateInput] = useState("");
  const [savingRate, setSavingRate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resendBusyKey, setResendBusyKey] = useState<string | null>(null);
  const [regenBusyId, setRegenBusyId] = useState<string | null>(null);
  const [entities, setEntities] = useState<PayingEntity[]>([]);
  const [entityFilter, setEntityFilter] = useState<string>(""); // "" = todas, "DEFAULT" = padrão, ou id
  const [payerBusyId, setPayerBusyId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [valueBusyId, setValueBusyId] = useState<string | null>(null);
  const [valueEdits, setValueEdits] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const qs = entityFilter ? `?payingEntityId=${entityFilter}` : "";
    const res = await fetch(`/api/church-assignments/payments${qs}`);
    if (res.ok) {
      const j: PaymentsData = await res.json();
      setData(j);
      setRateInput(String(j.rate));
    }
    setLoading(false);
  }, [entityFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/paying-entities")
      .then((r) => r.json())
      .then((j) => setEntities(j.data ?? []))
      .catch(() => {});
  }, []);

  async function setPayer(assignmentId: string, payingEntityId: string | null) {
    setPayerBusyId(assignmentId);
    const res = await fetch(`/api/church-assignments/${assignmentId}/paying-entity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payingEntityId }),
    });
    if (res.ok) load();
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao definir fonte pagadora"); }
    setPayerBusyId(null);
  }

  async function saveAssignmentValue(assignmentId: string, current: number) {
    const raw = valueEdits[assignmentId];
    if (raw === undefined) return;
    const trimmed = raw.trim();
    const value = trimmed === "" ? null : Number(trimmed.replace(",", "."));
    if (value !== null && (!Number.isFinite(value) || value <= 0)) {
      toast.error("Valor inválido");
      return;
    }
    if (value === current || (value === null && current === data?.rate)) {
      setValueEdits((prev) => { const n = { ...prev }; delete n[assignmentId]; return n; });
      return;
    }
    setValueBusyId(assignmentId);
    const res = await fetch(`/api/church-assignments/${assignmentId}/value`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentValue: value }),
    });
    if (res.ok) {
      setValueEdits((prev) => { const n = { ...prev }; delete n[assignmentId]; return n; });
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao definir valor");
    }
    setValueBusyId(null);
  }

  async function saveRate() {
    const value = Number(rateInput.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Valor inválido");
      return;
    }
    setSavingRate(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryPaymentValue: value }),
    });
    if (res.ok) { toast.success("Valor atualizado"); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao salvar"); }
    setSavingRate(false);
  }

  async function payOne(assignmentId: string, member: "member1" | "member2") {
    setBusyId(assignmentId);
    const res = await fetch(`/api/church-assignments/${assignmentId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member, paymentMethod }),
    });
    if (res.ok) { toast.success("Marcado como pago"); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao marcar pago"); }
    setBusyId(null);
  }

  async function payAll(collaboratorId: string) {
    setBusyId(collaboratorId);
    const res = await fetch("/api/church-assignments/pay-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId, paymentMethod }),
    });
    if (res.ok) { toast.success("Pagamentos marcados"); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao marcar pagos"); }
    setBusyId(null);
  }

  async function regeneratePdf(receiptId: string) {
    setRegenBusyId(receiptId);
    const res = await fetch(`/api/payment-receipts/${receiptId}/regenerate-pdf`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { toast.success("PDF gerado"); load(); }
    else toast.error(d.error ?? "Erro ao gerar PDF");
    setRegenBusyId(null);
  }

  async function resendChannel(receiptId: string, channel: "email" | "whatsapp") {
    const key = `${receiptId}:${channel}`;
    setResendBusyKey(key);
    const res = await fetch(`/api/payment-receipts/${receiptId}/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      const status = channel === "email" ? d.emailStatus : d.whatsappStatus;
      if (status === "SENT") toast.success("Recibo reenviado");
      else toast.error(d.emailError ?? d.whatsappError ?? "Falha ao reenviar");
      load();
    } else {
      toast.error(d.error ?? "Erro ao reenviar recibo");
    }
    setResendBusyKey(null);
  }

  if (loading || !data) {
    return <p className="text-sm text-muted-foreground px-1">Carregando...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/[0.08] p-4 flex items-center gap-3 flex-wrap">
        <label className="text-xs font-medium text-muted-foreground">Valor por entrega (por membro)</label>
        <input
          type="text"
          inputMode="decimal"
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
          className="w-28 rounded-lg px-3 py-1.5 text-sm bg-secondary border border-border outline-none"
        />
        <Button size="sm" onClick={saveRate} disabled={savingRate}>
          {savingRate ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-medium text-muted-foreground">Fonte pagadora</label>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm bg-secondary border border-border outline-none"
        >
          <option value="">Todas</option>
          <option value="DEFAULT">Padrão (candidato da campanha)</option>
          {entities.filter((e) => e.active).map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-medium text-muted-foreground">Forma de pagamento (próximos pagamentos)</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          className="rounded-lg px-3 py-1.5 text-sm bg-secondary border border-border outline-none"
        >
          {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
            <option key={m} value={m}>{METHOD_LABEL[m]}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="grid grid-cols-2 gap-3 flex-1 min-w-[280px]">
          <div className="rounded-xl border border-white/[0.08] p-4">
            <p className="text-xs text-muted-foreground">Total pendente</p>
            <p className="text-xl font-bold text-foreground">{fmt(data.totals.amountPending)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] p-4">
            <p className="text-xs text-muted-foreground">Total pago</p>
            <p className="text-xl font-bold text-foreground">{fmt(data.totals.amountPaid)}</p>
          </div>
        </div>
        <a href={`/api/church-assignments/payments/export${entityFilter ? `?payingEntityId=${entityFilter}` : ""}`} download>
          <Button size="sm" variant="outline" className="gap-1.5">
            <FileDown className="w-3.5 h-3.5" /> XLSX
          </Button>
        </a>
        <a href={`/api/church-assignments/payments/export-pdf${entityFilter ? `?payingEntityId=${entityFilter}` : ""}`} download>
          <Button size="sm" variant="outline" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" /> PDF
          </Button>
        </a>
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]" style={{ background: "rgba(13,27,42,0.5)" }}>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Colaborador</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Entregas</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Pagas</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Devido</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Recibo</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {data.collaborators.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma entrega confirmada ainda.</td></tr>
            ) : (
              data.collaborators.map((c) => (
                <Fragment key={c.collaboratorId}>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-foreground">
                      <button
                        onClick={() => setExpanded(expanded === c.collaboratorId ? null : c.collaboratorId)}
                        className="flex items-center gap-1.5 disabled:opacity-50"
                        disabled={c.pendingAssignments.length === 0}
                      >
                        {c.pendingAssignments.length > 0 ? (
                          expanded === c.collaboratorId ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                        ) : null}
                        {c.name}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.deliveredCount}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.paidCount}</td>
                    <td className="px-4 py-2.5 text-foreground">{fmt(c.amountPending)}</td>
                    <td className="px-4 py-2.5">
                      {c.latestReceipt ? (
                        <div className="flex items-center gap-2.5">
                          <ChannelIndicator
                            status={c.latestReceipt.emailStatus}
                            icon={Mail}
                            busy={resendBusyKey === `${c.latestReceipt.id}:email`}
                            onResend={() => resendChannel(c.latestReceipt!.id, "email")}
                          />
                          <ChannelIndicator
                            status={c.latestReceipt.whatsappStatus}
                            icon={MessageCircle}
                            busy={resendBusyKey === `${c.latestReceipt.id}:whatsapp`}
                            onResend={() => resendChannel(c.latestReceipt!.id, "whatsapp")}
                          />
                          {c.latestReceipt.pdfUrl ? (
                            <a href={c.latestReceipt.pdfUrl} target="_blank" rel="noopener noreferrer" title="Ver / baixar PDF do recibo">
                              <Button size="sm" variant="outline" className="h-6 px-2 gap-1 text-xs">
                                <Download className="w-3 h-3" /> PDF
                              </Button>
                            </a>
                          ) : (
                            <Button
                              size="sm" variant="outline" className="h-6 px-2 gap-1 text-xs"
                              disabled={regenBusyId === c.latestReceipt.id}
                              onClick={() => regeneratePdf(c.latestReceipt!.id)}
                              title="Recibo sem PDF — clique para gerar"
                            >
                              <Download className="w-3 h-3" /> {regenBusyId === c.latestReceipt.id ? "Gerando..." : "Gerar PDF"}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {c.pendingCount > 0 && (
                        <Button
                          size="sm" variant="outline" className="gap-1.5"
                          disabled={busyId === c.collaboratorId}
                          onClick={() => payAll(c.collaboratorId)}
                        >
                          <Wallet className="w-3.5 h-3.5" /> Pagar tudo
                        </Button>
                      )}
                    </td>
                  </tr>
                  {expanded === c.collaboratorId && c.pendingAssignments.map((p) => (
                    <tr key={p.assignmentId + p.member} className="bg-white/[0.015]">
                      <td className="px-4 py-2 pl-9 text-muted-foreground text-xs" colSpan={2}>{p.churchName}</td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={valueEdits[p.assignmentId] ?? String(p.value)}
                          disabled={valueBusyId === p.assignmentId}
                          onChange={(e) => setValueEdits((prev) => ({ ...prev, [p.assignmentId]: e.target.value }))}
                          onBlur={() => saveAssignmentValue(p.assignmentId, p.value)}
                          title={p.customValue ? "Valor customizado nesta entrega" : "Valor padrão — edite pra customizar"}
                          className={`w-20 rounded-lg px-2 py-1 text-xs bg-secondary border outline-none ${p.customValue ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}
                        />
                      </td>
                      <td className="px-4 py-2" colSpan={2}>
                        <select
                          value={p.payingEntityId ?? ""}
                          disabled={payerBusyId === p.assignmentId}
                          onChange={(e) => setPayer(p.assignmentId, e.target.value || null)}
                          className="w-full max-w-[220px] rounded-lg px-2 py-1 text-xs bg-secondary border border-border outline-none"
                        >
                          <option value="">Padrão (candidato da campanha)</option>
                          {entities.filter((e) => e.active).map((e) => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm" variant="outline"
                          disabled={busyId === p.assignmentId}
                          onClick={() => payOne(p.assignmentId, p.member)}
                        >
                          Marcar pago
                        </Button>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
