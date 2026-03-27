"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberRecord = {
  id: string; name: string; birthday: string | null; phone: string | null;
  status: "ACTIVE" | "INACTIVE"; notes: string | null;
};

type AttendanceByEvent = {
  id: string; title: string; type: string; date: string;
  total: number; present: number; absent: number; justified: number; rate: number | null;
};
type AttendanceByMember = {
  id: string; name: string;
  total: number; present: number; absent: number; justified: number; rate: number | null;
};
type FinancialByMonth = { month: string; total: number; cash: number; pix: number; count: number };
type FinancialByMember = { id: string; name: string; total: number; cash: number; pix: number; count: number };

const EVENT_LABELS: Record<string, string> = {
  CULTO: "Culto", ENSAIO: "Ensaio", REUNIAO: "Reunião", RETIRO: "Retiro", OUTRO: "Outro",
};

const fmt = (v: number | string | null | undefined) =>
  `R$ ${Number(v ?? 0).toFixed(2).replace(".", ",")}`;

// ─── Rate bar ─────────────────────────────────────────────────────────────────

function RateBar({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-[#555] text-xs">Sem dados</span>;
  const color = rate >= 70 ? "#2ecc71" : rate >= 50 ? "#c9a84c" : "#e74c3c";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div style={{ width: `${rate}%`, backgroundColor: color }} className="h-full rounded-full transition-all" />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color }}>{rate}%</span>
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4">
      <p className="text-[10px] tracking-[2px] uppercase text-[#c9a84c] mb-1">{label}</p>
      <p className="text-xl font-bold text-[#f0ece4]" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

type FilterMode = "all" | "year" | "month";

const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i));

