"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, CalendarDays, ChevronRight, Check, X, Clock, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

type EventType = "CULTO" | "ENSAIO" | "REUNIAO" | "RETIRO" | "OUTRO";
type AttendanceStatus = "PRESENT" | "ABSENT" | "JUSTIFIED";

type Member = { id: string; name: string; status: string };
type Event = {
  id: string;
  title: string;
  type: EventType;
  date: string;
  location: string | null;
  _count: { attendances: number; offerings: number };
};
type AttendanceRecord = { memberId: string; status: AttendanceStatus };

type InsightRecord = {
  memberId: string;
  name: string;
  absencesInLast5: number;
  totalPrev: number;
};

const EVENT_LABELS: Record<EventType, string> = {
  CULTO: "Culto",
  ENSAIO: "Ensaio",
  REUNIAO: "Reunião",
  RETIRO: "Retiro",
  OUTRO: "Outro",
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Presente",
  ABSENT: "Ausente",
  JUSTIFIED: "Justificado",
};

const STATUS_CONFIG = {
  PRESENT:   { label: "Presente",    color: "text-success bg-success/10 border-success/20",         icon: Check },
  ABSENT:    { label: "Ausente",     color: "text-destructive bg-destructive/10 border-destructive/20", icon: X },
  JUSTIFIED: { label: "Justificado", color: "text-gold bg-gold/10 border-gold/20",                  icon: Clock },
};

function safeFormat(dateStr: string, fmt: string): string {
  try {
    const d = new Date(dateStr);
    if (!isValid(d)) return dateStr.slice(0, 10);
    return format(d, fmt, { locale: ptBR });
  } catch {
    return dateStr.slice(0, 10);
  }
}

