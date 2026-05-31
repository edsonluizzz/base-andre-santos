"use client";

import { useEffect, useState } from "react";
import { Users, Heart, Scale, ShieldOff, Gauge, Phone, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  total: number;
  confirmados: number;
  negociando: number;
  neutros: number;
  adversarios: number;
  leads: number;
  inativos: number;
  scoreMedio: number;
  contactadosHoje: number;
  delta: {
    newCollaboratorsPct: number;
    newCollaboratorsAbs: number;
    confirmadosPct: number;
  };
}

export function KpiCards() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/collaborators/stats")
      .then((r) => r.ok ? r.json() : null)
      .then(setS)
      .catch(() => setS(null));
  }, []);

  if (!s) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-3 lg:p-4 border border-white/[0.06] h-[88px] lg:h-[100px] animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total",
      value: s.total,
      icon: Users,
      color: "text-slate-300",
      bg: "bg-slate-500/10",
      delta: s.delta.newCollaboratorsPct,
      deltaLabel: `${s.delta.newCollaboratorsAbs >= 0 ? "+" : ""}${s.delta.newCollaboratorsAbs} novos`,
    },
    {
      label: "Confirmados",
      value: s.confirmados,
      icon: Heart,
      color: "text-green-400",
      bg: "bg-green-500/10",
      delta: s.delta.confirmadosPct,
      deltaLabel: "vs 7d",
    },
    {
      label: "Negociando",
      value: s.negociando,
      icon: Scale,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Neutros",
      value: s.neutros,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Adversários",
      value: s.adversarios,
      icon: ShieldOff,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      label: "Score médio",
      value: `${s.scoreMedio}`,
      suffix: "/100",
      icon: Gauge,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Contactados hoje",
      value: s.contactadosHoje,
      icon: Phone,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
  ];

  // 6 visíveis padrão; Contactados hoje aparece só >= 7º (lg+ tem 7 cols quando habilitado).
  // Mantenho 6 cards (sem Contactados Hoje) pra grid limpo.
  const VISIBLE = cards.slice(0, 6);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
      {VISIBLE.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="glass-card rounded-2xl p-3 lg:p-4 border border-white/[0.06] relative overflow-hidden touchable tap-transparent"
          >
            <div className="flex items-center justify-between mb-1.5 lg:mb-2">
              <div className={cn("w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center", c.bg)}>
                <Icon className={cn("w-3.5 h-3.5 lg:w-4 lg:h-4", c.color)} />
              </div>
              {typeof c.delta === "number" && <DeltaPill pct={c.delta} />}
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none mb-1">
              {c.label}
            </p>
            <div className="flex items-baseline gap-0.5">
              <span className={cn("text-xl lg:text-2xl font-bold leading-none", c.color)}>
                {typeof c.value === "number" ? c.value.toLocaleString("pt-BR") : c.value}
              </span>
              {c.suffix && <span className="text-[10px] text-muted-foreground">{c.suffix}</span>}
            </div>
            {c.deltaLabel && (
              <p className="text-[9px] text-muted-foreground/70 mt-1 truncate">{c.deltaLabel}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DeltaPill({ pct }: { pct: number }) {
  const positive = pct > 0;
  const negative = pct < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const color = positive ? "text-green-400" : negative ? "text-red-400" : "text-muted-foreground";
  const bg = positive ? "bg-green-500/10" : negative ? "bg-red-500/10" : "bg-white/[0.04]";
  return (
    <span className={cn("flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full", color, bg)}>
      <Icon className="w-2.5 h-2.5" />
      {positive ? "+" : ""}{pct}%
    </span>
  );
}
