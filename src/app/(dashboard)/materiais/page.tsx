"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Check, X, FileText, MapPin, Mail, MessageCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { materialItemLabel, type MaterialRequestItem } from "@/lib/material-catalog";

type MaterialRequestRow = {
  id: string;
  items: MaterialRequestItem[];
  status: "PENDENTE_APROVACAO" | "APROVADO" | "ENTREGUE" | "RECUSADO";
  pdfUrl: string | null;
  termSnapshotName: string;
  termSnapshotCpf: string;
  termAcceptedAt: string;
  emailStatus: "SKIPPED" | "SENT" | "FAILED";
  whatsappStatus: "SKIPPED" | "SENT" | "FAILED";
  deliveryCep: string | null;
  deliveryLogradouro: string | null;
  deliveryNumero: string | null;
  deliveryComplemento: string | null;
  deliveryBairro: string | null;
  deliveryMunicipio: string | null;
  deliveryUf: string | null;
  approvedAt: string | null;
  deliveredAt: string | null;
  notes: string | null;
  createdAt: string;
  collaborator: { id: string; name: string; phone: string | null; email: string | null };
  approvedBy: { name: string | null; email: string | null } | null;
  deliveredBy: { name: string | null; email: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE_APROVACAO: "Pendente de aprovação",
  APROVADO: "Aprovado — aguardando envio",
  ENTREGUE: "Enviado",
  RECUSADO: "Recusado",
};
const STATUS_COLOR: Record<string, string> = {
  PENDENTE_APROVACAO: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  APROVADO: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ENTREGUE: "bg-green-500/15 text-green-400 border-green-500/30",
  RECUSADO: "bg-red-500/15 text-red-400 border-red-500/30",
};

function fmtAddress(r: MaterialRequestRow): string | null {
  const linha1 = [r.deliveryLogradouro, r.deliveryNumero && `nº ${r.deliveryNumero}`, r.deliveryComplemento].filter(Boolean).join(", ");
  const linha2 = [r.deliveryBairro, [r.deliveryMunicipio, r.deliveryUf].filter(Boolean).join("/"), r.deliveryCep].filter(Boolean).join(" — ");
  const linhas = [linha1, linha2].filter(Boolean);
  return linhas.length > 0 ? linhas.join(" — ") : null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function MateriaisPage() {
  const [rows, setRows] = useState<MaterialRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDENTE_APROVACAO");
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter && statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/materiais${qs}`);
      if (res.ok) {
        const d = await res.json();
        setRows(d.rows ?? []);
      } else {
        toast.error("Erro ao carregar solicitações");
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  async function act(id: string, action: "APROVAR" | "RECUSAR" | "ENTREGAR") {
    if (action === "RECUSAR" && !confirm("Recusar esta solicitação de material?")) return;
    setActingId(id);
    try {
      const res = await fetch(`/api/materiais/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(
          action === "APROVAR" ? "Solicitação aprovada!" :
          action === "ENTREGAR" ? "Marcado como enviado!" : "Solicitação recusada",
        );
        fetchRows();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Erro ao atualizar solicitação");
      }
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="page-header">
          <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Material de Campanha
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Solicitações de material com Termo de Apoiador já assinado — aprove ou recuse antes da entrega.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "PENDENTE_APROVACAO")}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDENTE_APROVACAO">Pendentes de aprovação</SelectItem>
              <SelectItem value="APROVADO">Aprovados (aguardando envio)</SelectItem>
              <SelectItem value="ENTREGUE">Enviados</SelectItem>
              <SelectItem value="RECUSADO">Recusados</SelectItem>
              <SelectItem value="ALL">Todos</SelectItem>
            </SelectContent>
          </Select>
          <a href={`/api/materiais/export-pdf${statusFilter && statusFilter !== "ALL" ? `?status=${statusFilter}` : ""}`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-medium border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
            <FileText className="w-3.5 h-3.5" /> PDF
          </a>
          <a href={`/api/materiais/export${statusFilter && statusFilter !== "ALL" ? `?status=${statusFilter}` : ""}`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-medium border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </a>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-white/[0.08]">
          <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma solicitação nesse status.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-white/[0.08] divide-y divide-white/[0.04] overflow-hidden">
          {rows.map((r) => (
            <div key={r.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{r.termSnapshotName}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    CPF {r.termSnapshotCpf} · assinado em {fmtDate(r.termAcceptedAt)}
                  </p>
                  {fmtAddress(r) && (
                    <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {fmtAddress(r)}
                    </p>
                  )}
                  {r.collaborator.email && (
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">{r.collaborator.email}</p>
                  )}
                </div>
                {r.pdfUrl && (
                  <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0">
                    <FileText className="w-3.5 h-3.5" /> Ver termo assinado
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {r.items.map((i) => (
                  <span key={i.item} className="text-[11px] px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground">
                    {i.qty} × {materialItemLabel(i.item)}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {r.emailStatus === "SENT" ? "enviado" : r.emailStatus === "FAILED" ? "falhou" : "não enviado"}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {r.whatsappStatus === "SENT" ? "enviado" : r.whatsappStatus === "FAILED" ? "falhou" : "não enviado"}</span>
                {r.approvedBy && <span>Aprovado por {r.approvedBy.name ?? r.approvedBy.email}</span>}
                {r.deliveredBy && <span>Entregue por {r.deliveredBy.name ?? r.deliveredBy.email}</span>}
              </div>

              {r.status === "PENDENTE_APROVACAO" && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" disabled={actingId === r.id} onClick={() => act(r.id, "APROVAR")}
                    className="gap-1.5 bg-primary text-primary-foreground">
                    <Check className="w-3.5 h-3.5" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" disabled={actingId === r.id} onClick={() => act(r.id, "RECUSAR")}
                    className="gap-1.5 text-destructive hover:bg-destructive/10">
                    <X className="w-3.5 h-3.5" /> Recusar
                  </Button>
                </div>
              )}
              {(r.status === "APROVADO" || r.status === "ENTREGUE") && (
                <label className="flex items-center gap-2 pt-1 cursor-pointer w-fit select-none">
                  <input
                    type="checkbox"
                    checked={r.status === "ENTREGUE"}
                    disabled={actingId === r.id || r.status === "ENTREGUE"}
                    onChange={() => act(r.id, "ENTREGAR")}
                    className="w-4 h-4 rounded accent-primary cursor-pointer disabled:cursor-default"
                  />
                  <span className="text-xs font-medium text-foreground">Enviado</span>
                </label>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
