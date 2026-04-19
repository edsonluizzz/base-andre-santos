"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Users, DollarSign, CalendarDays, Cake, TrendingUp, AlertTriangle, CheckCircle, Phone, ChevronDown, ChevronUp, Plus } from "lucide-react";
import Link from "next/link";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarWidget } from "@/components/ui/calendar-widget";
import { NewEventDialog } from "@/components/shared/event-dialogs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SetupChecklist } from "@/components/onboarding/setup-checklist";

type Member = {
  id: string;
  name: string;
  birthday: string | null;
  status: string;
};

type Event = {
  id: string;
  title: string;
  type: string;
  date: string;
};

type EvasionMember = {
  id: string;
  name: string;
  phone: string | null;
  lastEvents: string[];
};

type Summary = {
  members: Member[];
  events: Event[];
  settings: { hasJoinCode: boolean; hasLogo: boolean };
  evasion: { members: EvasionMember[]; eventsAnalyzed: unknown[] };
  financial: { offeringsTotal: number; expensesTotal: number } | null;
};

function safeFormat(dateStr: string | Date, fmt: string): string {
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (!isValid(d)) return "";
    return format(d, fmt, { locale: ptBR });
  } catch {
    return "";
  }
}

function daysUntil(ddmm: string): number {
  const [d, m] = ddmm.split("/").map(Number);
  const now = new Date();
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next < now) next = new Date(now.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - now.getTime()) / 86400000);
}

function isToday(ddmm: string): boolean {
  const [d, m] = ddmm.split("/").map(Number);
  const now = new Date();
  return now.getDate() === d && now.getMonth() + 1 === m;
}


