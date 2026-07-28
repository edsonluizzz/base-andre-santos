"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Wallet, Download, FileDown, Mail, MessageCircle, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type PendingAssignment = {
  assignmentId: string;
  churchName: string;
  deliveredAt: string | null;
  member: "member1" | "member2";
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
      <span className="inline-flex items-center gap-1 text-muted-foreground/50" title="Sem contato cadastrado">
        <Icon className="w-3.5 h-3.5" /> —
      </span>
    );
  }
  if (status === "SENT") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-500" title="Enviado">
        <Icon className="w-3.5 h-3.5" /> ✓
      </span>
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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/church-assignments/payments");
    if (res.ok) {
      const j: PaymentsData = await res.json();
      setData(j);
      setRateInput(String(j.rate));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
      body: JSON.stringify({ member }),
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
      body: JSON.stringify({ collaboratorId }),
    });
    if (res.ok) { toast.success("Pagamentos marcados"); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao marcar pagos"); }
    setBusyId(null);
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
        <a href="/api/church-assignments/payments/export" download>
          <Button size="sm" variant="outline" className="gap-1.5">
            <FileDown className="w-3.5 h-3.5" /> Exportar XLSX
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
                          {c.latestReceipt.pdfUrl && (
                            <a
                              href={c.latestReceipt.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                              title="Baixar PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
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
                      <td className="px-4 py-2 pl-9 text-muted-foreground text-xs" colSpan={3}>{p.churchName}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{fmt(data.rate)}</td>
                      <td className="px-4 py-2"></td>
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
