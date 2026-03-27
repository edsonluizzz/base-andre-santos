"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

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

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

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

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "freq-evento" | "freq-membro" | "fin-mes" | "fin-membro";

const TABS: { id: Tab; label: string }[] = [
  { id: "freq-evento", label: "Freq. por Evento" },
  { id: "freq-membro", label: "Freq. por Membro" },
  { id: "fin-mes", label: "Fin. por Mês" },
  { id: "fin-membro", label: "Fin. por Membro" },
];

const TYPE_MAP: Record<Tab, string> = {
  "freq-evento": "attendance-by-event",
  "freq-membro": "attendance-by-member",
  "fin-mes": "financial-by-month",
  "fin-membro": "financial-by-member",
};

export default function RelatoriosPage() {
  const [tab, setTab] = useState<Tab>("freq-evento");
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<Set<Tab>>(new Set());

  const fetchTab = useCallback(async (t: Tab) => {
    if (loaded.has(t)) return;
    setLoading(true);
    const res = await fetch(`/api/reports?type=${TYPE_MAP[t]}`);
    const json = await res.json();
    setData(json);
    setLoaded((prev) => new Set(prev).add(t));
    setLoading(false);
  }, [loaded]);

  useEffect(() => {
    setData([]);
    fetchTab(tab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e8c97a]" style={{ fontFamily: "var(--font-heading)" }}>
          Relatórios
        </h1>
        <p className="text-[#888] text-sm mt-1">Frequência e financeiro consolidados</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 flex-wrap">
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

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#555] text-sm">Carregando...</div>
      ) : (
        <>
          {tab === "freq-evento" && <FreqEventoTab data={data as AttendanceByEvent[]} />}
          {tab === "freq-membro" && <FreqMembroTab data={data as AttendanceByMember[]} />}
          {tab === "fin-mes" && <FinMesTab data={data as FinancialByMonth[]} />}
          {tab === "fin-membro" && <FinMembroTab data={data as FinancialByMember[]} />}
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
  const best = withData.sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];

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
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[#555]">Nenhum evento cadastrado</td></tr>
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
  const totalGeral = data.reduce((s, m) => s + m.total, 0);
  const melhorMes = data[0];

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
                const [year, month] = m.month.split("-");
                const label = format(new Date(Number(year), Number(month) - 1, 1), "MMMM yyyy", { locale: ptBR });
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
  const totalGeral = data.reduce((s, m) => s + m.total, 0);
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