function FilterBar({
  mode, year, month,
  onMode, onYear, onMonth,
}: {
  mode: FilterMode; year: string; month: string;
  onMode: (m: FilterMode) => void; onYear: (y: string) => void; onMonth: (m: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-[10px] tracking-[2px] uppercase text-[#555]">Período:</span>
      {(["all", "year", "month"] as FilterMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onMode(m)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            mode === m
              ? "bg-[#c9a84c22] text-[#c9a84c] border border-[#c9a84c44]"
              : "text-[#888] border border-[#2a2a2a] hover:text-[#f0ece4]"
          }`}
        >
          {m === "all" ? "Total" : m === "year" ? "Por Ano" : "Por Mês"}
        </button>
      ))}
      {mode === "year" && (
        <select
          value={year}
          onChange={(e) => onYear(e.target.value)}
          className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#f0ece4] text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#c9a84c44]"
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      )}
      {mode === "month" && (
        <input
          type="month"
          value={month}
          onChange={(e) => onMonth(e.target.value)}
          className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#f0ece4] text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#c9a84c44]"
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "freq-evento" | "freq-membro" | "fin-mes" | "fin-membro" | "membros";

const TABS: { id: Tab; label: string }[] = [
  { id: "freq-evento", label: "Freq. por Evento" },
  { id: "freq-membro", label: "Freq. por Membro" },
  { id: "fin-mes", label: "Fin. por Mês" },
  { id: "fin-membro", label: "Fin. por Membro" },
  { id: "membros", label: "Membros" },
];

const TYPE_MAP: Record<Tab, string> = {
  "freq-evento": "attendance-by-event",
  "freq-membro": "attendance-by-member",
  "fin-mes": "financial-by-month",
  "fin-membro": "financial-by-member",
  "membros": "members",
};

export default function RelatoriosPage() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>("freq-evento");
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = useState(now.toISOString().slice(0, 7));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData([]);
    try {
      let json: unknown[];
      if (tab === "membros") {
        const res = await fetch("/api/members");
        const raw = await res.json();
        json = Array.isArray(raw) ? raw : [];
      } else {
        const params = new URLSearchParams({ type: TYPE_MAP[tab] });
        if (filterMode === "year") params.set("year", filterYear);
        if (filterMode === "month") params.set("month", filterMonth);
        const res = await fetch(`/api/reports?${params}`);
        const raw = await res.json();
        json = Array.isArray(raw) ? raw : [];
      }
      setData(json);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [tab, filterMode, filterYear, filterMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e8c97a]" style={{ fontFamily: "var(--font-heading)" }}>
          Relatórios
        </h1>
        <p className="text-[#888] text-sm mt-1">Frequência e financeiro consolidados</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.id
                ? "bg-[#c9a84c22] text-[#c9a84c] border border-[#c9a84c33]"
                : "text-[#888] hover:text-[#f0ece4]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter */}
      <FilterBar
        mode={filterMode} year={filterYear} month={filterMonth}
        onMode={setFilterMode} onYear={setFilterYear} onMonth={setFilterMonth}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#555] text-sm">Carregando...</div>
      ) : (
        <>
          {tab === "freq-evento" && <FreqEventoTab data={data as AttendanceByEvent[]} />}
          {tab === "freq-membro" && <FreqMembroTab data={data as AttendanceByMember[]} />}
          {tab === "fin-mes" && <FinMesTab data={data as FinancialByMonth[]} />}
          {tab === "fin-membro" && <FinMembroTab data={data as FinancialByMember[]} />}
          {tab === "membros" && <MembrosTab data={data as MemberRecord[]} />}
        </>
      )}
    </div>
  );
}

// ─── Tab: Frequência por Evento ───────────────────────────────────────────────

function FreqEventoTab({ data }: { data: AttendanceByEvent[] }) {
  const withData = data.filter((e) => e.total > 0);
  const avgRate = withData.length > 0
    ? Math.round(withData.reduce((s, e) => s + (e.rate ?? 0), 0) / withData.length)
    : null;
  const best = [...withData].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card label="Total de eventos" value={data.length} />
        <Card label="Com chamada" value={withData.length} />
        <Card label="Média de presença" value={avgRate !== null ? `${avgRate}%` : "—"} />
        <Card label="Melhor evento" value={best ? `${best.rate}%` : "—"} />
      </div>

      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">Evento</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium hidden sm:table-cell">Data</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-[#2ecc71] font-medium">Pres.</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-[#e74c3c] font-medium">Aus.</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-[#c9a84c] font-medium">Just.</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">Taxa</th>
              </tr>
            </thead>
            <tbody>
              {data.map((e, i) => (
                <tr key={e.id} className={i % 2 === 0 ? "bg-[#1a1a1a]" : ""}>
                  <td className="px-4 py-3">
                    <p className="text-[#f0ece4] font-medium">{e.title}</p>
                    <p className="text-[#555] text-xs">{EVENT_LABELS[e.type] ?? e.type}</p>
                  </td>
                  <td className="px-4 py-3 text-[#888] hidden sm:table-cell">
                    {format(new Date(e.date), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-3 py-3 text-center text-[#2ecc71] font-medium">{e.present}</td>
                  <td className="px-3 py-3 text-center text-[#e74c3c] font-medium">{e.absent}</td>
                  <td className="px-3 py-3 text-center text-[#c9a84c] font-medium">{e.justified}</td>
                  <td className="px-4 py-3"><RateBar rate={e.rate} /></td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[#555]">Nenhum evento encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Tab: Frequência por Membro ───────────────────────────────────────────────

function FreqMembroTab({ data }: { data: AttendanceByMember[] }) {
  const withData = data.filter((m) => m.total > 0);
  const avgRate = withData.length > 0
    ? Math.round(withData.reduce((s, m) => s + (m.rate ?? 0), 0) / withData.length)
    : null;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card label="Membros ativos" value={data.length} />
        <Card label="Com chamadas" value={withData.length} />
        <Card label="Média de presença" value={avgRate !== null ? `${avgRate}%` : "—"} />
        <Card label="≥ 70% presença" value={data.filter((m) => (m.rate ?? 0) >= 70).length} />
      </div>

      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">Membro</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-[#2ecc71] font-medium">Pres.</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-[#e74c3c] font-medium">Aus.</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-[#c9a84c] font-medium">Just.</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">Taxa</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? "bg-[#1a1a1a]" : ""}>
                  <td className="px-4 py-3 text-[#f0ece4] font-medium">{m.name}</td>
                  <td className="px-3 py-3 text-center text-[#2ecc71] font-medium">{m.present}</td>
                  <td className="px-3 py-3 text-center text-[#e74c3c] font-medium">{m.absent}</td>
                  <td className="px-3 py-3 text-center text-[#c9a84c] font-medium">{m.justified}</td>
                  <td className="px-4 py-3"><RateBar rate={m.rate} /></td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-[#555]">Nenhum membro ativo</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Tab: Financeiro por Mês ──────────────────────────────────────────────────

function FinMesTab({ data }: { data: FinancialByMonth[] }) {
  const totalGeral = data.reduce((s, m) => s + Number(m.total), 0);
  const melhorMes = [...data].sort((a, b) => Number(b.total) - Number(a.total))[0];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card label="Total geral" value={fmt(totalGeral)} />
        <Card label="Meses registrados" value={data.length} />
        <Card label="Melhor mês" value={melhorMes ? fmt(melhorMes.total) : "—"} />
        <Card label="Média/mês" value={data.length > 0 ? fmt(totalGeral / data.length) : "—"} />
      </div>

      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">Mês</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">Total</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium hidden sm:table-cell">Dinheiro</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium hidden sm:table-cell">PIX</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">Registros</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => {
                const [yr, mo] = m.month.split("-");
                const label = format(new Date(Number(yr), Number(mo) - 1, 1), "MMMM yyyy", { locale: ptBR });
                return (
                  <tr key={m.month} className={i % 2 === 0 ? "bg-[#1a1a1a]" : ""}>
                    <td className="px-4 py-3 text-[#f0ece4] font-medium capitalize">{label}</td>
                    <td className="px-4 py-3 text-right text-[#c9a84c] font-bold">{fmt(m.total)}</td>
                    <td className="px-4 py-3 text-right text-[#888] hidden sm:table-cell">{fmt(m.cash)}</td>
                    <td className="px-4 py-3 text-right text-[#888] hidden sm:table-cell">{fmt(m.pix)}</td>
                    <td className="px-3 py-3 text-center text-[#888]">{m.count}</td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-[#555]">Nenhuma oferta registrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Tab: Financeiro por Membro ───────────────────────────────────────────────

function FinMembroTab({ data }: { data: FinancialByMember[] }) {
  const totalGeral = data.reduce((s, m) => s + Number(m.total), 0);
  const top = data[0];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card label="Total geral" value={fmt(totalGeral)} />
        <Card label="Contribuintes" value={data.length} />
        <Card label="Maior contribuição" value={top ? fmt(top.total) : "—"} />
        <Card label="Média por membro" value={data.length > 0 ? fmt(totalGeral / data.length) : "—"} />
      </div>

      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">#</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">Membro</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">Total</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium hidden sm:table-cell">Dinheiro</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium hidden sm:table-cell">PIX</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">Registros</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? "bg-[#1a1a1a]" : ""}>
                  <td className="px-4 py-3 text-[#555] text-xs">{i + 1}</td>
                  <td className="px-4 py-3 text-[#f0ece4] font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-right text-[#c9a84c] font-bold">{fmt(m.total)}</td>
                  <td className="px-4 py-3 text-right text-[#888] hidden sm:table-cell">{fmt(m.cash)}</td>
                  <td className="px-4 py-3 text-right text-[#888] hidden sm:table-cell">{fmt(m.pix)}</td>
                  <td className="px-3 py-3 text-center text-[#888]">{m.count}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[#555]">Nenhuma oferta registrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Tab: Membros ─────────────────────────────────────────────────────────────

function MembrosTab({ data }: { data: MemberRecord[] }) {
  const active = data.filter((m) => m.status === "ACTIVE");
  const inactive = data.filter((m) => m.status === "INACTIVE");
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const birthdayThisMonth = active.filter((m) => {
    if (!m.birthday) return false;
    const parts = m.birthday.split("/");
    return parts.length >= 2 && parts[1] === currentMonth;
  });
  const withPhone = active.filter((m) => m.phone);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card label="Total de membros" value={data.length} />
        <Card label="Ativos" value={active.length} />
        <Card label="Inativos" value={inactive.length} />
        <Card label={`Aniversários em ${format(now, "MMMM", { locale: ptBR })}`} value={birthdayThisMonth.length} />
      </div>

      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium hidden sm:table-cell">Aniversário</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium hidden md:table-cell">Telefone</th>
                <th className="text-center px-4 py-3 text-[10px] tracking-[2px] uppercase text-[#555] font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? "bg-[#1a1a1a]" : ""}>
                  <td className="px-4 py-3 text-[#f0ece4] font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-[#888] hidden sm:table-cell">
                    {m.birthday ?? <span className="text-[#444]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[#888] hidden md:table-cell">
                    {m.phone ?? <span className="text-[#444]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      m.status === "ACTIVE"
                        ? "bg-[#2ecc7122] text-[#2ecc71]"
                        : "bg-[#88888822] text-[#888]"
                    }`}>
                      {m.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-[#555]">Nenhum membro cadastrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {withPhone.length > 0 && (
        <p className="text-[#555] text-xs mt-3 text-right">{withPhone.length} de {active.length} ativos com telefone cadastrado</p>
      )}
    </>
  );
}
