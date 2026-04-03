"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Users, CalendarDays, DollarSign, Plus, Trash2, ChevronLeft,
  Check, X, Clock, Phone, Crown,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type Ministry = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
};

type MinistryMemberRecord = {
  id: string;
  memberId: string;
  role: "COORDINATOR" | "MEMBER";
  member: { id: string; name: string; phone: string | null; status: string };
};

type AllMember = { id: string; name: string; status: string };

type EventType = "CULTO" | "ENSAIO" | "REUNIAO" | "RETIRO" | "OUTRO";
type AttendanceStatus = "PRESENT" | "ABSENT" | "JUSTIFIED";

type MinEvent = {
  id: string;
  title: string;
  type: EventType;
  date: string;
  location: string | null;
  _count: { attendances: number };
};

type Offering = { id: string; amount: number; date: string; method: string; member: { name: string } };
type Expense = { id: string; description: string; amount: number; date: string; category: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<EventType, string> = {
  CULTO: "Culto", ENSAIO: "Ensaio", REUNIAO: "Reunião", RETIRO: "Retiro", OUTRO: "Outro",
};

const STATUS_CONFIG = {
  PRESENT:   { label: "Presente",    color: "text-success bg-success/10 border-success/20",             icon: Check },
  ABSENT:    { label: "Ausente",     color: "text-destructive bg-destructive/10 border-destructive/20", icon: X },
  JUSTIFIED: { label: "Justificado", color: "text-amber-400 bg-amber-500/10 border-amber-500/20",       icon: Clock },
};

function fmt(dateStr: string, f: string) {
  try {
    const d = new Date(dateStr);
    return isValid(d) ? format(d, f, { locale: ptBR }) : dateStr.slice(0, 10);
  } catch { return dateStr.slice(0, 10); }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MinistryDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: session } = useSession();
  const isLeaderOrAdmin = ["ADMIN", "LEADER"].includes(session?.user?.role ?? "");

  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [tab, setTab] = useState<"members" | "chamada" | "financeiro">("members");

  useEffect(() => {
    fetch(`/api/ministries/${id}`)
      .then((r) => r.json())
      .then((d) => setMinistry(d))
      .catch(() => {});
  }, [id]);

  if (!ministry) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const color = ministry.color ?? "#6366f1";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/ministerios" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" />
          Ministérios
        </Link>
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/10"
            style={{ backgroundColor: `${color}20` }}
          >
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{ministry.name}</h1>
            {ministry.description && (
              <p className="text-muted-foreground text-sm mt-0.5">{ministry.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl mb-6 w-fit">
        {(["members", "chamada", "financeiro"] as const).map((t) => {
          const icons = { members: Users, chamada: CalendarDays, financeiro: DollarSign };
          const labels = { members: "Membros", chamada: "Chamada", financeiro: "Financeiro" };
          const Icon = icons[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                tab === t
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {labels[t]}
            </button>
          );
        })}
      </div>

      {tab === "members" && (
        <MembersTab ministryId={id} isLeaderOrAdmin={isLeaderOrAdmin} color={color} />
      )}
      {tab === "chamada" && (
        <ChamadaTab ministryId={id} isLeaderOrAdmin={isLeaderOrAdmin} />
      )}
      {tab === "financeiro" && (
        <FinanceiroTab ministryId={id} isLeaderOrAdmin={isLeaderOrAdmin} />
      )}
    </div>
  );
}

// ─── Tab: Membros ─────────────────────────────────────────────────────────────

function MembersTab({ ministryId, isLeaderOrAdmin, color }: { ministryId: string; isLeaderOrAdmin: boolean; color: string }) {
  const [members, setMembers] = useState<MinistryMemberRecord[]>([]);
  const [allMembers, setAllMembers] = useState<AllMember[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"MEMBER" | "COORDINATOR">("MEMBER");
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    const res = await fetch(`/api/ministries/${ministryId}/members`);
    if (res.ok) setMembers(await res.json());
  }, [ministryId]);

  useEffect(() => {
    fetchMembers();
    fetch("/api/members")
      .then((r) => r.json())
      .then((d: AllMember[]) => setAllMembers(d.filter((m) => m.status === "ACTIVE")));
  }, [fetchMembers]);

  const memberIds = new Set(members.map((m) => m.memberId));
  const available = allMembers.filter((m) => !memberIds.has(m.id));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/ministries/${ministryId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: selectedMemberId, role: selectedRole }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Membro adicionado!");
      fetchMembers();
      setAddOpen(false);
      setSelectedMemberId("");
      setSelectedRole("MEMBER");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Erro ao adicionar");
    }
  }

  async function handleRemove(memberId: string, name: string) {
    if (!window.confirm(`Remover ${name} deste ministério?`)) return;
    const res = await fetch(`/api/ministries/${ministryId}/members/${memberId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Membro removido"); fetchMembers(); }
    else toast.error("Erro ao remover");
  }

  async function toggleRole(memberId: string, currentRole: "COORDINATOR" | "MEMBER") {
    const newRole = currentRole === "COORDINATOR" ? "MEMBER" : "COORDINATOR";
    const res = await fetch(`/api/ministries/${ministryId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) { fetchMembers(); }
    else toast.error("Erro ao alterar cargo");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{members.length} membro{members.length !== 1 ? "s" : ""}</p>
        {isLeaderOrAdmin && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Adicionar
          </Button>
        )}
      </div>

      {members.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum membro neste ministério</p>
        </div>
      )}

      <div className="space-y-2">
        {members.map((mm) => {
          const initials = mm.member.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
          return (
            <div key={mm.id} className="glass-card p-3 flex items-center gap-3 group">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border"
                style={{ backgroundColor: `${color}20`, borderColor: `${color}40`, color }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{mm.member.name}</p>
                <p className="text-xs text-muted-foreground">
                  {mm.role === "COORDINATOR" ? "Coordenador" : "Membro"}
                </p>
              </div>
              {isLeaderOrAdmin && (
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleRole(mm.memberId, mm.role)}
                    title={mm.role === "COORDINATOR" ? "Rebaixar para membro" : "Promover a coordenador"}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors cursor-pointer",
                      mm.role === "COORDINATOR"
                        ? "text-amber-400 hover:bg-amber-500/10"
                        : "text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
                    )}
                  >
                    <Crown className="w-3.5 h-3.5" />
                  </button>
                  {mm.member.phone && (
                    <a
                      href={`https://wa.me/55${mm.member.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => handleRemove(mm.memberId, mm.member.name)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Membro *</Label>
              <Select value={selectedMemberId} onValueChange={(v) => v && setSelectedMemberId(v)}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-60">
                  {available.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                  {available.length === 0 && (
                    <SelectItem value="_empty" disabled>Todos os membros já adicionados</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Cargo</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "MEMBER" | "COORDINATOR")}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="MEMBER">Membro</SelectItem>
                  <SelectItem value="COORDINATOR">Coordenador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="flex-1 border-border text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !selectedMemberId} className="flex-1">
                {loading ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab: Chamada ─────────────────────────────────────────────────────────────

function ChamadaTab({ ministryId, isLeaderOrAdmin }: { ministryId: string; isLeaderOrAdmin: boolean }) {
  const [events, setEvents] = useState<MinEvent[]>([]);
  const [ministryMembers, setMinistryMembers] = useState<MinistryMemberRecord[]>([]);
  const [activeEvent, setActiveEvent] = useState<MinEvent | null>(null);
  const [attendances, setAttendances] = useState<Record<string, AttendanceStatus>>({});
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    const res = await fetch(`/api/events?ministryId=${ministryId}`);
    if (res.ok) setEvents(await res.json());
  }, [ministryId]);

  useEffect(() => {
    fetchEvents();
    fetch(`/api/ministries/${ministryId}/members`)
      .then((r) => r.json())
      .then((d: MinistryMemberRecord[]) => setMinistryMembers(d));
  }, [ministryId, fetchEvents]);

  async function openEvent(ev: MinEvent) {
    setActiveEvent(ev);
    const res = await fetch(`/api/events/${ev.id}`);
    const data = await res.json();
    const map: Record<string, AttendanceStatus> = {};
    ministryMembers.forEach((mm) => (map[mm.memberId] = "ABSENT"));
    (data.attendances as { memberId: string; status: AttendanceStatus }[]).forEach(
      (a) => (map[a.memberId] = a.status)
    );
    setAttendances(map);
  }

  function cycleStatus(memberId: string) {
    const order: AttendanceStatus[] = ["ABSENT", "PRESENT", "JUSTIFIED"];
    const current = attendances[memberId] ?? "ABSENT";
    const next = order[(order.indexOf(current) + 1) % order.length];
    setAttendances((p) => ({ ...p, [memberId]: next }));
  }

  async function saveAttendances() {
    if (!activeEvent) return;
    setSaving(true);
    const list = Object.entries(attendances).map(([memberId, status]) => ({ memberId, status }));
    const res = await fetch("/api/attendances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: activeEvent.id, attendances: list }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Chamada salva!"); fetchEvents(); }
    else toast.error("Erro ao salvar");
  }

  const present = Object.values(attendances).filter((s) => s === "PRESENT").length;
  const total = ministryMembers.length;

  if (ministryMembers.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Adicione membros ao ministério antes de criar chamadas</p>
      </div>
    );
  }

  return (
    <div>
      {!activeEvent && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{events.length} evento{events.length !== 1 ? "s" : ""}</p>
            {isLeaderOrAdmin && (
              <Button size="sm" onClick={() => setNewEventOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Novo Evento
              </Button>
            )}
          </div>

          {events.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum evento neste ministério</p>
            </div>
          )}

          <div className="space-y-3">
            {events.map((ev) => (
              <div
                key={ev.id}
                onClick={() => openEvent(ev)}
                className="glass-card p-4 cursor-pointer flex items-center gap-4 group hover:border-primary/30"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{ev.title}</p>
                    <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                      {EVENT_LABELS[ev.type]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {fmt(ev.date, "dd 'de' MMMM 'de' yyyy")}
                    {ev.location && ` · ${ev.location}`}
                  </p>
                </div>
                {ev._count.attendances > 0 && (
                  <p className="text-xs text-primary font-medium">{ev._count.attendances} reg.</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {activeEvent && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setActiveEvent(null)} className="text-muted-foreground hover:text-foreground text-sm transition-colors cursor-pointer">
              ← Voltar
            </button>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{activeEvent.title}</p>
              <p className="text-xs text-muted-foreground">{fmt(activeEvent.date, "dd 'de' MMMM")}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-success">{present}/{total}</p>
              <p className="text-xs text-muted-foreground">presentes</p>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            {ministryMembers.map((mm) => {
              const status = attendances[mm.memberId] ?? "ABSENT";
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const initials = mm.member.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
              return (
                <div
                  key={mm.memberId}
                  onClick={() => { if (isLeaderOrAdmin) cycleStatus(mm.memberId); }}
                  className={cn(
                    "flex items-center gap-3 p-3 bg-card border border-border rounded-xl transition-colors select-none",
                    isLeaderOrAdmin ? "cursor-pointer hover:border-primary/30" : "opacity-90"
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{mm.member.name}</p>
                    {mm.role === "COORDINATOR" && (
                      <p className="text-[10px] text-amber-400">Coordenador</p>
                    )}
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${cfg.color}`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>

          {isLeaderOrAdmin && (
            <Button onClick={saveAttendances} disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Salvar Chamada"}
            </Button>
          )}
        </div>
      )}

      <NewMinistryEventDialog
        open={newEventOpen}
        onOpenChange={setNewEventOpen}
        ministryId={ministryId}
        onSuccess={() => { fetchEvents(); setNewEventOpen(false); }}
      />
    </div>
  );
}

function NewMinistryEventDialog({
  open, onOpenChange, ministryId, onSuccess,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; ministryId: string; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ title: "", type: "ENSAIO", date: new Date().toISOString().slice(0, 16), location: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ministryId }),
    });
    setLoading(false);
    if (res.ok) { toast.success("Evento criado!"); setForm({ title: "", type: "ENSAIO", date: new Date().toISOString().slice(0, 16), location: "" }); onSuccess(); }
    else toast.error("Erro ao criar evento");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Evento do Ministério</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Título *</Label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: Ensaio de louvor" required className="bg-background border-border text-foreground focus-visible:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => v && setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {Object.entries(EVENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Data e hora *</Label>
              <Input type="datetime-local" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="bg-background border-border text-foreground focus-visible:ring-primary" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Local</Label>
            <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Ex: Salão de ensaio" className="bg-background border-border text-foreground focus-visible:ring-primary" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-border text-muted-foreground">Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1">{loading ? "Criando..." : "Criar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab: Financeiro ──────────────────────────────────────────────────────────

function FinanceiroTab({ ministryId, isLeaderOrAdmin }: { ministryId: string; isLeaderOrAdmin: boolean }) {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allMembers, setAllMembers] = useState<AllMember[]>([]);
  const [addOfferingOpen, setAddOfferingOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);

  const month = new Date().toISOString().slice(0, 7);

  const fetchData = useCallback(async () => {
    const [offRes, expRes] = await Promise.all([
      fetch(`/api/offerings?month=${month}&ministryId=${ministryId}`),
      fetch(`/api/expenses?month=${month}&ministryId=${ministryId}`),
    ]);
    if (offRes.ok) setOfferings((await offRes.json()).offerings ?? []);
    if (expRes.ok) setExpenses((await expRes.json()).expenses ?? []);
  }, [month, ministryId]);

  useEffect(() => {
    fetchData();
    fetch("/api/members")
      .then((r) => r.json())
      .then((d: AllMember[]) => setAllMembers(d.filter((m) => m.status === "ACTIVE")));
  }, [fetchData]);

  const totalIn = offerings.reduce((s, o) => s + o.amount, 0);
  const totalOut = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Entradas", value: totalIn, color: "text-success" },
          { label: "Saídas", value: totalOut, color: "text-destructive" },
          { label: "Saldo", value: totalIn - totalOut, color: totalIn - totalOut >= 0 ? "text-success" : "text-destructive" },
        ].map((c) => (
          <div key={c.label} className="glass-card p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>
              R$ {Math.abs(c.value).toFixed(2).replace(".", ",")}
            </p>
          </div>
        ))}
      </div>

      {isLeaderOrAdmin && (
        <div className="flex gap-2 mb-6">
          <Button size="sm" variant="outline" onClick={() => setAddOfferingOpen(true)} className="border-success/30 text-success hover:bg-success/10">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Entrada
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAddExpenseOpen(true)} className="border-destructive/30 text-destructive hover:bg-destructive/10">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Despesa
          </Button>
        </div>
      )}

      {offerings.length === 0 && expenses.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum lançamento financeiro neste mês</p>
        </div>
      )}

      {offerings.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Entradas</p>
          <div className="space-y-2">
            {offerings.map((o) => (
              <div key={o.id} className="glass-card p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{o.member.name}</p>
                  <p className="text-xs text-muted-foreground">{fmt(o.date, "dd/MM/yyyy")} · {o.method}</p>
                </div>
                <p className="text-sm font-bold text-success">+R$ {o.amount.toFixed(2).replace(".", ",")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {expenses.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Despesas</p>
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.id} className="glass-card p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{fmt(e.date, "dd/MM/yyyy")} · {e.category}</p>
                </div>
                <p className="text-sm font-bold text-destructive">-R$ {e.amount.toFixed(2).replace(".", ",")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Offering Dialog */}
      <AddOfferingDialog
        open={addOfferingOpen}
        onOpenChange={setAddOfferingOpen}
        ministryId={ministryId}
        allMembers={allMembers}
        onSuccess={() => { fetchData(); setAddOfferingOpen(false); }}
      />

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        ministryId={ministryId}
        onSuccess={() => { fetchData(); setAddExpenseOpen(false); }}
      />
    </div>
  );
}

function AddOfferingDialog({
  open, onOpenChange, ministryId, allMembers, onSuccess,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; ministryId: string; allMembers: AllMember[]; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ memberId: "", amount: "", method: "PIX", date: new Date().toISOString().slice(0, 10) });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount), ministryId }),
    });
    setLoading(false);
    if (res.ok) { toast.success("Entrada registrada!"); onSuccess(); }
    else toast.error("Erro ao registrar");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-sm">
        <DialogHeader><DialogTitle>Nova Entrada</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Membro *</Label>
            <Select value={form.memberId} onValueChange={(v) => v && setForm((p) => ({ ...p, memberId: v }))}>
              <SelectTrigger className="bg-background border-border text-foreground"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="bg-card border-border max-h-60">
                {allMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Valor *</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required className="bg-background border-border text-foreground focus-visible:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Método</Label>
              <Select value={form.method} onValueChange={(v) => v && setForm((p) => ({ ...p, method: v }))}>
                <SelectTrigger className="bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Data</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="bg-background border-border text-foreground focus-visible:ring-primary" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-border text-muted-foreground">Cancelar</Button>
            <Button type="submit" disabled={loading || !form.memberId} className="flex-1">{loading ? "Salvando..." : "Registrar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddExpenseDialog({
  open, onOpenChange, ministryId, onSuccess,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; ministryId: string; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ description: "", amount: "", category: "OUTRO", date: new Date().toISOString().slice(0, 10) });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount), ministryId }),
    });
    setLoading(false);
    if (res.ok) { toast.success("Despesa registrada!"); onSuccess(); }
    else toast.error("Erro ao registrar");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-sm">
        <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Descrição *</Label>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Ex: Material de louvor" required className="bg-background border-border text-foreground focus-visible:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Valor *</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required className="bg-background border-border text-foreground focus-visible:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Categoria</Label>
              <Select value={form.category} onValueChange={(v) => v && setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger className="bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="MATERIAL">Material</SelectItem>
                  <SelectItem value="TRANSPORTE">Transporte</SelectItem>
                  <SelectItem value="ALIMENTACAO">Alimentação</SelectItem>
                  <SelectItem value="EVENTO">Evento</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Data</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="bg-background border-border text-foreground focus-visible:ring-primary" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-border text-muted-foreground">Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1">{loading ? "Salvando..." : "Registrar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
