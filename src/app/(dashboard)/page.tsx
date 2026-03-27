"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Users, DollarSign, CalendarDays, Cake } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
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

  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then(setMembers);
    fetch("/api/events").then((r) => r.json()).then(setEvents);
    const m = new Date();
    const month = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    fetch(`/api/offerings?month=${month}`).then((r) => r.json()).then((d) => setTotalMonth(d.total));
  }, []);

  const active = members.filter((m) => m.status === "ACTIVE").length;
  const now = new Date();
  const upcomingBirthdays = members
    .filter((m) => m.birthday && daysUntil(m.birthday) <= 30)
    .sort((a, b) => daysUntil(a.birthday!) - daysUntil(b.birthday!))
    .slice(0, 5);

  const upcomingEvents = events
    .filter((e) => new Date(e.date) >= now)
    .slice(0, 5);

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
          {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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
          icon={DollarSign}
          label="Ofertas (mês)"
          value={`R$ ${totalMonth.toFixed(2).replace(".", ",")}`}
          href="/financeiro"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      {format(new Date(ev.date), "dd/MM HH:mm")} · {EVENT_TYPE_LABELS[ev.type]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  href: string;
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
        className="text-2xl font-bold text-[#f0ece4] group-hover:text-[#c9a84c] transition-colors"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
      <p className="text-[11px] text-[#888] mt-1 uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[10px] text-[#555] mt-0.5">{sub}</p>}
    </Link>
  );
}
