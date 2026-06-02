"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Megaphone, Plus, Clock, Users, Mail, Send, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comunicados</h1>
          <p className="text-sm text-muted-foreground mt-1">Registro de comunicações da base de apoio</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/comunicados/disparar">
              <MessageCircle className="w-4 h-4" /> Disparar WhatsApp
            </Link>
          </Button>
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
            <div key={i} className="glass-card rounded-xl p-5 border border-white/[0.08] animate-pulse">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/[0.07] rounded w-2/5" />
                  <div className="flex gap-3">
                    <div className="h-3 bg-white/[0.04] rounded w-28" />
                    <div className="h-3 bg-white/[0.04] rounded w-20" />
                  </div>
                  <div className="h-3 bg-white/[0.04] rounded w-full" />
                  <div className="h-3 bg-white/[0.04] rounded w-3/4" />
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <div className="h-8 w-8 bg-white/[0.05] rounded-md" />
                  <div className="h-8 w-8 bg-white/[0.05] rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum comunicado registrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => (
            <div key={b.id} className="glass-card rounded-xl p-5 border border-white/[0.08]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{b.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(b.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <span className="text-xs flex items-center gap-1 text-primary/70">
                      <Users className="w-3 h-3" />
                      {audienceLabel(b.audience)}
                    </span>
                    {b.sentCount > 0 && (
                      <span className="text-xs flex items-center gap-1 text-green-400/80">
                        <Mail className="w-3 h-3" />
                        {b.sentCount} e-mail{b.sentCount !== 1 ? "s" : ""} enviado{b.sentCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line">{b.message}</p>
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
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {countLoading ? "Calculando..." : audienceCount !== null ? `${audienceCount} pessoa${audienceCount !== 1 ? "s" : ""} neste grupo` : ""}
              </p>
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
