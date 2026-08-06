"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, MessageCircle, Plus, Users, RefreshCw, Clock } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BroadcastRow = {
  id: string;
  title: string;
  audience: string;
  type: "DIRECT" | "GROUP" | "BROADCAST";
  status: "DRAFT" | "QUEUED" | "SENDING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";
  totalCount: number;
  sentCount: number;
  failedCount: number;
  delaySecondsMin: number;
  delaySecondsMax: number;
  dailyLimit: number;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const TYPE_LABEL: Record<string, string> = {
  DIRECT: "1:1 individual",
  GROUP: "Grupo",
  BROADCAST: "Lista de transmissão",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  QUEUED: "Na fila",
  SENDING: "Enviando",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
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

const LIVE_STATUSES = new Set(["QUEUED", "SENDING"]);

export default function DisparosPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBroadcasts = useCallback(async () => {
    const res = await fetch("/api/admin/whatsapp/broadcast?limit=50");
    if (res.ok) {
      const data = await res.json();
      setBroadcasts(data.broadcasts ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  // Polling leve enquanto houver algo QUEUED/SENDING
  useEffect(() => {
    const hasLive = broadcasts.some((b) => LIVE_STATUSES.has(b.status));
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (hasLive) {
      pollRef.current = setInterval(fetchBroadcasts, 15000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [broadcasts, fetchBroadcasts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="page-header">
          <Link href="/comunicados" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1.5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Comunicados
          </Link>
          <h1 className="text-2xl font-bold gradient-title flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" /> Disparos WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe o progresso, pause, retome ou reenvie falhas.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchBroadcasts} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
          <Link href="/comunicados/disparar" className={cn(buttonVariants(), "bg-primary text-primary-foreground hover:bg-primary/90 gap-2")}>
            <Plus className="w-4 h-4" /> Novo Disparo
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-5 border border-white/[0.08]">
              <div className="h-4 rounded w-2/5 animate-shimmer mb-3" />
              <div className="h-3 rounded w-full animate-shimmer" />
            </div>
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <div className="w-16 h-16 rounded-2xl bg-primary/[0.07] border border-primary/[0.12] flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-7 h-7 text-primary/60" />
          </div>
          <p className="font-medium text-foreground mb-1">Nenhum disparo de WhatsApp ainda</p>
          <p className="text-sm text-muted-foreground mb-4">Crie o primeiro disparo pra contatar sua base</p>
          <Link href="/comunicados/disparar" className={cn(buttonVariants(), "bg-primary text-primary-foreground hover:bg-primary/90 gap-2 mx-auto")}>
            <Plus className="w-4 h-4" /> Novo Disparo
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => {
            const progressTotal = b.type === "GROUP" ? 1 : b.totalCount;
            const progressDone = b.type === "GROUP" ? (b.status === "COMPLETED" ? 1 : 0) : b.sentCount + b.failedCount;
            const pct = progressTotal > 0 ? Math.min(100, Math.round((progressDone / progressTotal) * 100)) : 0;
            const scheduledFuture = b.scheduledFor && new Date(b.scheduledFor) > new Date();
            return (
              <Link
                key={b.id}
                href={`/comunicados/disparos/${b.id}`}
                className="block glass-card rounded-xl border border-white/[0.08] p-4 sm:p-5 hover:border-primary/20 hover:bg-white/[0.02] transition-all"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground truncate">{b.title}</p>
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLE[b.status])}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{TYPE_LABEL[b.type] ?? b.type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(b.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {b.audience}
                      </span>
                      {scheduledFuture && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Clock className="w-3 h-3" /> Agendado pra {format(new Date(b.scheduledFor!), "dd MMM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  {b.type !== "GROUP" && (
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">{progressDone}/{progressTotal}</p>
                      {b.failedCount > 0 && (
                        <p className="text-[11px] text-red-400">{b.failedCount} falha{b.failedCount !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                  )}
                </div>
                {b.type !== "GROUP" && (
                  <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", b.failedCount > 0 ? "bg-amber-500" : "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
