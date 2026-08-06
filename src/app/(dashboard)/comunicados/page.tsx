"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Megaphone, Plus, Clock, Users, Mail, Send, MessageCircle, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Broadcast = { id: string; title: string; message: string; audience: string; sentCount: number; createdAt: string };

const AUDIENCE_OPTIONS = [
  { value: "ALL",                 label: "Todos (ativos + leads)"       },
  { value: "ACTIVE",              label: "Somente ativos"               },
  { value: "LEAD",                label: "Somente leads"                },
  { value: "ROLE:COORD_GERAL",    label: "Coordenadores Gerais"         },
  { value: "ROLE:COORD_REGIONAL", label: "Coordenadores Regionais"      },
  { value: "ROLE:LIDER_MUNICIPAL",label: "Líderes Municipais"           },
  { value: "ROLE:LIDER_BAIRRO",   label: "Líderes de Bairro"            },
  { value: "ROLE:VOLUNTARIO",     label: "Voluntários"                  },
];

function audienceLabel(audience: string): string {
  return AUDIENCE_OPTIONS.find((o) => o.value === audience)?.label
    ?? (audience.startsWith("CITY:") ? `Cidade: ${audience.replace("CITY:", "")}` : audience);
}

export default function ComunicadosPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", audience: "ALL" });
  const [saving, setSaving] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/broadcasts");
    if (res.ok) setBroadcasts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  useEffect(() => {
    if (!dialogOpen) return;
    setCountLoading(true);
    setAudienceCount(null);
    fetch(`/api/broadcasts/count?audience=${encodeURIComponent(form.audience)}`)
      .then((r) => r.json())
      .then((d) => { setAudienceCount(d.count); setCountLoading(false); })
      .catch(() => setCountLoading(false));
  }, [form.audience, dialogOpen]);

  async function handleSave() {
    if (!form.title.trim() || !form.message.trim()) { toast.error("Título e mensagem obrigatórios"); return; }
    setSaving(true);
    const res = await fetch("/api/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      const parts: string[] = [];
      if (data.telegramSent) parts.push("Telegram");
      if (data.emailsSent > 0) parts.push(`${data.emailsSent} e-mail${data.emailsSent !== 1 ? "s" : ""}`);
      const detail = parts.length > 0 ? ` · ${parts.join(" + ")}` : "";
      toast.success(`Comunicado enviado${detail}`);
      setDialogOpen(false);
      fetchBroadcasts();
    } else {
      toast.error("Erro ao enviar comunicado");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="text-2xl font-bold gradient-title flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" /> Comunicados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Registro de comunicações da base de apoio</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/comunicados/disparos" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
            <BarChart3 className="w-4 h-4" /> Ver Disparos
          </Link>
          <Link href="/comunicados/disparar" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
            <MessageCircle className="w-4 h-4" /> Disparar WhatsApp
          </Link>
          <Button
            onClick={() => { setForm({ title: "", message: "", audience: "ALL" }); setDialogOpen(true); }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Comunicado
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-5 border border-white/[0.08]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded w-2/5 animate-shimmer" />
                  <div className="flex gap-3">
                    <div className="h-3 rounded w-28 animate-shimmer" />
                    <div className="h-3 rounded w-20 animate-shimmer" />
                  </div>
                  <div className="h-3 rounded w-full animate-shimmer" />
                  <div className="h-3 rounded w-3/4 animate-shimmer" />
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <div className="h-8 w-8 rounded-md animate-shimmer" />
                  <div className="h-8 w-8 rounded-md animate-shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <div className="w-16 h-16 rounded-2xl bg-primary/[0.07] border border-primary/[0.12] flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-primary/60" />
          </div>
          <p className="font-medium text-foreground mb-1">Nenhum comunicado enviado</p>
          <p className="text-sm text-muted-foreground mb-4">Mantenha sua base informada sobre novidades e eventos</p>
          <Button
            onClick={() => { setForm({ title: "", message: "", audience: "ALL" }); setDialogOpen(true); }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" /> Primeiro Comunicado
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => (
            <div key={b.id} className="glass-card rounded-xl border border-white/[0.08] overflow-hidden">
              <div className="flex gap-0">
                <div className="w-1 shrink-0 bg-gradient-to-b from-primary/60 to-primary/20 rounded-l-xl" />
                <div className="flex-1 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{b.title}</p>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(b.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        <span className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/[0.08] text-primary/80 border border-primary/[0.12]">
                          <Users className="w-2.5 h-2.5" />
                          {audienceLabel(b.audience)}
                        </span>
                        {b.sentCount > 0 && (
                          <span className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/[0.08] text-green-400/80 border border-green-500/[0.12]">
                            <Mail className="w-2.5 h-2.5" />
                            {b.sentCount} enviado{b.sentCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2.5 whitespace-pre-line line-clamp-3">{b.message}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Comunicado</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Assunto do comunicado" />
            </div>
            <div>
              <Label>Destinatários</Label>
              <Select value={form.audience} onValueChange={(v) => setForm((f) => ({ ...f, audience: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {countLoading ? (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1.5">
                  <Users className="w-3 h-3" /> Calculando...
                </span>
              ) : audienceCount !== null ? (
                <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] px-2 py-0.5 rounded-full bg-primary/[0.08] text-primary/80 border border-primary/[0.12]">
                  <Users className="w-2.5 h-2.5" />
                  {audienceCount} pessoa{audienceCount !== 1 ? "s" : ""} receberão
                </span>
              ) : null}
            </div>
            <div>
              <Label>Mensagem *</Label>
              <Textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} rows={5} placeholder="Conteúdo do comunicado..." />
            </div>
            {audienceCount !== null && audienceCount > 0 && (
              <p className="text-[11px] text-muted-foreground/70 -mt-2">
                Será enviado para o canal Telegram + e-mails cadastrados neste grupo.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground gap-2">
                <Send className="w-3.5 h-3.5" />
                {saving ? "Enviando..." : "Enviar Comunicado"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