export default function ChamadaPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [attendances, setAttendances] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [printInsights, setPrintInsights] = useState<InsightRecord[]>([]);
  const [printLoading, setPrintLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/events");
    setEvents(await res.json());
  }, []);

  useEffect(() => {
    fetchEvents();
    fetch("/api/members").then((r) => r.json()).then((data) =>
      setMembers((data as Member[]).filter((m) => m.status === "ACTIVE"))
    );
  }, [fetchEvents]);

  async function openEvent(ev: Event) {
    setActiveEvent(ev);
    setPrintInsights([]);
    const res = await fetch(`/api/events/${ev.id}`);
    const data = await res.json();
    const map: Record<string, AttendanceStatus> = {};
    members.forEach((m) => (map[m.id] = "ABSENT"));
    (data.attendances as AttendanceRecord[]).forEach((a) => (map[a.memberId] = a.status));
    setAttendances(map);
  }

  function cycleStatus(memberId: string) {
    const order: AttendanceStatus[] = ["ABSENT", "PRESENT", "JUSTIFIED"];
    const current = attendances[memberId] ?? "ABSENT";
    const next = order[(order.indexOf(current) + 1) % order.length];
    setAttendances((prev) => ({ ...prev, [memberId]: next }));
  }

  async function saveAttendances() {
    if (!activeEvent) return;
    setSaving(true);
    const list = Object.entries(attendances).map(([memberId, status]) => ({
      memberId,
      status,
    }));
    const res = await fetch("/api/attendances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: activeEvent.id, attendances: list }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Chamada salva!");
      fetchEvents();
    } else {
      toast.error("Erro ao salvar");
    }
  }

  async function handleExportPDF() {
    if (!activeEvent) return;
    setPrintLoading(true);
    try {
      const res = await fetch(`/api/events/${activeEvent.id}?insights=true`);
      const data = await res.json();
      setPrintInsights(Array.isArray(data.insights) ? data.insights : []);
    } catch {
      setPrintInsights([]);
    }
    setPrintLoading(false);
    setTimeout(() => window.print(), 100);
  }

  const present = Object.values(attendances).filter((s) => s === "PRESENT").length;
  const total = members.length;
  const presenceRate = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <>
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          nav, aside, header { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          table { border-collapse: collapse !important; width: 100% !important; }
          table, th, td { border: 1px solid #ccc !important; }
          th { background: #f5f5f5 !important; color: #333 !important; font-size: 11px !important; }
          td { color: #111 !important; background: white !important; font-size: 12px !important; }
          .print-show { display: block !important; }
        }
        .print-show { display: none; }
      ` }} />

      {/* Print-only view */}
      {activeEvent && (
        <div className="print-show">
          <div style={{ fontFamily: "sans-serif", padding: "20px", color: "black" }}>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "4px" }}>
              Lista de Presença — {activeEvent.title}
            </h1>
            <p style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>
              {safeFormat(activeEvent.date, "dd 'de' MMMM 'de' yyyy")}
              {activeEvent.location ? ` · ${activeEvent.location}` : ""}
              {" · "}{EVENT_LABELS[activeEvent.type]}
            </p>
            <p style={{ fontSize: "13px", marginBottom: "16px" }}>
              Presentes: <strong>{present}/{total}</strong> ({presenceRate}%)
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={{ border: "1px solid #ccc", padding: "6px 10px", textAlign: "left" }}>#</th>
                  <th style={{ border: "1px solid #ccc", padding: "6px 10px", textAlign: "left" }}>Nome</th>
                  <th style={{ border: "1px solid #ccc", padding: "6px 10px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => {
                  const status = attendances[m.id] ?? "ABSENT";
                  return (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? "#fafafa" : "white" }}>
                      <td style={{ border: "1px solid #ccc", padding: "5px 10px", color: "#888" }}>{i + 1}</td>
                      <td style={{ border: "1px solid #ccc", padding: "5px 10px" }}>{m.name}</td>
                      <td style={{ border: "1px solid #ccc", padding: "5px 10px", textAlign: "center" }}>
                        {STATUS_LABELS[status]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {printInsights.length > 0 && (
              <div style={{ borderTop: "2px solid #e74c3c", paddingTop: "16px" }}>
                <h2 style={{ fontSize: "14px", fontWeight: "bold", color: "#c0392b", marginBottom: "8px" }}>
                  ⚠️ Insights — Faltantes Recorrentes
                </h2>
                <p style={{ fontSize: "12px", color: "#555", marginBottom: "8px" }}>
                  Membros ausentes neste evento que também faltaram em eventos anteriores:
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#fff5f5" }}>
                      <th style={{ border: "1px solid #fcc", padding: "6px 10px", textAlign: "left" }}>Membro</th>
                      <th style={{ border: "1px solid #fcc", padding: "6px 10px", textAlign: "center" }}>Ausências (últimos {printInsights[0]?.totalPrev ?? 5} eventos)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printInsights.map((ins) => (
                      <tr key={ins.memberId}>
                        <td style={{ border: "1px solid #fcc", padding: "5px 10px" }}>{ins.name}</td>
                        <td style={{ border: "1px solid #fcc", padding: "5px 10px", textAlign: "center", color: "#c0392b", fontWeight: "bold" }}>
                          {ins.absencesInLast5}/{ins.totalPrev}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p style={{ fontSize: "11px", color: "#999", marginTop: "24px", textAlign: "right" }}>
              Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      )}

      <div className="no-print">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-2xl lg:text-3xl font-bold text-gold-light"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Chamada
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Controle de presença por evento</p>
          </div>
          <Button
            onClick={() => setNewEventOpen(true)}
            className="bg-gold hover:bg-gold-light text-black font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>

        {/* Events list */}
        {!activeEvent && (
          <div className="space-y-3">
            {events.length === 0 && (
              <p className="text-center text-muted-foreground py-16">Nenhum evento cadastrado</p>
            )}
            {events.map((ev) => (
              <div
                key={ev.id}
                onClick={() => openEvent(ev)}
                className="bg-card border border-border hover:border-gold-muted rounded-xl p-4 cursor-pointer flex items-center gap-4 group transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-gold" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{ev.title}</p>
                    <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                      {EVENT_LABELS[ev.type]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {safeFormat(ev.date, "dd 'de' MMMM 'de' yyyy")}
                    {ev.location && ` · ${ev.location}`}
                  </p>
                </div>
                <div className="text-right">
                  {ev._count.attendances > 0 && (
                    <p className="text-xs text-gold font-medium">
                      {ev._count.attendances} registros
                    </p>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors ml-auto mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active event attendance */}
        {activeEvent && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setActiveEvent(null)}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                ← Voltar
              </button>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{activeEvent.title}</p>
                <p className="text-xs text-muted-foreground">
                  {safeFormat(activeEvent.date, "dd 'de' MMMM")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-bold text-success">
                    {present}/{total}
                  </p>
                  <p className="text-xs text-muted-foreground">presentes</p>
                </div>
                <button
                  onClick={handleExportPDF}
                  disabled={printLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-gold-muted text-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {printLoading ? "..." : "PDF"}
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-3 mb-4 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className={`w-2 h-2 rounded-full ${k === "PRESENT" ? "bg-success" : k === "ABSENT" ? "bg-destructive" : "bg-gold"}`} />
                  {v.label}
                </div>
              ))}
              <p className="text-xs text-muted-foreground ml-auto">Toque para alternar status</p>
            </div>

            <div className="space-y-2 mb-6">
              {members.map((m) => {
                const status = attendances[m.id] ?? "ABSENT";
                const cfg = STATUS_CONFIG[status];
                const Icon = cfg.icon;
                const inits = m.name
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={m.id}
                    onClick={() => cycleStatus(m.id)}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl cursor-pointer hover:border-gold-muted transition-colors select-none"
                  >
                    <div className="w-9 h-9 rounded-full bg-gold-muted flex items-center justify-center text-gold-light text-xs font-bold flex-shrink-0"
                      style={{ fontFamily: "var(--font-heading)" }}>
                      {inits}
                    </div>
                    <p className="flex-1 text-sm font-medium text-foreground">{m.name}</p>
                    <span
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${cfg.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={saveAttendances}
              disabled={saving}
              className="w-full bg-gold hover:bg-gold-light text-black font-semibold"
            >
              {saving ? "Salvando..." : "Salvar Chamada"}
            </Button>
          </div>
        )}

        <NewEventDialog
          open={newEventOpen}
          onOpenChange={setNewEventOpen}
          onSuccess={() => { fetchEvents(); setNewEventOpen(false); }}
        />
      </div>
    </>
  );
}

function NewEventDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    type: "ENSAIO",
    date: new Date().toISOString().slice(0, 16),
    location: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Evento criado!");
      setForm({ title: "", type: "ENSAIO", date: new Date().toISOString().slice(0, 16), location: "", notes: "" });
      onSuccess();
    } else {
      toast.error("Erro ao criar evento");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gold-light" style={{ fontFamily: "var(--font-heading)" }}>
            Novo Evento
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Título *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder="Ex: Ensaio de louvor" required
              className="bg-background border-border text-foreground focus-visible:ring-gold-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Tipo *</Label>
              <Select value={form.type} onValueChange={(v: string | null) => v && set("type", v)}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {Object.entries(EVENT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Data e hora *</Label>
              <Input type="datetime-local" value={form.date} onChange={(e) => set("date", e.target.value)}
                className="bg-background border-border text-foreground focus-visible:ring-gold-muted" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Local</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)}
              placeholder="Ex: Igreja IEADC Porto Belo"
              className="bg-background border-border text-foreground focus-visible:ring-gold-muted" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-border text-muted-foreground hover:bg-secondary">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}
              className="flex-1 bg-gold hover:bg-gold-light text-black font-semibold">
              {loading ? "Criando..." : "Criar Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
