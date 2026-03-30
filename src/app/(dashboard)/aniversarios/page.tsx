"use client";

import { useState, useEffect } from "react";
import { Search, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

type Member = {
  id: string;
  name: string;
  birthday: string | null;
  phone: string | null;
};

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const MONTH_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function daysUntil(ddmm: string): number {
  const [d, m] = ddmm.split("/").map(Number);
  const now = new Date();
  const year = now.getFullYear();
  let next = new Date(year, m - 1, d);
  if (next < now) next = new Date(year + 1, m - 1, d);
  return Math.round((next.getTime() - now.getTime()) / 86400000);
}

function isToday(ddmm: string): boolean {
  const [d, m] = ddmm.split("/").map(Number);
  const now = new Date();
  return now.getDate() === d && now.getMonth() + 1 === m;
}

function birthdayMessage(name: string): string {
  return `🎂 Feliz aniversário, ${name.split(" ")[0]}! Que o Senhor te abençoe ricamente nesse novo ciclo de vida. Parabéns! 🙌`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function AniversariosPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<number | "todos" | "sem-data">("todos");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then(setMembers);
  }, []);

  async function copyMsg(id: string, name: string) {
    await navigator.clipboard.writeText(birthdayMessage(name));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const withDate = members.filter((m) => m.birthday);
  const withoutDate = members.filter((m) => !m.birthday);

  const upcoming = [...withDate]
    .sort((a, b) => daysUntil(a.birthday!) - daysUntil(b.birthday!))
    .slice(0, 8);

  let filtered = members;
  if (search) {
    filtered = filtered.filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (filter === "sem-data") {
    filtered = filtered.filter((m) => !m.birthday);
  } else if (typeof filter === "number") {
    filtered = filtered.filter((m) => {
      if (!m.birthday) return false;
      return parseInt(m.birthday.split("/")[1]) === filter;
    });
  }

  const grouped: Record<number, Member[]> = {};
  for (const m of filtered) {
    if (!m.birthday) continue;
    const mo = parseInt(m.birthday.split("/")[1]);
    if (!grouped[mo]) grouped[mo] = [];
    grouped[mo].push(m);
  }
  for (const mo in grouped) {
    grouped[+mo].sort((a, b) => {
      const da = parseInt(a.birthday!.split("/")[0]);
      const db = parseInt(b.birthday!.split("/")[0]);
      return da - db;
    });
  }

  const now = new Date();
  const thisMonth = members.filter(
    (m) => m.birthday && parseInt(m.birthday.split("/")[1]) === now.getMonth() + 1
  ).length;
  const next30 = withDate.filter((m) => daysUntil(m.birthday!) <= 30).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Aniversários
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Lista completa · Mensagens para WhatsApp
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { num: members.length, label: "Total" },
          { num: thisMonth, label: "Este mês" },
          { num: next30, label: "Próx. 30 dias" },
          { num: withoutDate.length, label: "Sem data" },
        ].map((s) => (
          <div
            key={s.label}
            className="glass-card p-4 text-center"
          >
            <p className="text-3xl font-bold text-primary">
              {s.num}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] tracking-[3px] uppercase text-primary/70">
              Próximos aniversários
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {upcoming.map((m) => {
              const days = daysUntil(m.birthday!);
              const today = isToday(m.birthday!);
              return (
                <div
                  key={m.id}
                  className={`flex-shrink-0 glass-card p-4 min-w-[150px] hover:-translate-y-1 ${
                    today ? "border-primary/40" : ""
                  }`}
                >
                  <p className="text-[10px] tracking-[2px] uppercase text-primary mb-1">
                    {today ? "🎉 Hoje!" : `${days}d`}
                  </p>
                  <p className="font-semibold text-sm text-foreground truncate max-w-[130px]">
                    {m.name.split(" ")[0]}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.birthday}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterBtn
            label="Todos"
            active={filter === "todos"}
            onClick={() => setFilter("todos")}
          />
          {MONTHS.map((mo, i) => (
            <FilterBtn
              key={i}
              label={mo}
              active={filter === i + 1}
              onClick={() => setFilter(i + 1)}
            />
          ))}
          <FilterBtn
            label="Sem data"
            active={filter === "sem-data"}
            onClick={() => setFilter("sem-data")}
          />
        </div>
      </div>

      {/* List */}
      {filter === "sem-data" ? (
        <div>
          <SectionTitle title="Sem data cadastrada" count={filtered.filter(m => !m.birthday).length} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered
              .filter((m) => !m.birthday)
              .map((m) => (
                <BirthdayCard
                  key={m.id}
                  member={m}
                  isCopied={copied === m.id}
                  onCopy={() => copyMsg(m.id, m.name)}
                />
              ))}
          </div>
        </div>
      ) : (
        Object.keys(grouped)
          .map(Number)
          .sort((a, b) => a - b)
          .map((mo) => (
            <div key={mo} className="mb-8">
              <SectionTitle title={MONTH_FULL[mo - 1]} count={grouped[mo].length} />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {grouped[mo].map((m) => (
                  <BirthdayCard
                    key={m.id}
                    member={m}
                    isCopied={copied === m.id}
                    onCopy={() => copyMsg(m.id, m.name)}
                  />
                ))}
              </div>
            </div>
          ))
      )}

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-16">Nenhum resultado encontrado</p>
      )}
    </div>
  );
}

function FilterBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
        active
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-card text-muted-foreground border border-border hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-foreground font-bold text-lg">
        {title}
      </span>
      <span className="bg-primary/10 text-accent-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
        {count}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function BirthdayCard({
  member,
  isCopied,
  onCopy,
}: {
  member: Member;
  isCopied: boolean;
  onCopy: () => void;
}) {
  const today = member.birthday ? isToday(member.birthday) : false;

  return (
    <div
      className={`glass-card overflow-hidden transition-colors ${
        today ? "border-primary/40" : ""
      }`}
    >
      <div className="flex items-start p-4 gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
          {initials(member.name)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-foreground">{member.name}</p>
            {today && (
              <span className="bg-emerald-500 text-white text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase">
                Hoje!
              </span>
            )}
          </div>
          {member.birthday ? (
            <p className="text-accent-foreground text-xs mt-0.5">{member.birthday}</p>
          ) : (
            <p className="text-muted-foreground text-xs mt-0.5 italic">Sem data</p>
          )}
        </div>
      </div>

      <div className="mx-4 mb-3 bg-background border border-border rounded-lg px-3 py-2">
        <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">
          {birthdayMessage(member.name)}
        </p>
      </div>

      <div className="flex justify-end px-4 pb-4">
        <button
          onClick={onCopy}
          className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
            isCopied
              ? "border-success text-success bg-success/10"
              : "border-border text-muted-foreground hover:border-success hover:text-success hover:bg-success/5"
          }`}
        >
          {isCopied ? (
            <Check className="w-3 h-3" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {isCopied ? "Copiado!" : "Copiar mensagem"}
        </button>
      </div>
    </div>
  );
}