export default function DashboardPage() {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [evasionLoading, setEvasionLoading] = useState(true);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDetailDate, setDayDetailDate] = useState<Date | undefined>();
  const [radarExpanded, setRadarExpanded] = useState(false);

  const fetchSummary = useCallback(async () => {
    const res = await fetch("/api/dashboard/summary");
    if (!res.ok) return;
    const data: Summary = await res.json();
    setSummary(data);
    setEvasionLoading(false);
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const members = summary?.members ?? [];
  const events = summary?.events ?? [];
  const evasionMembers = summary?.evasion?.members ?? [];
  const setupSettings = summary?.settings ?? { hasJoinCode: false, hasLogo: false };
  const totalMonth = summary?.financial?.offeringsTotal ?? 0;
  const expensesTotal = summary?.financial?.expensesTotal ?? 0;

  const active = members.filter((m) => m.status === "ACTIVE").length;
  const saldo = totalMonth - expensesTotal;
  const now = new Date();

  const upcomingBirthdays = members
    .filter((m) => m.birthday && daysUntil(m.birthday) <= 30)
    .sort((a, b) => daysUntil(a.birthday!) - daysUntil(b.birthday!))
    .slice(0, 5);

  const birthdayEvents = members
    .filter((m) => m.birthday)
    .flatMap((m) => {
      const [d, mo] = m.birthday!.split("/").map(Number);
      const thisYear = new Date(now.getFullYear(), mo - 1, d);
      const nextYear = new Date(now.getFullYear() + 1, mo - 1, d);
      return [
        { id: `bday-${m.id}-cy`, title: `🎂 ${m.name}`, type: "BIRTHDAY", date: thisYear.toISOString() },
        { id: `bday-${m.id}-ny`, title: `🎂 ${m.name}`, type: "BIRTHDAY", date: nextYear.toISOString() },
      ];
    });

  function handleDayClick(date: Date) {
    const dayEvents = events.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === date.getFullYear() &&
             d.getMonth() === date.getMonth() &&
             d.getDate() === date.getDate();
    });
    if (dayEvents.length > 0) {
      setDayDetailDate(date);
      setDayDetailOpen(true);
    } else {
      setSelectedDate(date);
      setNewEventOpen(true);
    }
  }

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const statCards = [
    {
      icon: Users,
      label: "Membros Ativos",
      value: active,
      href: "/membros",
      valueColor: undefined as string | undefined,
    },
    ...(summary?.financial != null ? [{
      icon: saldo >= 0 ? TrendingUp : DollarSign,
      label: "Saldo do Mês",
      value: `R$ ${Math.abs(saldo).toFixed(2).replace(".", ",")}`,
      sub: saldo < 0 ? "déficit" : "superávit",
      href: "/financeiro",
      valueColor: saldo >= 0 ? "#10B981" : "#ef4444",
    }] : []),
    {
      icon: CalendarDays,
      label: "Eventos",
      value: events.length,
      href: "/chamada",
      valueColor: undefined as string | undefined,
    },
    {
      icon: Cake,
      label: "Aniversários",
      value: upcomingBirthdays.length,
      sub: "próx. 30 dias",
      href: "/aniversarios",
      valueColor: undefined as string | undefined,
    },
  ];

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-muted-foreground text-sm">{greeting},</p>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mt-0.5">
          {session?.user?.name?.split(" ")[0] ?? "Pastor"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {safeFormat(now, "EEEE, dd 'de' MMMM 'de' yyyy")}
        </p>
      </div>

      {/* Setup checklist — apenas para ADMIN */}
      {session?.user?.role === "ADMIN" && session?.user?.establishmentId && (
        <SetupChecklist
          establishmentId={session.user.establishmentId}
          membersCount={members.filter((m) => m.status === "ACTIVE").length}
          eventsCount={events.length}
          hasJoinCode={setupSettings.hasJoinCode}
          hasLogo={setupSettings.hasLogo}
        />
      )}

      {/* Stat cards — stagger */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div
            key={card.href + card.label}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both h-full"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <StatCard
              icon={card.icon}
              label={card.label}
              value={card.value}
              sub={(card as { sub?: string }).sub}
              href={card.href}
              valueColor={card.valueColor}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Calendar widget — takes 2 cols on large screens */}
        <div
          className="lg:col-span-2 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ animationDelay: "200ms" }}
        >
          <CalendarWidget events={[...events, ...birthdayEvents]} onDayClick={handleDayClick} />
        </div>

        <div className="space-y-6">
          {/* Radar de Liderança (Insights) — oculto para MEMBERs */}
          {session?.user?.role !== "MEMBER" && <div
            className="glass-card p-5 animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-both"
            style={{ animationDelay: "300ms" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] tracking-[3px] uppercase text-primary/70">
                  Radar de Liderança
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 italic">Membros ausentes nos últimos 3 encontros</p>
              </div>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>

            {evasionLoading ? (
              <p className="text-muted-foreground text-xs py-4 text-center">Analisando frequência...</p>
            ) : evasionMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-500/20 mb-2" />
                <p className="text-muted-foreground text-xs">Todos os membros ativos estão frequentes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(radarExpanded ? evasionMembers : evasionMembers.slice(0, 4)).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-xs font-bold">
                      {m.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">3 faltas consecutivas</p>
                    </div>
                    {m.phone && (
                      <a
                        href={`https://wa.me/55${m.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${m.name.split(" ")[0]}, sentimos sua falta nos últimos encontros. Está tudo bem com você?`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title="Enviar mensagem"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
                {evasionMembers.length > 4 && (
                  <button
                    onClick={() => setRadarExpanded((v) => !v)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    {radarExpanded ? (
                      <><ChevronUp className="w-3 h-3" /> Recolher</>
                    ) : (
                      <><ChevronDown className="w-3 h-3" /> Ver todos ({evasionMembers.length - 4} mais)</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>}

          {/* Upcoming birthdays */}
          <div
            className="glass-card p-5 animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-both"
            style={{ animationDelay: "400ms" }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] tracking-[3px] uppercase text-primary/70">
                Aniversariantes do Mês
              </p>
              <Link href="/aniversarios" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Ver todos
              </Link>
            </div>
            {upcomingBirthdays.length === 0 ? (
              <p className="text-muted-foreground text-xs py-4 text-center">Nenhum nos próximos 30 dias</p>
            ) : (
              <div className="space-y-3">
                {upcomingBirthdays.slice(0, 3).map((m) => {
                  const days = daysUntil(m.birthday!);
                  const today = isToday(m.birthday!);
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {m.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.birthday}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        today
                          ? "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {today ? "Hoje!" : `${days}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal detalhe do dia */}
      <Dialog open={dayDetailOpen} onOpenChange={setDayDetailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {dayDetailDate && safeFormat(dayDetailDate, "EEEE, dd 'de' MMMM")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {dayDetailDate && events
              .filter((e) => {
                const d = new Date(e.date);
                return d.getFullYear() === dayDetailDate.getFullYear() &&
                       d.getMonth() === dayDetailDate.getMonth() &&
                       d.getDate() === dayDetailDate.getDate();
              })
              .map((e) => (
                <Link
                  key={e.id}
                  href={`/chamada?evento=${e.id}`}
                  onClick={() => setDayDetailOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{e.title}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{e.type}</p>
                  </div>
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))
            }
          </div>
          <button
            onClick={() => {
              setDayDetailOpen(false);
              setSelectedDate(dayDetailDate);
              setNewEventOpen(true);
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo evento neste dia
          </button>
        </DialogContent>
      </Dialog>

      <NewEventDialog
        open={newEventOpen}
        onOpenChange={setNewEventOpen}
        initialDate={selectedDate}
        onSuccess={() => { fetchSummary(); setNewEventOpen(false); }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  href: string;
  valueColor?: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card p-5 flex flex-col group cursor-pointer hover:-translate-y-1 h-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p
        className="text-2xl font-bold group-hover:opacity-90 transition-opacity"
        style={{ color: valueColor ?? "var(--foreground)" }}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </Link>
  );
}
