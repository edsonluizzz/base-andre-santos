"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Plus, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPE_LABEL: Record<string, string> = { REUNIAO: "Reunião", COMICIO: "Comício", PANFLETAGEM: "Panfletagem", TREINAMENTO: "Treinamento", VISITA: "Visita", OUTRO: "Outro" };

type Event = { id: string; title: string; type: string; date: string; location?: string; notes?: string; zoneId?: string; zone?: { id: string; name: string }; _count: { attendances: number } };
type Zone = { id: string; name: string };

export default function AgendaPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState({ title: "", type: "REUNIAO", date: "", time: "09:00", location: "", notes: "", zoneId: "" });
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const [er, zr] = await Promise.all([fetch("/api/events"), fetch("/api/zones")]);
    if (er.ok) setEvents(await er.json());
    if (zr.ok) setZones(await zr.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function openNew() {
    setEditing(null);
    const today = new Date();
    setForm({ title: "", type: "REUNIAO", date: today.toISOString().split("T")[0], time: "09:00", location: "", notes: "", zoneId: "" });
    setDialogOpen(true);
  }

  function openEdit(ev: Event) {
    setEditing(ev);
    const d = new Date(ev.date);
    setForm({ title: ev.title, type: ev.type, date: d.toISOString().split("T")[0], time: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`, location: ev.location ?? "", notes: ev.notes ?? "", zoneId: ev.zoneId ?? "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.date) { toast.error("Título e data obrigatórios"); return; }
    setSaving(true);
    const dateTime = new Date(`${form.date}T${form.time}:00`).toISOString();
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/events/${editing.id}` : "/api/events";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, type: form.type, date: dateTime, location: form.location || null, notes: form.notes || null, zoneId: form.zoneId || null }) });
    setSaving(false);
    if (res.ok) { setDialogOpen(false); fetchEvents(); toast.success(editing ? "Evento atualizado" : "Evento criado"); }
    else toast.error("Erro ao salvar");
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Excluir evento "${title}"?`)) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) { fetchEvents(); toast.success("Evento removido"); }
    else toast.error("Erro ao excluir");
  }

  const past = events.filter((e) => new Date(e.date) < new Date());
  const upcoming = events.filter((e) => new Date(e.date) >= new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-1">{upcoming.length} eventos futuros</p>
        </div>
        <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Novo Evento
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : events.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum evento agendado</p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Próximos</h2>
              <div className="space-y-3">
                {upcoming.map((ev) => <EventCard key={ev.id} ev={ev} onEdit={() => openEdit(ev)} onDelete={() => handleDelete(ev.id, ev.title)} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Passados</h2>
              <div className="space-y-3 opacity-60">
                {past.slice(-5).reverse().map((ev) => <EventCard key={ev.id} ev={ev} onEdit={() => openEdit(ev)} onDelete={() => handleDelete(ev.id, ev.title)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Evento" : "Novo Evento"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Reunião de líderes" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v ?? f.type }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Zona</Label>
                <Select value={form.zoneId} onValueChange={(v) => setForm((f) => ({ ...f, zoneId: v ?? f.zoneId }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Data *</Label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div><Label>Hora</Label><Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} /></div>
            </div>
            <div><Label>Local</Label><Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Endereço ou nome do local" /></div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({ ev, onEdit, onDelete }: { ev: Event; onEdit: () => void; onDelete: () => void }) {
  const d = new Date(ev.date);
  const TYPE_COLOR: Record<string, string> = { REUNIAO: "bg-blue-500/15 text-blue-400 border-blue-500/30", COMICIO: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", PANFLETAGEM: "bg-green-500/15 text-green-400 border-green-500/30", TREINAMENTO: "bg-purple-500/15 text-purple-400 border-purple-500/30", VISITA: "bg-orange-500/15 text-orange-400 border-orange-500/30", OUTRO: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
  const TYPE_LABEL: Record<string, string> = { REUNIAO: "Reunião", COMICIO: "Comício", PANFLETAGEM: "Panfletagem", TREINAMENTO: "Treinamento", VISITA: "Visita", OUTRO: "Outro" };
  return (
    <div className="glass-card rounded-xl p-4 border border-white/[0.08] hover:border-primary/20 transition-colors flex items-start gap-4">
      <div className="text-center min-w-[44px]">
        <p className="text-2xl font-bold text-primary leading-none">{d.getDate()}</p>
        <p className="text-[10px] uppercase text-muted-foreground">{format(d, "MMM", { locale: ptBR })}</p>
        <p className="text-[10px] text-muted-foreground">{format(d, "yyyy")}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">{ev.title}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TYPE_COLOR[ev.type]}`}>{TYPE_LABEL[ev.type]}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{format(d, "HH:mm")}</span>
          {ev.location && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{ev.location}</span>}
          {ev.zone && <span className="text-xs text-primary/70">{ev.zone.name}</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onEdit} className="h-7 text-xs">Editar</Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">Excluir</Button>
      </div>
    </div>
  );
}
