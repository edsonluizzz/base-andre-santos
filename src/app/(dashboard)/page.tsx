"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Users, DollarSign, CalendarDays, Cake, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
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
  OUTRO: "Outro",
};

export default function DashboardPage() {
  const { data: session } = useSession();
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

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    fetch(`/api/offerings?month=${month}`)
      .then((r) => r.json())
      .then((d) => setTotalMonth(d.total ?? 0));
    fetch(`/api/expenses?month=${month}`)
      .then((r) => r.json())
      .then((d) => setExpensesTotal(d.total ?? 0));
  }, []);

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

  // Members with low attendance (rate < 50%, at least 1 event)
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

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-[#888] text-sm">{greeting},</p>
        <h1
          className="text-2xl lg:text-3xl font-bold text-[#e8c97a] mt-0.5"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {session?.user?.name?.split(" ")[0] ?? "Pastor"}
        </h1>
        <p className="text-[#888] text-sm mt-1">
          {safeFormat(now, "EEEE, dd 'de' MMMM 'de' yyyy")}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Membros Ativos"
          value={active}
          href="/membros"
        />
        <StatCard
          icon={saldo >= 0 ? TrendingUp : DollarSign}
          label="Saldo do Mês"
          value={`R$ ${Math.abs(saldo).toFixed(2).replace(".", ",")}`}
          sub={saldo < 0 ? "déficit" : "superávit"}
          href="/financeiro"
          valueColor={saldo >= 0 ? "#2ecc71" : "#e74c3c"}
        />
        <StatCard
          icon={CalendarDays}
          label="Eventos"
          value={events.length}
          href="/chamada"
        />
        <StatCard
          icon={Cake}
          label="Aniversários"
          value={upcomingBirthdays.length}
          sub="próx. 30 dias"
          href="/aniversarios"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Upcoming birthdays */}
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] tracking-[3px] uppercase text-[#c9a84c]">
              Próximos Aniversários
            </p>
            <Link href="/aniversarios" className="text-xs text-[#888] hover:text-[#c9a84c] transition-colors">
              Ver todos →
            </Link>
          </div>
          {upcomingBirthdays.length === 0 ? (
            <p className="text-[#888] text-sm py-4 text-center">Nenhum nos próximos 30 dias</p>
          ) : (
            <div className="space-y-3">
              {upcomingBirthdays.map((m) => {
                const days = daysUntil(m.birthday!);
                const today = isToday(m.birthday!);
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#7a6330] flex items-center justify-center text-[#e8c97a] text-xs font-bold"
                      style={{ fontFamily: "var(--font-heading)" }}>
                      {m.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#f0ece4]">{m.name}</p>
                      <p className="text-xs text-[#888]">{m.birthday}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      today
                        ? "bg-[#c9a84c] text-black"
                        : "bg-[#c9a84c22] text-[#c9a84c]"
                    }`}>
                      {today ? "🎂 Hoje!" : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming events */}
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] tracking-[3px] uppercase text-[#c9a84c]">
              Próximos Eventos
            </p>
            <Link href="/chamada" className="text-xs text-[#888] hover:text-[#c9a84c] transition-colors">
              Ver todos →
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-[#888] text-sm py-4 text-center">Nenhum evento futuro cadastrado</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#c9a84c22] border border-[#c9a84c33] flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-[#c9a84c]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#f0ece4]">{ev.title}</p>
                    <p className="text-xs text-[#888]">
                      {safeFormat(ev.date, "dd/MM HH:mm")} · {EVENT_TYPE_LABELS[ev.type]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Insights — Alertas de Frequência */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] tracking-[3px] uppercase text-[#c9a84c]">
            Insights de Frequência
          </p>
          <Link href="/relatorios" className="text-xs text-[#888] hover:text-[#c9a84c] transition-colors">
            Ver relatório →
          </Link>
        </div>

        {attendance.length === 0 ? (
          <p className="text-[#888] text-sm py-2 text-center">Nenhuma chamada registrada ainda</p>
        ) : (
          <div className="space-y-3">
            {lowAttendance.length > 0 ? (
              <div className="flex items-start gap-3 p-3 bg-[#e74c3c11] border border-[#e74c3c22] rounded-xl">
                <AlertTriangle className="w-4 h-4 text-[#e74c3c] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#e74c3c]">
                    {lowAttendance.length} membro{lowAttendance.length !== 1 ? "s" : ""} com frequência abaixo de 50%
                  </p>
                  <p className="text-xs text-[#888] mt-0.5">
                    {lowAttendance.slice(0, 3).map((m) => `${m.name} (${m.rate ?? 0}%)`).join(", ")}
                    {lowAttendance.length > 3 && ` e mais ${lowAttendance.length - 3}...`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-[#2ecc7111] border border-[#2ecc7122] rounded-xl">
                <CheckCircle className="w-4 h-4 text-[#2ecc71]" />
                <p className="text-sm text-[#2ecc71]">Todos os membros com boa frequência</p>
              </div>
            )}

            {topAttendee && (
              <div className="flex items-center gap-3 p-3 border border-[#2a2a2a] rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#7a6330] flex items-center justify-center text-[#e8c97a] text-xs font-bold"
                  style={{ fontFamily: "var(--font-heading)" }}>
                  {topAttendee.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#f0ece4]">{topAttendee.name}</p>
                  <p className="text-xs text-[#888]">Maior presença — {topAttendee.rate ?? 0}%</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-[#c9a84c22] text-[#c9a84c] rounded-full">
                  ⭐ Destaque
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
      className="bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#7a6330] rounded-xl p-5 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-[#c9a84c22] border border-[#c9a84c33] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#c9a84c]" />
        </div>
      </div>
      <p
        className="text-2xl font-bold group-hover:opacity-90 transition-opacity"
        style={{ fontFamily: "var(--font-heading)", color: valueColor ?? "#f0ece4" }}
      >
        {value}
      </p>
      <p className="text-[11px] text-[#888] mt-1 uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[10px] text-[#555] mt-0.5">{sub}</p>}
    </Link>
  );
}
