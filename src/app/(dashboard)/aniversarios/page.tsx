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

  // Next 8 birthdays
  const upcoming = [...withDate]
    .sort((a, b) => daysUntil(a.birthday!) - daysUntil(b.birthday!))
    .slice(0, 8);

  // Filter
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

  // Group by month
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

  // Stats
  const now = new Date();
  const thisMonth = members.filter(
    (m) => m.birthday && parseInt(m.birthday.split("/")[1]) === now.getMonth() + 1
  ).length;
  const next30 = withDate.filter((m) => daysUntil(m.birthday!) <= 30).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl lg:text-3xl font-bold text-[#e8c97a]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          🎂 Aniversários
        </h1>
        <p className="text-[#888] text-sm mt-1">
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
            className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4 text-center"
          >
            <p
              className="text-3xl font-bold text-[#c9a84c]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {s.num}
            </p>
            <p className="text-[10px] text-[#888] uppercase tracking-wider mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] tracking-[3px] uppercase text-[#c9a84c]">
              Próximos aniversários
            </span>
            <div className="flex-1 h-px bg-[#2a2a2a]" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {upcoming.map((m) => {
              const days = daysUntil(m.birthday!);
              const today = isToday(m.birthday!);
              return (
                <div
                  key={m.id}
                  className="flex-shrink-0 bg-gradient-to-br from-[#1e1e1e] to-[#1a1508] border border-[#7a6330] rounded-xl p-4 min-w-[150px] hover:-translate-y-1 transition-transform"
                >
                  <p className="text-[10px] tracking-[2px] uppercase text-[#c9a84c] mb-1">
                    {today ? "🎉 Hoje!" : `${days}d`}
                  </p>
                  <p className="font-semibold text-sm text-[#f0ece4] truncate max-w-[130px]">
                    {m.name.split(" ")[0]}
                  </p>
                  <p className="text-xs text-[#888] mt-0.5">{m.birthday}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#1e1e1e] border-[#2a2a2a] text-[#f0ece4] placeholder:text-[#888] focus-visible:ring-[#7a6330]"
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
        <p className="text-center text-[#888] py-16">Nenhum resultado encontrado</p>
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
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
        active
          ? "bg-[#c9a84c22] text-[#c9a84c] border border-[#c9a84c33]"
          : "bg-[#1e1e1e] text-[#888] border border-[#2a2a2a] hover:text-[#f0ece4]"
      }`}
    >
      {label}
    </button>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="text-[#e8c97a] font-bold text-lg"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}
      </span>
      <span className="bg-[#7a6330] text-[#e8c97a] text-xs font-semibold px-2 py-0.5 rounded-full">
        {count}
      </span>
      <div className="flex-1 h-px bg-[#2a2a2a]" />
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
      className={`bg-[#1e1e1e] border rounded-xl overflow-hidden transition-colors hover:border-[#7a6330] ${
        today ? "border-[#c9a84c] bg-gradient-to-br from-[#1e1e1e] to-[#1a1508]" : "border-[#2a2a2a]"
      }`}
    >
      <div className="flex items-start p-4 gap-3">
        <div
          className="w-10 h-10 rounded-full bg-[#7a6330] flex items-center justify-center text-[#e8c97a] font-bold text-sm flex-shrink-0"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {initials(member.name)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-[#f0ece4]">{member.name}</p>
            {today && (
              <span className="bg-[#c9a84c] text-black text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase">
                Hoje!
              </span>
            )}
          </div>
          {member.birthday ? (
            <p className="text-[#c9a84c] text-xs mt-0.5">{member.birthday}</p>
          ) : (
            <p className="text-[#888] text-xs mt-0.5 italic">Sem data</p>
          )}
        </div>
      </div>

      <div className="mx-4 mb-3 bg-[#161616] border border-[#252525] rounded-lg px-3 py-2">
        <p className="text-xs text-[#ccc] leading-relaxed line-clamp-2">
          {birthdayMessage(member.name)}
        </p>
      </div>

      <div className="flex justify-end px-4 pb-4">
        <button
          onClick={onCopy}
          className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all ${
            isCopied
              ? "border-[#2ecc71] text-[#2ecc71] bg-[#2ecc7118]"
              : "border-[#2a2a2a] text-[#888] hover:border-[#2ecc71] hover:text-[#2ecc71] hover:bg-[#2ecc7111]"
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
