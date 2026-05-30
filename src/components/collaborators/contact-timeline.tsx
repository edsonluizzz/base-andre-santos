"use client";

import { useEffect, useState } from "react";
import { Send, MessageCircle, ThumbsUp, ThumbsDown, CheckCircle2, XCircle, FileText, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContactLog {
  id: string;
  kind: string;
  channel: string | null;
  source: string | null;
  actorId: string | null;
  notes: string | null;
  createdAt: string;
}

const KIND_META: Record<string, { label: string; icon: typeof Send; color: string }> = {
  SENT_INVITE:       { label: "Convite enviado",       icon: Send,        color: "text-blue-400" },
  SENT_REACTIVATION: { label: "Reativação enviada",    icon: MessageCircle, color: "text-purple-400" },
  RECEIVED_YES:      { label: "Respondeu SIM",         icon: ThumbsUp,    color: "text-green-400" },
  RECEIVED_NO:       { label: "Respondeu NÃO",         icon: ThumbsDown,  color: "text-slate-400" },
  CONVERT:           { label: "Confirmou apoio",       icon: CheckCircle2, color: "text-green-400" },
  OPT_OUT:           { label: "Optou por não participar", icon: XCircle,  color: "text-red-400" },
  MANUAL_NOTE:       { label: "Nota manual",           icon: FileText,    color: "text-amber-400" },
};

const SOURCE_LABEL: Record<string, string> = {
  WF1: "cron diário (WF1)",
  WF3: "lead novo (WF3)",
  WF4: "disparo manual (WF4)",
  n8n: "WhatsApp (n8n)",
  MANUAL_FORM: "formulário público",
  MANUAL_ADMIN: "admin",
};

export function ContactTimeline({ collaboratorId }: { collaboratorId: string }) {
  const [logs, setLogs] = useState<ContactLog[] | null>(null);

  useEffect(() => {
    fetch(`/api/collaborators/${collaboratorId}/contacts`)
      .then((r) => r.ok ? r.json() : [])
      .then(setLogs)
      .catch(() => setLogs([]));
  }, [collaboratorId]);

  if (logs === null) {
    return (
      <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
        <div className="h-4 w-32 bg-white/[0.06] rounded mb-3 animate-pulse" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-white/[0.04] rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Histórico de Contato</h2>
        <span className="text-[10px] text-muted-foreground ml-auto">{logs.length} eventos</span>
      </div>

      {logs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Nenhum contato registrado ainda.
        </p>
      ) : (
        <ol className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-white/[0.08]">
          {logs.map((log) => {
            const meta = KIND_META[log.kind] ?? { label: log.kind, icon: FileText, color: "text-muted-foreground" };
            const Icon = meta.icon;
            const sourceLabel = log.source ? (SOURCE_LABEL[log.source] ?? log.source) : null;
            const date = new Date(log.createdAt);
            return (
              <li key={log.id} className="relative pl-9">
                <span className={`absolute left-0 top-0 w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center ${meta.color}`}>
                  <Icon className="w-3 h-3" />
                </span>
                <div className="text-xs">
                  <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
                  {log.channel && <span className="text-muted-foreground"> · {log.channel.toLowerCase()}</span>}
                  {sourceLabel && <span className="text-muted-foreground"> · {sourceLabel}</span>}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {" · "}
                  <span className="italic">{formatDistanceToNow(date, { locale: ptBR, addSuffix: true })}</span>
                </div>
                {log.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{log.notes}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
