"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, MessageCircle, Pause, Play, XCircle, RefreshCw, RotateCcw,
  Clock, Users, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Broadcast = {
  id: string; title: string; message: string; audience: string;
  type: "DIRECT" | "GROUP" | "BROADCAST";
  status: "DRAFT" | "QUEUED" | "SENDING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";
  groupId: string | null;
  totalCount: number; sentCount: number; failedCount: number;
  delaySecondsMin: number; delaySecondsMax: number; dailyLimit: number;
  scheduledFor: string | null; startedAt: string | null; completedAt: string | null;
  error: string | null; createdAt: string;
};

type Delivery = {
  id: string; name: string | null; phone: string; status: string;
  sentAt: string | null; deliveredAt: string | null; readAt: string | null;
  error: string | null; attemptCount: number; zapiMessageId: string | null;
};

type StatusCount = { status: string; count: number };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho", QUEUED: "Na fila", SENDING: "Enviando", PAUSED: "Pausado",
  COMPLETED: "Concluído", FAILED: "Falhou", CANCELLED: "Cancelado",
};
const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-white/[0.04] text-muted-foreground border-white/10",
  QUEUED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  SENDING: "bg-primary/15 text-primary border-primary/30",
  PAUSED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  COMPLETED: "bg-green-500/15 text-green-400 border-green-500/30",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/30",
  CANCELLED: "bg-white/[0.04] text-muted-foreground border-white/10",
};
const DELIVERY_LABEL: Record<string, string> = {
  PENDING: "Pendente", SENT: "Enviado", DELIVERED: "Entregue", READ: "Lido",
  FAILED: "Falhou", SKIPPED: "Ignorado",
};
const DELIVERY_STYLE: Record<string, string> = {
  PENDING: "bg-white/[0.04] text-muted-foreground border-white/10",
  SENT: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  DELIVERED: "bg-primary/15 text-primary border-primary/30",
  READ: "bg-green-500/15 text-green-400 border-green-500/30",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/30",
  SKIPPED: "bg-white/[0.04] text-muted-foreground border-white/10",
};
const LIVE_STATUSES = new Set(["QUEUED", "SENDING"]);

