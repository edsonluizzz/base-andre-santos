"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar, List, MapPin, Clock, RefreshCw, Plus,
  ChevronLeft, ChevronRight, X, Users, Tag, FileText,
  ExternalLink, ClipboardList, Search, QrCode, Copy, Check,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Event = {
  id: string; title: string; type: string; date: string;
  location?: string; notes?: string; zoneId?: string;
  zone?: { id: string; name: string };
  _count: { attendances: number };
  googleCalendarEventId?: string | null;
};
type Zone = { id: string; name: string };
type View = "calendar" | "list";

const TYPE_LABEL: Record<string, string> = {
  REUNIAO: "Reunião", CULTO: "Culto", PANFLETAGEM: "Panfletagem",
  TREINAMENTO: "Treinamento", VISITA: "Visita", OUTRO: "Outro",
};
const TYPE_COLOR: Record<string, string> = {
  REUNIAO:     "bg-blue-500/15 text-blue-400 border-blue-500/30",
  CULTO:       "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  PANFLETAGEM: "bg-green-500/15 text-green-400 border-green-500/30",
  TREINAMENTO: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  VISITA:      "bg-orange-500/15 text-orange-400 border-orange-500/30",
  OUTRO:       "bg-slate-500/15 text-slate-400 border-slate-500/30",
};
const TYPE_DOT: Record<string, string> = {
  REUNIAO: "bg-blue-400", CULTO: "bg-yellow-400", PANFLETAGEM: "bg-green-400",
  TREINAMENTO: "bg-purple-400", VISITA: "bg-orange-400", OUTRO: "bg-slate-400",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [events, setEvents]           = useState<Event[]>([]);
  const [zones, setZones]             = useState<Zone[]>([]);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState<View>("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [editOpen, setEditOpen]       = useState(false);
  const [editing, setEditing]         = useState<Event | null>(null);
  const [form, setForm]               = useState({ title: "", type: "REUNIAO", date: "", time: "09:00", location: "", notes: "", zoneId: "" });
  const [saving, setSaving]           = useState(false);
  const [syncing, setSyncing]         = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceEvent, setAttendanceEvent] = useState<Event | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrEvent, setQrEvent] = useState<Event | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const [er, zr] = await Promise.all([fetch("/api/events"), fetch("/api/zones")]);
    if (er.ok) setEvents(await er.json());
    if (zr.ok) setZones(await zr.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ─── Sync ────────────────────────────────────────────────────────────────

  async function handleSync() {
    setSyncing(true);
    const res = await fetch("/api/google-calendar/sync", { method: "POST" });
    setSyncing(false);
    if (res.ok) {
      const d = await res.json();
      toast.success(`Sync: ${d.pushed} enviados, ${d.pulled} importados`);
      fetchEvents();
    } else {
      const e = await res.json();
      toast.error(e.error ?? "Erro ao sincronizar");
    }
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  function openNew(day?: Date) {
    setEditing(null);
    const d = day ?? new Date();
    setForm({ title: "", type: "REUNIAO", date: d.toISOString().split("T")[0], time: "09:00", location: "", notes: "", zoneId: "" });
    setEditOpen(true);
  }

  function openEdit(ev: Event) {
    setEditing(ev);
    const d = new Date(ev.date);
    setForm({ title: ev.title, type: ev.type, date: d.toISOString().split("T")[0], time: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`, location: ev.location ?? "", notes: ev.notes ?? "", zoneId: ev.zoneId ?? "" });
    setDetailEvent(null);
    setEditOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.date) { toast.error("Título e data obrigatórios"); return; }
    setSaving(true);
    const dateTime = new Date(`${form.date}T${form.time}:00`).toISOString();
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/events/${editing.id}` : "/api/events";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, type: form.type, date: dateTime, location: form.location || null, notes: form.notes || null, zoneId: form.zoneId || null }) });
    setSaving(false);
    if (res.ok) { setEditOpen(false); fetchEvents(); toast.success(editing ? "Evento atualizado" : "Evento criado"); }
    else toast.error("Erro ao salvar");
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Excluir evento "${title}"?`)) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) { setDetailEvent(null); fetchEvents(); toast.success("Evento removido"); }
    else toast.error("Erro ao excluir");
  }

  // ─── Calendar helpers ────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end   = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    const days: Date[] = [];
    let cur = start;
    while (cur <= end) { days.push(cur); cur = addDays(cur, 1); }
    return days;
  }, [currentMonth]);

  function eventsForDay(day: Date) {
    return events.filter((e) => isSameDay(new Date(e.date), day));
  }

  const dayEvents = selectedDay ? eventsForDay(selectedDay) : [];
  const upcoming  = events.filter((e) => new Date(e.date) >= new Date());
  const past      = events.filter((e) => new Date(e.date) < new Date());

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{upcoming.length} eventos futuros</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle view */}
          <div className="flex items-center rounded-lg border border-border bg-secondary p-0.5">
            <button
              onClick={() => setView("calendar")}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all", view === "calendar" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <Calendar className="w-3.5 h-3.5" /> Calendário
            </button>
            <button
              onClick={() => setView("list")}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all", view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="w-3.5 h-3.5" /> Lista
            </button>
          </div>
          <Button variant="outline" size="sm" disabled={syncing} className="gap-1.5 text-xs hidden sm:flex" onClick={handleSync}>
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            {syncing ? "Sincronizando..." : "Google Calendar"}
          </Button>
          <Button onClick={() => openNew()} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-xs">
            <Plus className="w-4 h-4" /> Novo Evento
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : view === "calendar" ? (
        /* ─────────────── CALENDAR VIEW ─────────────────────────────────── */
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Grid */}
          <div className="flex-1 glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <h2 className="text-sm font-semibold text-foreground capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 border-b border-white/[0.08]">
              {(["D","S","T","Q","Q","S","S"] as const).map((short, i) => {
                const full = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][i];
                return (
                  <div key={i} className="py-2 text-center text-[10px] font-semibold uppercase text-muted-foreground/60 tracking-wider">
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{full}</span>
                  </div>
                );
              })}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dayEvs = eventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                const isTodayDay = isToday(day);
                const visible = dayEvs.slice(0, 3);
                const more = dayEvs.length - 3;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={cn(
                      "min-h-[56px] sm:min-h-[80px] p-1 sm:p-2 text-left border-b border-r border-white/[0.05] transition-all hover:bg-white/[0.03]",
                      !isCurrentMonth && "opacity-30",
                      isSelected && "bg-primary/[0.08] border-primary/20",
                      idx % 7 === 6 && "border-r-0",
                    )}
                  >
                    <span className={cn(
                      "inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-medium mb-0.5 sm:mb-1",
                      isTodayDay ? "bg-primary text-primary-foreground font-bold" : "text-foreground",
                    )}>
                      {format(day, "d")}
                    </span>
                    {/* Mobile: colored dots */}
                    {dayEvs.length > 0 && (
                      <div className="flex gap-0.5 flex-wrap sm:hidden">
                        {visible.map((ev) => (
                          <span key={ev.id} className={cn("w-2 h-2 rounded-full shrink-0", TYPE_DOT[ev.type])} />
                        ))}
                        {more > 0 && <span className="text-[8px] text-muted-foreground leading-none">+{more}</span>}
                      </div>
                    )}
                    {/* Desktop: text chips */}
                    <div className="hidden sm:block space-y-0.5">
                      {visible.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                          className={cn("truncate rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity border", TYPE_COLOR[ev.type])}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {more > 0 && (
                        <p className="text-[10px] text-muted-foreground pl-1">+{more} mais</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day panel */}
          {selectedDay && (
            <div className="w-full lg:w-72 glass-card rounded-2xl border border-white/[0.08] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                <div>
                  <p className="text-sm font-semibold text-foreground capitalize">
                    {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                  {isToday(selectedDay) && <p className="text-[10px] text-primary font-medium">Hoje</p>}
                </div>
                <button onClick={() => setSelectedDay(null)} className="rounded-lg p-1 hover:bg-secondary transition-colors">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {dayEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhum evento neste dia</p>
                    <button onClick={() => openNew(selectedDay)} className="mt-3 text-xs text-primary hover:underline">
                      + Criar evento
                    </button>
                  </div>
                ) : (
                  dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => setDetailEvent(ev)}
                      className="w-full text-left rounded-xl border border-white/[0.08] p-3 hover:border-primary/20 hover:bg-white/[0.02] transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", TYPE_DOT[ev.type])} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{ev.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(ev.date), "HH:mm")}
                            {ev.location && ` · ${ev.location}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="px-3 pb-3">
                <Button size="sm" onClick={() => openNew(selectedDay)} className="w-full text-xs gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                  <Plus className="w-3.5 h-3.5" /> Novo evento neste dia
                </Button>
              </div>
            </div>
          )}
        </div>

      ) : (
        /* ─────────────── LIST VIEW ──────────────────────────────────────── */
        <div className="space-y-8">
          {events.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum evento agendado</p>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Próximos</h2>
                  <div className="space-y-2">
                    {upcoming.map((ev) => (
                      <EventListCard key={ev.id} ev={ev} onClick={() => setDetailEvent(ev)} />
                    ))}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Passados</h2>
                  <div className="space-y-2 opacity-60">
                    {past.slice(-5).reverse().map((ev) => (
                      <EventListCard key={ev.id} ev={ev} onClick={() => setDetailEvent(ev)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Detail modal ──────────────────────────────────────────────────── */}
      <Dialog open={!!detailEvent} onOpenChange={(o) => !o && setDetailEvent(null)}>
        <DialogContent className="max-w-sm">
          {detailEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3 pr-6">
                  <div className={cn("mt-0.5 h-3 w-3 shrink-0 rounded-full", TYPE_DOT[detailEvent.type])} />
                  <DialogTitle className="text-base leading-snug">{detailEvent.title}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="capitalize">
                    {format(new Date(detailEvent.date), "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {detailEvent.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{detailEvent.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="w-4 h-4 shrink-0" />
                  <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs border", TYPE_COLOR[detailEvent.type])}>
                    {TYPE_LABEL[detailEvent.type]}
                  </span>
                  {detailEvent.zone && <span className="text-xs text-primary/70">{detailEvent.zone.name}</span>}
                </div>
                {detailEvent._count.attendances > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>{detailEvent._count.attendances} presença{detailEvent._count.attendances !== 1 ? "s" : ""} registrada{detailEvent._count.attendances !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {detailEvent.notes && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{detailEvent.notes}</p>
                  </div>
                )}
                {detailEvent.googleCalendarEventId && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>Sincronizado com Google Calendar</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-white/[0.08]">
                <div className="flex gap-1.5 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setAttendanceEvent(detailEvent); setAttendanceOpen(true); setDetailEvent(null); }}
                    className="text-xs gap-1.5"
                  >
                    <ClipboardList className="w-3.5 h-3.5" /> Presenças
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setQrEvent(detailEvent); setQrOpen(true); setDetailEvent(null); }}
                    className="text-xs gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" /> QR Code
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(detailEvent.id, detailEvent.title)} className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                    Excluir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(detailEvent)} className="text-xs">
                    Editar
                  </Button>
                  <Button size="sm" onClick={() => setDetailEvent(null)} className="text-xs bg-primary text-primary-foreground">
                    Fechar
                  </Button>
                </div>
              </div>

            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── QR Code modal ────────────────────────────────────────────────── */}
      {qrEvent && (
        <QrCodeDialog
          event={qrEvent}
          open={qrOpen}
          onClose={() => { setQrOpen(false); setQrEvent(null); }}
        />
      )}

      {/* ─── Attendance modal ─────────────────────────────────────────────── */}
      {attendanceEvent && (
        <AttendanceDialog
          event={attendanceEvent}
          open={attendanceOpen}
          onClose={() => { setAttendanceOpen(false); setAttendanceEvent(null); }}
          onSaved={fetchEvents}
        />
      )}

      {/* ─── Edit / New modal ──────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
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
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── QR Code Dialog ───────────────────────────────────────────────────────────

function QrCodeDialog({ event, open, onClose }: { event: Event; open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const cadastroUrl = typeof window !== "undefined"
    ? `${window.location.origin}/cadastro?source=EVENTO&event_id=${event.id}`
    : "";

  const qrImageUrl = cadastroUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&format=png&qzone=1&data=${encodeURIComponent(cadastroUrl)}`
    : "";

  function copyLink() {
    navigator.clipboard.writeText(cadastroUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" /> QR Code do Evento
          </DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{event.title}</p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* QR Code image */}
          {qrImageUrl && (
            <div className="rounded-2xl border border-white/[0.10] overflow-hidden bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt="QR Code de cadastro"
                width={240}
                height={240}
                className="block"
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Apresente este QR Code no evento para que apoiadores se cadastrem diretamente pelo celular.
          </p>

          {/* Link com botão copiar */}
          <div className="w-full flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
            <p className="text-[10px] font-mono text-muted-foreground truncate flex-1">
              /cadastro?source=EVENTO&event_id={event.id.slice(0, 12)}…
            </p>
            <button
              onClick={copyLink}
              className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
              title="Copiar link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={onClose} className="text-xs bg-primary text-primary-foreground">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Attendance Dialog ────────────────────────────────────────────────────────

type AttendanceStatus = "PRESENT" | "ABSENT" | "JUSTIFIED";

type AttendanceEntry = {
  collaboratorId: string;
  status: AttendanceStatus;
  collaborator: { id: string; name: string; city?: string | null; campaignRole: string };
};

type CollabResult = { id: string; name: string; city?: string | null; campaignRole: string };

const STATUS_LABEL: Record<AttendanceStatus, string> = { PRESENT: "✓", ABSENT: "✗", JUSTIFIED: "J" };
const STATUS_COLOR: Record<AttendanceStatus, string> = {
  PRESENT:   "bg-green-500/20 text-green-400 border-green-500/30",
  ABSENT:    "bg-red-500/20 text-red-400 border-red-500/30",
  JUSTIFIED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

function AttendanceDialog({
  event, open, onClose, onSaved,
}: { event: Event; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [entries, setEntries]         = useState<AttendanceEntry[]>([]);
  const [search, setSearch]           = useState("");
  const [results, setResults]         = useState<CollabResult[]>([]);
  const [searching, setSearching]     = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    if (!open) { setEntries([]); setSearch(""); setResults([]); return; }
    setLoadingData(true);
    fetch(`/api/events/${event.id}/attendance`)
      .then((r) => r.json())
      .then((data: { collaboratorId: string; status: AttendanceStatus; collaborator: CollabResult }[]) => {
        setEntries(
          data
            .filter((a) => a.collaborator)
            .map((a) => ({ collaboratorId: a.collaboratorId, status: a.status, collaborator: a.collaborator })),
        );
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [open, event.id]);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/collaborators?q=${encodeURIComponent(search)}&status=ALL`);
        if (r.ok) {
          const data: CollabResult[] = await r.json();
          const existing = new Set(entries.map((e) => e.collaboratorId));
          setResults(data.filter((c) => !existing.has(c.id)).slice(0, 8));
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, entries]);

  function addCollab(c: CollabResult) {
    setEntries((prev) => [...prev, { collaboratorId: c.id, status: "PRESENT", collaborator: c }]);
    setSearch("");
    setResults([]);
  }

  function setStatus(collaboratorId: string, status: AttendanceStatus) {
    setEntries((prev) => prev.map((e) => e.collaboratorId === collaboratorId ? { ...e, status } : e));
  }

  function removeEntry(collaboratorId: string) {
    setEntries((prev) => prev.filter((e) => e.collaboratorId !== collaboratorId));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/events/${event.id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendances: entries.map((e) => ({ collaboratorId: e.collaboratorId, status: e.status })) }),
    });
    setSaving(false);
    if (res.ok) {
      const presentCount = entries.filter((e) => e.status === "PRESENT").length;
      toast.success(`${presentCount} presença${presentCount !== 1 ? "s" : ""} registrada${presentCount !== 1 ? "s" : ""}`);
      onSaved();
      onClose();
    } else {
      toast.error("Erro ao salvar presenças");
    }
  }

  const presentCount = entries.filter((e) => e.status === "PRESENT").length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" /> Presenças — {event.title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground capitalize">
            {format(new Date(event.date), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar colaborador por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
          {(searching || results.length > 0 || (search.length >= 2 && !searching)) && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg max-h-44 overflow-y-auto">
              {searching && <p className="p-3 text-xs text-muted-foreground text-center">Buscando...</p>}
              {!searching && results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => addCollab(c)}
                  className="w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors border-b border-border last:border-0"
                >
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  {c.city && <span className="ml-2 text-xs text-muted-foreground">{c.city}</span>}
                </button>
              ))}
              {!searching && results.length === 0 && search.length >= 2 && (
                <p className="p-3 text-xs text-muted-foreground text-center">Nenhum resultado</p>
              )}
            </div>
          )}
        </div>

        {/* List */}
        <div className="max-h-[50vh] overflow-y-auto space-y-1.5 pr-0.5">
          {loadingData && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loadingData && entries.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Nenhum colaborador registrado.</p>
              <p className="text-xs text-muted-foreground">Use a busca acima para adicionar.</p>
            </div>
          )}
          {entries.map((e) => (
            <div key={e.collaboratorId} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{e.collaborator.name}</p>
                {e.collaborator.city && <p className="text-[10px] text-muted-foreground">{e.collaborator.city}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                {(["PRESENT", "ABSENT", "JUSTIFIED"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(e.collaboratorId, s)}
                    className={cn(
                      "w-7 h-7 rounded text-xs font-bold border transition-all",
                      e.status === s ? STATUS_COLOR[s] : "bg-secondary text-muted-foreground border-transparent hover:border-border",
                    )}
                    title={s === "PRESENT" ? "Presente" : s === "ABSENT" ? "Ausente" : "Justificado"}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              <button onClick={() => removeEntry(e.collaboratorId)} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
          <p className="text-xs text-muted-foreground">
            <span className="text-green-400 font-semibold">{presentCount}</span> presente{presentCount !== 1 ? "s" : ""}{" "}
            de {entries.length} registrado{entries.length !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || loadingData} className="text-xs bg-primary text-primary-foreground">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── List card ────────────────────────────────────────────────────────────────

function EventListCard({ ev, onClick }: { ev: Event; onClick: () => void }) {
  const d = new Date(ev.date);
  return (
    <button
      onClick={onClick}
      className="w-full text-left glass-card rounded-xl p-4 border border-white/[0.08] hover:border-primary/20 hover:bg-white/[0.02] transition-all flex items-start gap-4"
    >
      <div className="text-center min-w-[44px]">
        <p className="text-2xl font-bold text-primary leading-none">{d.getDate()}</p>
        <p className="text-[10px] uppercase text-muted-foreground">{format(d, "MMM", { locale: ptBR })}</p>
        <p className="text-[10px] text-muted-foreground">{format(d, "yyyy")}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground text-sm">{ev.title}</span>
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", TYPE_COLOR[ev.type])}>{TYPE_LABEL[ev.type]}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{format(d, "HH:mm")}</span>
          {ev.location && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{ev.location}</span>}
          {ev.zone && <span className="text-xs text-primary/70">{ev.zone.name}</span>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
    </button>
  );
}
