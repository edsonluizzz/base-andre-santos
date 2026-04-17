"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Users, RefreshCw } from "lucide-react";

type Metrics = {
  summary: {
    total: number; free: number; trialing: number; proActive: number;
    pastDue: number; canceled: number; cancelingSoon: number; suspended: number; totalMembers: number;
  };
  financial: { mrr: number; arr: number; conversionRate: number; churnRate: number };
  growth: { label: string; count: number }[];
  nurturing: { step: number; count: number }[];
};

const NURTURING_LABELS = ["Novos (step 0)", "Day 1 enviado", "Day 3 enviado", "Day 7 enviado"];

export function MetricsPanel() {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/super-admin/metrics");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="space-y-3 mb-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="glass-card p-4 h-32 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { summary, financial, growth, nurturing } = data;
  const maxGrowth = Math.max(...growth.map((w) => w.count), 1);

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <BarChart2 className="w-4 h-4" /> Métricas do Negócio
        </h2>
        <button
          onClick={load}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4 border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <p className="text-xs text-muted-foreground">MRR</p>
          </div>
          <p className="text-xl font-bold text-emerald-400">
            R$ {financial.mrr.toFixed(2).replace(".", ",")}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            ARR: R$ {financial.arr.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          </p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <p className="text-xs text-muted-foreground">Conversão Trial→PRO</p>
          </div>
          <p className="text-xl font-bold text-foreground">{financial.conversionRate}%</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            {summary.trialing} em trial · {summary.proActive} ativos
          </p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <p className="text-xs text-muted-foreground">Churn</p>
          </div>
          <p className={`text-xl font-bold ${financial.churnRate > 10 ? "text-red-400" : "text-foreground"}`}>
            {financial.churnRate}%
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            {summary.canceled} cancelados · {summary.cancelingSoon} cancelando
          </p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs text-muted-foreground">Total Membros</p>
          </div>
          <p className="text-xl font-bold text-foreground">{summary.totalMembers}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            em {summary.total} congregações
          </p>
        </div>
      </div>

      {/* Growth chart + Nurturing funnel side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Weekly growth bar chart */}
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-4">Novos cadastros (últimas 8 semanas)</p>
          <div className="flex items-end gap-1.5 h-20">
            {growth.map((week) => (
              <div key={week.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-muted-foreground font-mono">
                  {week.count > 0 ? week.count : ""}
                </span>
                <div
                  className="w-full rounded-t-sm bg-primary/60 hover:bg-primary transition-colors"
                  style={{ height: `${Math.max((week.count / maxGrowth) * 60, week.count > 0 ? 4 : 2)}px` }}
                  title={`${week.count} cadastro${week.count !== 1 ? "s" : ""}`}
                />
                <span className="text-[9px] text-muted-foreground">{week.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-3">
            Total no período: {growth.reduce((s, w) => s + w.count, 0)} congregações
          </p>
        </div>

        {/* Nurturing funnel */}
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-4">Funil de nurturing</p>
          <div className="space-y-2.5">
            {nurturing.map(({ step, count }) => {
              const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
              return (
                <div key={step}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground">{NURTURING_LABELS[step]}</span>
                    <span className="text-[11px] font-medium text-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-3">
            {summary.total - nurturing[3]?.count} ainda não completaram a sequência
          </p>
        </div>
      </div>

      {/* Funnel status row */}
      <div className="glass-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Funil de conversão</p>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "Total", value: summary.total, color: "text-foreground" },
            { label: "FREE", value: summary.free, color: "text-muted-foreground" },
            { label: "Trial", value: summary.trialing, color: "text-indigo-400" },
            { label: "PRO Ativo", value: summary.proActive, color: "text-emerald-400" },
            { label: "Pgto Pendente", value: summary.pastDue, color: "text-amber-400" },
            { label: "Cancelados", value: summary.canceled, color: "text-red-400" },
            { label: "Suspensos", value: summary.suspended, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-1.5 pr-3 border-r border-border last:border-0">
              <span className="text-[11px] text-muted-foreground">{label}</span>
              <span className={`text-sm font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
