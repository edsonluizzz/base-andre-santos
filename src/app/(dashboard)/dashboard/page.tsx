"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/context/permissions-context";
import { Users, DollarSign, CalendarDays, Cake, TrendingUp, AlertTriangle, CheckCircle, Star } from "lucide-react";
import Link from "next/link";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

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

type AttendanceByMember = {
  id: string;
  name: string;
  total: number;
  present: number;
  rate: number | null;
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  CULTO: "Culto",
  ENSAIO: "Ensaio",
  REUNIAO: "Reunião",
  RETIRO: "Retiro",
  CELULA: "Célula",
  CONGRESSO: "Congresso",
  OUTRO: "Outro",
};

const EVENT_TYPE_BADGE: Record<string, string> = {
  CULTO:     "bg-primary/15 text-primary",
  ENSAIO:    "bg-blue-500/15 text-blue-400",
  REUNIAO:   "bg-amber-500/15 text-amber-400",
  RETIRO:    "bg-emerald-500/15 text-emerald-400",
  CELULA:    "bg-cyan-500/15 text-cyan-400",
  CONGRESSO: "bg-orange-500/15 text-orange-400",
  OUTRO:     "bg-secondary text-muted-foreground",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const { canView } = usePermissions();
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [totalMonth, setTotalMonth] = useState(0);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceByMember[]>([]);

  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then(setMembers);
    fetch("/api/events").then((r) => r.json()).then(setEvents);
    fetch("/api/reports?type=attendance-by-member")
      .then((r) => r.json())
      .then((d) => setAttendance(Array.isArray(d) ? d : []));

    if (canView("FINANCIAL")) {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      fetch(`/api/offerings?month=${month}`)
        .then((r) => r.json())
        .then((d) => setTotalMonth(d.total ?? 0));
      fetch(`/api/expenses?month=${month}`)
        .then((r) => r.json())
        .then((d) => setExpensesTotal(d.total ?? 0));
    }
  }, [canView]);

  const active = members.filter((m) => m.status === "ACTIVE").length;
  const saldo = totalMonth - expensesTotal;
  const now = new Date();

  const upcomingBirthdays = members
    .filter((m) => m.birthday && daysUntil(m.birthday) <= 30)
    .sort((a, b) => daysUntil(a.birthday!) - daysUntil(b.birthday!))
    .slice(0, 5);

  const upcomingEvents = events
    .filter((e) => new Date(e.date) >= now)
    .slice(0, 5);

  const lowAttendance = attendance.filter((m) => m.total > 0 && (m.rate ?? 100) < 50);
  const topAttendee = attendance
    .filter((m) => m.total > 0)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];

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
    ...(canView("FINANCIAL") ? [{
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Upcoming birthdays */}
        <div
          className="glass-card p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] tracking-[3px] uppercase text-primary/70">
              Próximos Aniversários
            </p>
            <Link href="/aniversarios" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Ver todos →
            </Link>
          </div>
          {upcomingBirthdays.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Nenhum nos próximos 30 dias</p>
          ) : (
            <div className="space-y-3">
              {upcomingBirthdays.map((m) => {
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
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      today
                        ? "bg-emerald-500 text-white"
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

        {/* Upcoming events */}
        <div
          className="glass-card p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] tracking-[3px] uppercase text-primary/70">
              Próximos Eventos
            </p>
            <Link href="/chamada" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Ver todos →
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Nenhum evento futuro cadastrado</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{ev.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      {safeFormat(ev.date, "dd/MM HH:mm")}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${EVENT_TYPE_BADGE[ev.type] ?? "bg-secondary text-muted-foreground"}`}>
                        {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Insights — Alertas de Frequência */}
      <div
        className="glass-card p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
        style={{ animationDelay: "400ms" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] tracking-[3px] uppercase text-primary/70">
            Insights de Frequência
          </p>
          <Link href="/relatorios" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Ver relatório →
          </Link>
        </div>

        {attendance.length === 0 ? (
          <p className="text-muted-foreground text-sm py-2 text-center">Nenhuma chamada registrada ainda</p>
        ) : (
          <div className="space-y-3">
            {lowAttendance.length > 0 ? (
              <div className="flex items-start gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    {lowAttendance.length} membro{lowAttendance.length !== 1 ? "s" : ""} com frequência abaixo de 50%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lowAttendance.slice(0, 3).map((m) => `${m.name} (${m.rate ?? 0}%)`).join(", ")}
                    {lowAttendance.length > 3 && ` e mais ${lowAttendance.length - 3}...`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-sm text-emerald-400">Todos os membros com boa frequência</p>
              </div>
            )}

            {topAttendee && (
              <div className="flex items-center gap-3 p-3 border border-white/[0.07] rounded-xl">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                  {topAttendee.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{topAttendee.name}</p>
                  <p className="text-xs text-muted-foreground">Maior presença — {topAttendee.rate ?? 0}%</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full">
                  <Star className="w-3 h-3" />
                  Destaque
                </span>
              </div>
            )}
          </div>
        )}
      </div>
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
