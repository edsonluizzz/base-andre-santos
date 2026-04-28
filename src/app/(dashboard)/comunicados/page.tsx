"use client";

import { useState, useEffect, useCallback } from "react";
import { Megaphone, Plus, Clock, Users } from "lucide-react";
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
    if (res.ok) { setDialogOpen(false); fetchBroadcasts(); toast.success("Comunicado registrado"); }
    else toast.error("Erro ao salvar");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comunicados</h1>
          <p className="text-sm text-muted-foreground mt-1">Registro de comunicações da base de apoio</p>
        </div>
        <Button
          onClick={() => { setForm({ title: "", message: "", audience: "ALL" }); setDialogOpen(true); }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Comunicado
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
                {saving ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
