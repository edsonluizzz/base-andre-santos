"use client";

import { useState, useEffect, useMemo } from "react";
import { Target, TrendingUp, Users, CheckCircle2, AlertTriangle, MapPin, Clock, Swords, ChevronDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { addWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import depEstaduais from "@/data/eleitos-2022/dep-estaduais.json";

type Goal = {
  id: string;
  city: string;
  targetVotes: number;
  targetLeaders: number;
};

type CityAgg = {
  ativos: number;
  confirmados: number;
  hasLeader: boolean;
};

type Municipio = { codigo: string; municipio: string; votos: number };

interface Props {
  goals: Goal[];
  cityAgg: Record<string, CityAgg>;
  weeklyGrowthMap: Record<string, number>;
}

// Todos os deputados estaduais para o seletor
const RIVAIS = (depEstaduais as { nomeUrna: string; partido: string; votos: number }[])
  .sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"));

export function MetasClient({ goals, cityAgg, weeklyGrowthMap }: Props) {
  const [rivalName, setRivalName] = useState<string>("");
  const [rivalMap, setRivalMap] = useState<Record<string, number>>({});
  const [rivalLoading, setRivalLoading] = useState(false);

  // Inicializa rival salvo no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("metas-rival");
      if (saved) setRivalName(saved);
    } catch {}
  }, []);

  // Busca dados do rival ao mudar a seleção
  useEffect(() => {
    if (!rivalName) { setRivalMap({}); return; }
    let cancelled = false;
    setRivalLoading(true);
    fetch(`/api/eleitos/municipios?cargo=estadual&nome=${encodeURIComponent(rivalName)}`)
      .then((r) => r.json())
      .then((data: Municipio[]) => {
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const m of data ?? []) {
          map[m.municipio.toLowerCase().trim()] = m.votos;
        }
        setRivalMap(map);
      })
      .catch(() => { if (!cancelled) setRivalMap({}); })
      .finally(() => { if (!cancelled) setRivalLoading(false); });
    return () => { cancelled = true; };
  }, [rivalName]);

  function handleRivalChange(name: string) {
    setRivalName(name);
    try { localStorage.setItem("metas-rival", name); } catch {}
  }

  // Projeção de tempo para atingir meta
  function projection(city: string, targetVotes: number): { label: string; color: string } {
    const current = cityAgg[city]?.ativos ?? 0;
    const remaining = targetVotes - current;
    if (remaining <= 0) return { label: "Meta atingida!", color: "text-green-400" };
    const rate = weeklyGrowthMap[city] ?? 0;
    if (rate <= 0) return { label: "Sem crescimento", color: "text-red-400/70" };
    const weeks = Math.ceil(remaining / rate);
    const date = addWeeks(new Date(), weeks);
    const label = weeks <= 4
      ? `~${weeks} sem. (${format(date, "dd/MM", { locale: ptBR })})`
      : `~${Math.ceil(weeks / 4)} meses (${format(date, "MM/yyyy", { locale: ptBR })})`;
    const color = weeks <= 8 ? "text-green-400" : weeks <= 20 ? "text-amber-400" : "text-red-400/80";
    return { label, color };
  }

  const totalGoalVotes   = goals.reduce((s, g) => s + g.targetVotes, 0);
  const totalGoalLeaders = goals.reduce((s, g) => s + g.targetLeaders, 0);
  const totalConfirmados = Object.values(cityAgg).reduce((s, a) => s + a.confirmados, 0);
  const citiesWithLeader = Object.values(cityAgg).filter((a) => a.hasLeader).length;
  const growing          = Object.values(weeklyGrowthMap).filter((v) => v > 0).length;

  // Info do rival selecionado
  const rivalInfo = useMemo(() => RIVAIS.find((r) => r.nomeUrna === rivalName), [rivalName]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Metas por Município</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Meta × realizado por cidade — configure em{" "}
            <Link href="/configuracoes" className="text-primary hover:underline">/configuracoes</Link>
          </p>
        </div>

        {/* Seletor de adversário */}
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
            <Swords className="w-3 h-3" /> Comparar com adversário
          </label>
          <div className="relative">
            <select
              value={rivalName}
              onChange={(e) => handleRivalChange(e.target.value)}
              className="w-full appearance-none text-sm bg-white/[0.04] border border-white/[0.12] rounded-lg px-3 py-2 pr-8 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="">— Nenhum —</option>
              {RIVAIS.map((r) => (
                <option key={r.nomeUrna} value={r.nomeUrna}>
                  {r.nomeUrna} ({r.partido})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          {rivalInfo && (
            <p className="text-[10px] text-muted-foreground">
              {rivalInfo.votos.toLocaleString("pt-BR")} votos totais em 2022
            </p>
          )}
        </div>
      </div>

      {/* KPIs globais */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Municípios com meta",   value: goals.length,                                         icon: Target,       color: "text-primary"    },
          { label: "Meta total de votos",   value: totalGoalVotes.toLocaleString("pt-BR"),               icon: TrendingUp,   color: "text-blue-400"   },
          { label: "Confirmados agora",     value: totalConfirmados,                                     icon: CheckCircle2, color: "text-green-400"  },
          { label: "Cidades com liderança", value: citiesWithLeader,                                     icon: Users,        color: "text-purple-400" },
          { label: "Crescendo (30d)",       value: growing,                                              icon: Clock,        color: "text-amber-400"  },
        ].map((k) => (
          <div key={k.label} className="glass-card rounded-2xl p-5 border border-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{k.label}</span>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Banner do rival selecionado */}
      {rivalName && rivalInfo && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
          <Swords className="w-4 h-4 text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground">{rivalName}</span>
            <span className="text-xs text-muted-foreground ml-2">({rivalInfo.partido}) · {rivalInfo.votos.toLocaleString("pt-BR")} votos em 2022</span>
          </div>
          {rivalLoading && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
          <button
            onClick={() => handleRivalChange("")}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            limpar
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/[0.08]">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhuma meta cadastrada</p>
          <p className="text-xs text-muted-foreground mt-1">
            Configure as metas por município em{" "}
            <Link href="/configuracoes" className="text-primary hover:underline">Configurações</Link>
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">{goals.length} município{goals.length !== 1 ? "s" : ""} com metas definidas</h2>
            <span className="ml-auto text-[10px] text-muted-foreground">Meta líderes total: {totalGoalLeaders}</span>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {goals.map((g) => {
              const real = cityAgg[g.city] ?? { ativos: 0, confirmados: 0, hasLeader: false };
              const votePct = g.targetVotes > 0 ? Math.min(100, Math.round((real.confirmados / g.targetVotes) * 100)) : 0;
              const leaderOk = g.targetLeaders === 0 || real.hasLeader;
              const status: "ok" | "warn" | "danger" = votePct >= 100 ? "ok" : votePct >= 50 ? "warn" : "danger";
              const barColor  = status === "ok" ? "bg-green-500/70" : status === "warn" ? "bg-amber-500/70" : "bg-red-500/50";
              const textColor = status === "ok" ? "text-green-400"  : status === "warn" ? "text-amber-400"  : "text-red-400";

              // Dados do rival para esta cidade
              const rivalKey   = g.city.toLowerCase().trim();
              const rivalVotos = rivalMap[rivalKey] ?? 0;
              const cobertura  = rivalVotos > 0 ? (real.ativos / rivalVotos) * 100 : null;
              const cobPrioridade =
                cobertura === null ? null :
                cobertura === 0   ? "critica" :
                cobertura < 1     ? "alta"    :
                cobertura < 3     ? "media"   : "ok";

              return (
                <div key={g.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      {leaderOk
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <p className="text-sm font-medium text-foreground">{g.city}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${textColor}`}>
                        {real.confirmados} <span className="text-muted-foreground font-normal text-xs">/ {g.targetVotes} votos</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">{real.ativos} ativo{real.ativos !== 1 ? "s" : ""} · {real.hasLeader ? "com liderança" : "sem liderança"}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Confirmados vs meta</span>
                      <span className={textColor}>{votePct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${votePct}%` }} />
                    </div>

                    {/* Projeção */}
                    {(() => {
                      const proj = projection(g.city, g.targetVotes);
                      const rate = weeklyGrowthMap[g.city] ?? 0;
                      return (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground/60 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {rate > 0 ? `+${rate.toFixed(1)}/sem` : "sem atividade"}
                          </span>
                          <span className={proj.color}>{proj.label}</span>
                        </div>
                      );
                    })()}

                    {/* Comparação com rival (dinâmica) */}
                    {rivalName && !rivalLoading && rivalVotos > 0 && (
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/[0.04] mt-1">
                        <span className="flex items-center gap-1 text-muted-foreground/60">
                          <Swords className="w-2.5 h-2.5" />
                          {rivalName} 2022: {rivalVotos.toLocaleString("pt-BR")} votos
                        </span>
                        <span className={
                          cobPrioridade === "critica" ? "text-red-400 font-semibold" :
                          cobPrioridade === "alta"    ? "text-amber-400 font-semibold" :
                          cobPrioridade === "media"   ? "text-yellow-400" :
                                                        "text-green-400"
                        }>
                          {cobertura !== null ? `${cobertura.toFixed(1)}% cobertura` : "—"}
                          {cobPrioridade === "critica" && " · Zona cega"}
                          {cobPrioridade === "alta"    && " · Prioridade alta"}
                          {cobPrioridade === "media"   && " · Atenção"}
                          {cobPrioridade === "ok"      && " · OK"}
                        </span>
                      </div>
                    )}

                    {/* Sem rival selecionado: placeholder sutil */}
                    {!rivalName && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/30 pt-0.5">
                        <Swords className="w-2.5 h-2.5" />
                        <span>Selecione um adversário para comparar cobertura</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