export default function DisparoDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDetail = useCallback(async () => {
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/admin/whatsapp/broadcast/${id}${qs}`);
    if (res.ok) {
      const data = await res.json();
      setBroadcast(data.broadcast);
      setDeliveries(data.deliveries ?? []);
      setStatusCounts(data.statusCounts ?? []);
    } else {
      toast.error("Disparo não encontrado");
    }
    setLoading(false);
  }, [id, statusFilter]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (broadcast && LIVE_STATUSES.has(broadcast.status)) {
      pollRef.current = setInterval(fetchDetail, 10000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [broadcast, fetchDetail]);

  async function runAction(action: "cancel" | "pause" | "resume" | "retry-failed" | "start", confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/whatsapp/broadcast/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        toast.success(
          action === "retry-failed" ? `${data.retried} entrega(s) reenviada(s) pra fila` : "Atualizado"
        );
        fetchDetail();
      } else {
        toast.error(data?.error ?? "Erro ao executar ação");
      }
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 rounded animate-shimmer" />
        <div className="h-32 rounded-2xl animate-shimmer" />
      </div>
    );
  }

  if (!broadcast) {
    return <p className="text-sm text-muted-foreground">Disparo não encontrado.</p>;
  }

  const progressTotal = broadcast.type === "GROUP" ? 1 : broadcast.totalCount;
  const progressDone = broadcast.type === "GROUP" ? (broadcast.status === "COMPLETED" ? 1 : 0) : broadcast.sentCount + broadcast.failedCount;
  const pct = progressTotal > 0 ? Math.min(100, Math.round((progressDone / progressTotal) * 100)) : 0;
  const scheduledFuture = broadcast.scheduledFor && new Date(broadcast.scheduledFor) > new Date();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <Link href="/comunicados/disparos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Disparos WhatsApp
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" /> {broadcast.title}
          </h1>
          <Badge variant="outline" className={cn("text-[11px]", STATUS_STYLE[broadcast.status])}>
            {STATUS_LABEL[broadcast.status] ?? broadcast.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{broadcast.audience}</p>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        {broadcast.status === "DRAFT" && (
          <Button size="sm" disabled={acting} onClick={() => runAction("start")} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            <Play className="w-3.5 h-3.5" /> Iniciar disparo
          </Button>
        )}
        {["QUEUED", "SENDING"].includes(broadcast.status) && (
          <Button size="sm" variant="outline" disabled={acting} onClick={() => runAction("pause")} className="gap-1.5">
            <Pause className="w-3.5 h-3.5" /> Pausar
          </Button>
        )}
        {broadcast.status === "PAUSED" && (
          <Button size="sm" disabled={acting} onClick={() => runAction("resume")} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            <Play className="w-3.5 h-3.5" /> Retomar
          </Button>
        )}
        {broadcast.failedCount > 0 && ["COMPLETED", "FAILED", "SENDING", "PAUSED"].includes(broadcast.status) && (
          <Button size="sm" variant="outline" disabled={acting} onClick={() => runAction("retry-failed", `Reenviar ${broadcast.failedCount} entrega(s) com falha?`)} className="gap-1.5 text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
            <RotateCcw className="w-3.5 h-3.5" /> Reenviar falhas ({broadcast.failedCount})
          </Button>
        )}
        {["DRAFT", "QUEUED", "SENDING", "PAUSED"].includes(broadcast.status) && (
          <Button size="sm" variant="ghost" disabled={acting} onClick={() => runAction("cancel", "Cancelar este disparo? Não pode ser desfeito.")} className="gap-1.5 text-destructive hover:bg-destructive/10">
            <XCircle className="w-3.5 h-3.5" /> Cancelar
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={fetchDetail} className="gap-1.5 ml-auto">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {/* Resumo */}
      <div className="glass-card rounded-2xl border border-white/[0.08] p-5 space-y-4">
        {broadcast.type !== "GROUP" && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-semibold text-foreground">{progressDone}/{progressTotal} processados</span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", broadcast.failedCount > 0 ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Enviados</p>
            <p className="font-semibold text-foreground">{broadcast.sentCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Falhas</p>
            <p className={cn("font-semibold", broadcast.failedCount > 0 ? "text-red-400" : "text-foreground")}>{broadcast.failedCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pacing</p>
            <p className="font-semibold text-foreground">{broadcast.delaySecondsMin}-{broadcast.delaySecondsMax}s</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Limite/dia</p>
            <p className="font-semibold text-foreground">{broadcast.dailyLimit}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-2 border-t border-white/[0.06]">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Criado {format(new Date(broadcast.createdAt), "dd MMM yyyy HH:mm", { locale: ptBR })}</span>
          {scheduledFuture && (
            <span className="flex items-center gap-1 text-amber-400"><Clock className="w-3 h-3" /> Agendado pra {format(new Date(broadcast.scheduledFor!), "dd MMM HH:mm", { locale: ptBR })}</span>
          )}
          {broadcast.startedAt && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Iniciado {format(new Date(broadcast.startedAt), "dd MMM HH:mm", { locale: ptBR })}</span>
          )}
          {broadcast.completedAt && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Concluído {format(new Date(broadcast.completedAt), "dd MMM HH:mm", { locale: ptBR })}</span>
          )}
        </div>

        {broadcast.error && (
          <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {broadcast.error}
          </div>
        )}

        <div className="pt-2 border-t border-white/[0.06]">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mensagem</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{broadcast.message}</p>
        </div>
      </div>

      {/* Deliveries */}
      {broadcast.type !== "GROUP" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {statusCounts.map((sc) => (
                <button
                  key={sc.status}
                  onClick={() => setStatusFilter(statusFilter === sc.status ? "" : sc.status)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full border transition-all",
                    statusFilter === sc.status ? DELIVERY_STYLE[sc.status] : "bg-white/[0.03] text-muted-foreground border-white/10 hover:text-foreground"
                  )}
                >
                  {DELIVERY_LABEL[sc.status] ?? sc.status} ({sc.count})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" /> {deliveries.length} exibido{deliveries.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-left text-[11px] text-muted-foreground uppercase tracking-wider">
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Telefone</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Enviado</th>
                    <th className="px-3 py-2 font-medium">Erro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2 text-foreground">{d.name ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{d.phone}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={cn("text-[10px]", DELIVERY_STYLE[d.status])}>
                          {DELIVERY_LABEL[d.status] ?? d.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {d.sentAt ? format(new Date(d.sentAt), "dd/MM HH:mm") : "—"}
                      </td>
                      <td className="px-3 py-2 text-red-400 text-xs max-w-[240px] truncate" title={d.error ?? undefined}>
                        {d.error ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {deliveries.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Nenhuma entrega encontrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-white/[0.08] p-5 text-sm text-muted-foreground">
          Postagem única no grupo <span className="font-mono text-foreground">{broadcast.groupId}</span>.
        </div>
      )}
    </div>
  );
}
