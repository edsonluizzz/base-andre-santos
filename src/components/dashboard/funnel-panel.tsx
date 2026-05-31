"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

type FunnelData = {
  total: number;
  leads: number;
  ativos: number;
  confirmados: number;
  inativos: number;
};

export function FunnelPanel() {
  const [data, setData] = useState<FunnelData | null>(null);

  useEffect(() => {
    fetch("/api/collaborators?status=ALL")
      .then((r) => r.json())
      .then((res) => {
        const all: Array<{ status: string; supportStatus: string }> = res.data ?? res;
        return all;
      })
      .then((all) => {
        const total = all.length;
        const leads = all.filter((c) => c.status === "LEAD").length;
        const ativos = all.filter((c) => c.status === "ACTIVE").length;
        const inativos = all.filter((c) => c.status === "INACTIVE").length;
        const confirmados = all.filter((c) => c.supportStatus === "CONFIRMADO").length;
        setData({ total, leads, ativos, confirmados, inativos });
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const steps = [
    { label: "Contatos cadastrados", value: data.total, color: "bg-primary/60", pct: 100 },
    { label: "Ativos",              value: data.ativos,      color: "bg-blue-500/70",  pct: data.total > 0 ? Math.round((data.ativos / data.total) * 100) : 0 },
    { label: "Confirmados",         value: data.confirmados, color: "bg-green-500/70", pct: data.total > 0 ? Math.round((data.confirmados / data.total) * 100) : 0 },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/[0.08]">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Base · Status atual</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">{data.leads} lead{data.leads !== 1 ? "s" : ""} · {data.inativos} inativo{data.inativos !== 1 ? "s" : ""}</span>
      </div>
      <div className="space-y-3">
        {steps.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="text-foreground font-medium">{s.value} <span className="text-muted-foreground font-normal">({s.pct}%)</span></span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
