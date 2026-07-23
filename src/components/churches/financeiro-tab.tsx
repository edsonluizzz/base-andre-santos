"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type PendingAssignment = {
  assignmentId: string;
  churchName: string;
  deliveredAt: string | null;
  member: "member1" | "member2";
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
};
type PaymentsData = {
  rate: number;
  collaborators: CollaboratorRow[];
  totals: { amountPending: number; amountPaid: number };
};

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

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.08] p-4">
          <p className="text-xs text-muted-foreground">Total pendente</p>
          <p className="text-xl font-bold text-foreground">{fmt(data.totals.amountPending)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] p-4">
          <p className="text-xs text-muted-foreground">Total pago</p>
          <p className="text-xl font-bold text-foreground">{fmt(data.totals.amountPaid)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]" style={{ background: "rgba(13,27,42,0.5)" }}>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Colaborador</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Entregas</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Pagas</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Devido</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {data.collaborators.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhuma entrega confirmada ainda.</td></tr>
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
