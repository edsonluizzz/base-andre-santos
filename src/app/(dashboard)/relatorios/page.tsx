"use client";

import { useState, useEffect, useCallback } from "react";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/context/permissions-context";
import { PlanGate } from "@/components/plan-gate";

// ─── Safe date format ─────────────────────────────────────────────────────────

function safeFormat(dateStr: string | Date, fmt: string): string {
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (!isValid(d)) return String(dateStr).slice(0, 10);
    return format(d, fmt, { locale: ptBR });
  } catch {
    return String(dateStr).slice(0, 10);
  }
}

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
type FinancialByMonth = { month: string; income: number; cash: number; pix: number; count: number; expenses: number; result: number };
type FinancialByMember = { id: string; name: string; total: number; cash: number; pix: number; count: number };

const EVENT_LABELS: Record<string, string> = {
  CULTO: "Culto", ENSAIO: "Ensaio", REUNIAO: "Reunião", RETIRO: "Retiro", OUTRO: "Outro",
};

const fmt = (v: number | string | null | undefined) =>
  `R$ ${Number(v ?? 0).toFixed(2).replace(".", ",")}`;

// ─── Rate bar ─────────────────────────────────────────────────────────────────

function RateBar({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-muted-foreground/40 text-xs">Sem dados</span>;
  const color = rate >= 70 ? "#22c55e" : rate >= 50 ? "#d4a843" : "#ef4444";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div style={{ width: `${rate}%`, backgroundColor: color }} className="h-full rounded-full transition-all" />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color }}>{rate}%</span>
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 print:border-gray-300 print:bg-white">
      <p className="text-[10px] tracking-[2px] uppercase text-primary mb-1 print:text-gray-500">{label}</p>
      <p className="text-xl font-bold text-foreground print:text-black">{value}</p>
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
    <div className="flex flex-wrap items-center gap-2 mb-6 no-print">
      <span className="text-[10px] tracking-[2px] uppercase text-muted-foreground/60">Período:</span>
      {(["all", "year", "month"] as FilterMode[]).map((fm) => (
        <button
          key={fm}
          onClick={() => onMode(fm)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            mode === fm
              ? "bg-primary/10 text-primary border border-primary/25"
              : "text-muted-foreground border border-border hover:text-foreground"
          }`}
        >
          {fm === "all" ? "Total" : fm === "year" ? "Por Ano" : "Por Mês"}
        </button>
      ))}
      {mode === "year" && (
        <select
          value={year}
          onChange={(e) => onYear(e.target.value)}
          className="bg-card border border-border text-foreground text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary/25"
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      )}
      {mode === "month" && (
        <input
          type="month"
          value={month}
          onChange={(e) => onMonth(e.target.value)}
          className="bg-card border border-border text-foreground text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary/25"
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
  { id: "fin-mes", label: "Extrato Mensal" },
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

// Print-friendly period label
function periodLabel(mode: FilterMode, year: string, month: string): string {
  if (mode === "month") return safeFormat(`${month}-01`, "MMMM 'de' yyyy");
  if (mode === "year") return year;
  return "Todo o período";
}

export default function RelatoriosPage() {
  const now = new Date();
  const { canView } = usePermissions();
  const visibleTabs = TABS.filter((t) =>
    (t.id === "fin-mes" || t.id === "fin-membro") ? canView("FINANCIAL") : true
  );
  const [tab, setTab] = useState<Tab>("freq-evento");
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = useState(now.toISOString().slice(0, 7));

  // Se a tab ativa for financeira e sem permissão, resetar para a primeira disponível
  useEffect(() => {
    if ((tab === "fin-mes" || tab === "fin-membro") && !canView("FINANCIAL")) {
      setTab(visibleTabs[0]?.id ?? "freq-evento");
    }
  }, [canView, tab, visibleTabs]);

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
        if (!res.ok) { setData([]); setLoading(false); return; }
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

  const currentTabLabel = TABS.find((t) => t.id === tab)?.label ?? "";

  return (
    <PlanGate feature="Relatórios">
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
          th { background: #f5f5f5 !important; color: #333 !important; }
          td { color: #111 !important; background: white !important; }
          th.hidden, td.hidden { display: table-cell !important; }
          [class*="sm:table-cell"] { display: table-cell !important; }
          [class*="md:table-cell"] { display: table-cell !important; }
          .print\\:text-black { color: black !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          .print\\:text-gray-500 { color: #6b7280 !important; }
          .print-header { display: block !important; }
        }
        .print-header { display: none; }
      ` }} />

      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground print:text-black">
              Relatórios
            </h1>
            <p className="text-muted-foreground text-sm mt-1 print:text-gray-500">Frequência e financeiro consolidados</p>
          </div>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 text-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Exportar PDF
          </button>
        </div>

        {/* Print header (visible only when printing) */}
        <div className="print-header mb-4">
          <p className="text-gray-500 text-sm">
            {currentTabLabel} · {periodLabel(filterMode, filterYear, filterMonth)} · {safeFormat(now, "dd/MM/yyyy")}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-secondary/50 border border-border rounded-xl p-1 flex-wrap no-print">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter — hidden for membros tab */}
        {tab !== "membros" && (
          <FilterBar
            mode={filterMode} year={filterYear} month={filterMonth}
            onMode={setFilterMode} onYear={setFilterYear} onMonth={setFilterMonth}
          />
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          </div>
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
    </>
    </PlanGate>
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

      <div className="bg-card border border-border rounded-xl overflow-hidden print:border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border print:border-gray-300">
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium print:text-gray-500">Evento</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium hidden sm:table-cell print:text-gray-500">Data</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-success font-medium">Pres.</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-destructive font-medium">Aus.</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-primary font-medium">Just.</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium print:text-gray-500">Taxa</th>
              </tr>
            </thead>
            <tbody>
              {data.map((e, i) => (
                <tr key={e.id} className={i % 2 === 0 ? "bg-card print:bg-gray-50" : "print:bg-white"}>
                  <td className="px-4 py-3">
                    <p className="text-foreground font-medium print:text-black">{e.title}</p>
                    <p className="text-muted-foreground/60 text-xs print:text-gray-500">{EVENT_LABELS[e.type] ?? e.type}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell print:text-gray-600">
                    {safeFormat(e.date, "dd/MM/yyyy")}
                  </td>
                  <td className="px-3 py-3 text-center text-success font-medium print:text-green-700">{e.present}</td>
                  <td className="px-3 py-3 text-center text-destructive font-medium print:text-red-700">{e.absent}</td>
                  <td className="px-3 py-3 text-center text-primary font-medium print:text-gray-700">{e.justified}</td>
                  <td className="px-4 py-3">
                    <span className="print:text-black">{e.rate !== null ? `${e.rate}%` : "—"}</span>
                    <span className="no-print"><RateBar rate={e.rate} /></span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground/60">Nenhum evento encontrado</td></tr>
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

      <div className="bg-card border border-border rounded-xl overflow-hidden print:border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border print:border-gray-300">
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium print:text-gray-500">Membro</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-success font-medium">Pres.</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-destructive font-medium">Aus.</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-primary font-medium">Just.</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium print:text-gray-500">Taxa</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? "bg-card print:bg-gray-50" : "print:bg-white"}>
                  <td className="px-4 py-3 text-foreground font-medium print:text-black">{m.name}</td>
                  <td className="px-3 py-3 text-center text-success font-medium print:text-green-700">{m.present}</td>
                  <td className="px-3 py-3 text-center text-destructive font-medium print:text-red-700">{m.absent}</td>
                  <td className="px-3 py-3 text-center text-primary font-medium print:text-gray-700">{m.justified}</td>
                  <td className="px-4 py-3">
                    <span className="print:text-black">{m.rate !== null ? `${m.rate}%` : "—"}</span>
                    <span className="no-print"><RateBar rate={m.rate} /></span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground/60">Nenhum membro ativo</td></tr>
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
  const totalIncome   = data.reduce((s, m) => s + Number(m.income), 0);
  const totalExpenses = data.reduce((s, m) => s + Number(m.expenses), 0);
  const totalResult   = totalIncome - totalExpenses;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card label="Total receitas" value={fmt(totalIncome)} />
        <Card label="Total despesas" value={fmt(totalExpenses)} />
        <Card label="Resultado geral" value={fmt(totalResult)} />
        <Card label="Meses com movimento" value={data.length} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden print:border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border print:border-gray-300">
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium print:text-gray-500">Mês</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-success font-medium">Receitas</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-destructive font-medium">Despesas</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium print:text-gray-500">Resultado</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium hidden sm:table-cell print:text-gray-500">Dinheiro</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium hidden sm:table-cell print:text-gray-500">PIX</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => {
                const label = safeFormat(`${m.month}-01`, "MMMM yyyy");
                const result = Number(m.income) - Number(m.expenses);
                return (
                  <tr key={m.month} className={i % 2 === 0 ? "bg-card print:bg-gray-50" : "print:bg-white"}>
                    <td className="px-4 py-3 text-foreground font-medium capitalize print:text-black">{label}</td>
                    <td className="px-4 py-3 text-right text-success font-bold print:text-green-700">{fmt(m.income)}</td>
                    <td className="px-4 py-3 text-right text-destructive font-medium print:text-red-700">{fmt(m.expenses)}</td>
                    <td className={`px-4 py-3 text-right font-bold print:text-black ${result >= 0 ? "text-success" : "text-destructive"}`}>
                      {result >= 0 ? "+" : ""}{fmt(result)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell print:text-gray-600">{fmt(m.cash)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell print:text-gray-600">{fmt(m.pix)}</td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground/60">Nenhum movimento registrado</td></tr>
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
  const top = data[0] ?? null;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card label="Total geral" value={fmt(totalGeral)} />
        <Card label="Contribuintes" value={data.length} />
        <Card label="Maior contribuição" value={top ? fmt(top.total) : "—"} />
        <Card label="Média por membro" value={data.length > 0 ? fmt(totalGeral / data.length) : "—"} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden print:border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border print:border-gray-300">
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium print:text-gray-500">#</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium print:text-gray-500">Membro</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium print:text-gray-500">Total</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium hidden sm:table-cell print:text-gray-500">Dinheiro</th>
                <th className="text-right px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium hidden sm:table-cell print:text-gray-500">PIX</th>
                <th className="text-center px-3 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium print:text-gray-500">Registros</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? "bg-card print:bg-gray-50" : "print:bg-white"}>
                  <td className="px-4 py-3 text-muted-foreground/60 text-xs print:text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 text-foreground font-medium print:text-black">{m.name}</td>
                  <td className="px-4 py-3 text-right text-primary font-bold print:text-black">{fmt(m.total)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell print:text-gray-600">{fmt(m.cash)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell print:text-gray-600">{fmt(m.pix)}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground print:text-gray-600">{m.count}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground/60">Nenhuma oferta registrada</td></tr>
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
        <Card label={`Aniversários em ${safeFormat(now, "MMMM")}`} value={birthdayThisMonth.length} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden print:border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border print:border-gray-300">
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium print:text-gray-500">Nome</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium hidden sm:table-cell print:text-gray-500">Aniversário</th>
                <th className="text-left px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium hidden md:table-cell print:text-gray-500">Telefone</th>
                <th className="text-center px-4 py-3 text-[10px] tracking-[2px] uppercase text-muted-foreground/60 font-medium print:text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? "bg-card print:bg-gray-50" : "print:bg-white"}>
                  <td className="px-4 py-3 text-foreground font-medium print:text-black">{m.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell print:text-gray-600">
                    {m.birthday ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell print:text-gray-600">
                    {m.phone ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      m.status === "ACTIVE"
                        ? "bg-success/10 text-success print:text-green-700 print:bg-transparent"
                        : "bg-secondary text-muted-foreground print:text-gray-500 print:bg-transparent"
                    }`}>
                      {m.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground/60">Nenhum membro cadastrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {withPhone.length > 0 && (
        <p className="text-muted-foreground/60 text-xs mt-3 text-right">{withPhone.length} de {active.length} ativos com telefone cadastrado</p>
      )}
    </>
  );
}
