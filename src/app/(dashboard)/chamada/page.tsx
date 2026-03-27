"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, CalendarDays, ChevronRight, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type EventType = "CULTO" | "ENSAIO" | "REUNIAO" | "RETIRO" | "OUTRO";
type AttendanceStatus = "PRESENT" | "ABSENT" | "JUSTIFIED";

type Member = { id: string; name: string };
type Event = {
  id: string;
  title: string;
  type: EventType;
  date: string;
  location: string | null;
  _count: { attendances: number; offerings: number };
};
type Attendance = { memberId: string; status: AttendanceStatus };

const EVENT_LABELS: Record<EventType, string> = {
  CULTO: "Culto",
  ENSAIO: "Ensaio",
  REUNIAO: "Reunião",
  RETIRO: "Retiro",
  OUTRO: "Outro",
};

const STATUS_CONFIG = {
  PRESENT: { label: "Presente", color: "text-[#2ecc71] bg-[#2ecc7122] border-[#2ecc7133]", icon: Check },
  ABSENT: { label: "Ausente", color: "text-[#e74c3c] bg-[#e74c3c22] border-[#e74c3c33]", icon: X },
  JUSTIFIED: { label: "Justificado", color: "text-[#c9a84c] bg-[#c9a84c22] border-[#c9a84c33]", icon: Clock },
};

export default function ChamadaPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [attendances, setAttendances] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/events");
    setEvents(await res.json());
  }, []);

  useEffect(() => {
    fetchEvents();
    fetch("/api/members").then((r) => r.json()).then((data) =>
      setMembers(data.filter((m: any) => m.status === "ACTIVE"))
    );
  }, [fetchEvents]);

  async function openEvent(ev: Event) {
    setActiveEvent(ev);
    const res = await fetch(`/api/events/${ev.id}`);
    const data = await res.json();
    const map: Record<string, AttendanceStatus> = {};
    // Initialize all active members as ABSENT
    members.forEach((m) => (map[m.id] = "ABSENT"));
    data.attendances.forEach((a: any) => (map[a.memberId] = a.status));
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

  const present = Object.values(attendances).filter((s) => s === "PRESENT").length;
  const total = members.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl lg:text-3xl font-bold text-[#e8c97a]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Chamada
          </h1>
          <p className="text-[#888] text-sm mt-1">Controle de presença por evento</p>
        </div>
        <Button
          onClick={() => setNewEventOpen(true)}
          className="bg-[#c9a84c] hover:bg-[#e8c97a] text-black font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {/* Events list */}
      {!activeEvent && (
        <div className="space-y-3">
          {events.length === 0 && (
            <p className="text-center text-[#888] py-16">Nenhum evento cadastrado</p>
          )}
          {events.map((ev) => (
            <div
              key={ev.id}
              onClick={() => openEvent(ev)}
              className="bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#7a6330] rounded-xl p-4 cursor-pointer flex items-center gap-4 group transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#c9a84c22] border border-[#c9a84c33] flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-[#c9a84c]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#f0ece4]">{ev.title}</p>
                  <span className="text-[10px] bg-[#2a2a2a] text-[#888] px-2 py-0.5 rounded-full">
                    {EVENT_LABELS[ev.type]}
                  </span>
                </div>
                <p className="text-sm text-[#888] mt-0.5">
                  {format(new Date(ev.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {ev.location && ` · ${ev.location}`}
                </p>
              </div>
              <div className="text-right">
                {ev._count.attendances > 0 && (
                  <p className="text-xs text-[#c9a84c] font-medium">
                    {ev._count.attendances} registros
                  </p>
                )}
                <ChevronRight className="w-4 h-4 text-[#888] group-hover:text-[#c9a84c] transition-colors ml-auto mt-1" />
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
              className="text-[#888] hover:text-[#f0ece4] text-sm transition-colors"
            >
              ← Voltar
            </button>
            <div className="flex-1">
              <p className="font-semibold text-[#f0ece4]">{activeEvent.title}</p>
              <p className="text-xs text-[#888]">
                {format(new Date(activeEvent.date), "dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-[#2ecc71]">
                {present}/{total}
              </p>
              <p className="text-xs text-[#888]">presentes</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-3 mb-4 flex-wrap">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs text-[#888]">
                <div className={`w-2 h-2 rounded-full ${k === "PRESENT" ? "bg-[#2ecc71]" : k === "ABSENT" ? "bg-[#e74c3c]" : "bg-[#c9a84c]"}`} />
                {v.label}
              </div>
            ))}
            <p className="text-xs text-[#888] ml-auto">Toque para alternar status</p>
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
                  className="flex items-center gap-3 p-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl cursor-pointer hover:border-[#7a6330] transition-colors select-none"
                >
                  <div className="w-9 h-9 rounded-full bg-[#7a6330] flex items-center justify-center text-[#e8c97a] text-xs font-bold flex-shrink-0"
                    style={{ fontFamily: "var(--font-heading)" }}>
                    {inits}
                  </div>
                  <p className="flex-1 text-sm font-medium text-[#f0ece4]">{m.name}</p>
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
            className="w-full bg-[#c9a84c] hover:bg-[#e8c97a] text-black font-semibold"
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
      <DialogContent className="bg-[#1e1e1e] border-[#2a2a2a] text-[#f0ece4] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#e8c97a]" style={{ fontFamily: "var(--font-heading)" }}>
            Novo Evento
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-[#888] text-xs">Título *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder="Ex: Ensaio de louvor" required
              className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4] focus-visible:ring-[#7a6330]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[#888] text-xs">Tipo *</Label>
              <Select value={form.type} onValueChange={(v: string | null) => v && set("type", v)}>
                <SelectTrigger className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e1e] border-[#2a2a2a]">
                  {Object.entries(EVENT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#888] text-xs">Data e hora *</Label>
              <Input type="datetime-local" value={form.date} onChange={(e) => set("date", e.target.value)}
                className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4] focus-visible:ring-[#7a6330]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#888] text-xs">Local</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)}
              placeholder="Ex: Igreja IEADC Porto Belo"
              className="bg-[#0d0d0d] border-[#2a2a2a] text-[#f0ece4] focus-visible:ring-[#7a6330]" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-[#2a2a2a] text-[#888] hover:bg-[#2a2a2a]">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}
              className="flex-1 bg-[#c9a84c] hover:bg-[#e8c97a] text-black font-semibold">
              {loading ? "Criando..." : "Criar Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
