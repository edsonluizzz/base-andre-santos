"use client";

import { useState, useEffect, useMemo } from "react";
import { Target, TrendingUp, Users, CheckCircle2, AlertTriangle, MapPin, Clock, Swords, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { addWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import depEstaduais from "@/data/eleitos-2022/dep-estaduais.json";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Goal = { id: string; city: string; targetVotes: number; targetLeaders: number };
type CityAgg = { ativos: number; confirmados: number; hasLeader: boolean };
type Municipio = { codigo: string; municipio: string; votos: number };
type SortKey = "cidade" | "meta_pct" | "cobertura" | "ativos";
type SortDir = "asc" | "desc";

interface Props {
  goals: Goal[];
  cityAgg: Record<string, CityAgg>;
  weeklyGrowthMap: Record<string, number>;
}

const RIVAIS = (depEstaduais as { nomeUrna: string; partido: string; votos: number }[])
  .sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"));

export function MetasClient({ goals, cityAgg, weeklyGrowthMap }: Props) {
  const [rivalName, setRivalName]   = useState<string>("");
  const [rivalMap, setRivalMap]     = useState<Record<string, number>>({});
  const [rivalLoading, setRivalLoading] = useState(false);
  const [sortKey, setSortKey]       = useState<SortKey>("cidade");
  const [sortDir, setSortDir]       = useState<SortDir>("asc");

  // Inicializa rival salvo no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("metas-rival");
      if (saved) setRivalName(saved);
    } catch {}
  }, []);

  // Busca dados do rival
  useEffect(() => {
    if (!rivalName) { setRivalMap({}); return; }
    let cancelled = false;
    setRivalLoading(true);
    fetch(`/api/eleitos/municipios?cargo=estadual&nome=${encodeURIComponent(rivalName)}`)
      .then((r) => r.json())
      .then((data: Municipio[]) => {
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const m of data ?? []) map[m.municipio.toLowerCase().trim()] = m.votos;
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

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // cobertura: mais urgente primeiro por padrão (asc); resto: desc
      setSortDir(key === "cobertura" || key === "cidade" ? "asc" : "desc");
    }
  }

  function projection(city: string, targetVotes: number): { label: string; color: string } {
    const current   = cityAgg[city]?.ativos ?? 0;
    const remaining = targetVotes - current;
    if (remaining <= 0) return { label: "Meta atingida!", color: "text-green-400" };
    const rate = weeklyGrowthMap[city] ?? 0;
    if (rate <= 0) return { label: "Sem crescimento", color: "text-red-400/70" };
    const weeks = Math.ceil(remaining / rate);
    const date  = addWeeks(new Date(), weeks);
    const label = weeks <= 4
      ? `~${weeks} sem. (${format(date, "dd/MM", { locale: ptBR })})`
      : `~${Math.ceil(weeks / 4)} meses (${format(date, "MM/yyyy", { locale: ptBR })})`;
    const color = weeks <= 8 ? "text-green-400" : weeks <= 20 ? "text-amber-400" : "text-red-400/80";
    return { label, color };
  }

  // Enriquece cada goal com valores derivados (para sort + render)
  const enriched = useMemo(() => goals.map((g) => {
    const real       = cityAgg[g.city] ?? { ativos: 0, confirmados: 0, hasLeader: false };
    const votePct    = g.targetVotes > 0 ? Math.min(100, (real.confirmados / g.targetVotes) * 100) : 0;
    const rivalKey   = g.city.toLowerCase().trim();
    const rivalVotos = rivalMap[rivalKey] ?? 0;
    const cobertura  = rivalVotos > 0 ? (real.ativos / rivalVotos) * 100 : -1; // -1 = sem rival
    return { g, real, votePct, rivalVotos, cobertura };
  }), [goals, cityAgg, rivalMap]);

  // Ordena a lista
  const sorted = useMemo(() => {
    const mult = sortDir === "asc" ? 1 : -1;
    return [...enriched].sort((a, b) => {
      switch (sortKey) {
        case "cidade":
          return mult * a.g.city.localeCompare(b.g.city, "pt-BR");
        case "meta_pct":
          return mult * (a.votePct - b.votePct);
        case "cobertura":
          // cidades sem rival ficam sempre por último
          if (a.cobertura < 0 && b.cobertura < 0) return 0;
          if (a.cobertura < 0) return 1;
          if (b.cobertura < 0) return -1;
          return mult * (a.cobertura - b.cobertura);
        case "ativos":
          return mult * (a.real.ativos - b.real.ativos);
        default:
          return 0;
      }
    });
  }, [enriched, sortKey, sortDir]);

  const totalGoalVotes   = goals.reduce((s, g) => s + g.targetVotes, 0);
  const totalGoalLeaders = goals.reduce((s, g) => s + g.targetLeaders, 0);
  const totalConfirmados = Object.values(cityAgg).reduce((s, a) => s + a.confirmados, 0);
  const citiesWithLeader = Object.values(cityAgg).filter((a) => a.hasLeader).length;
  const growing          = Object.values(weeklyGrowthMap).filter((v) => v > 0).length;
  const rivalInfo        = useMemo(() => RIVAIS.find((r) => r.nomeUrna === rivalName), [rivalName]);

  // Chip de ordenação reutilizável
  function SortChip({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <button
        onClick={() => handleSort(k)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
          active
            ? "bg-primary/10 text-primary border-primary/30"
            : "bg-white/[0.03] text-muted-foreground border-white/[0.08] hover:border-white/[0.15] hover:text-foreground"
        }`}
      >
        {label}
        <Icon className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="page-header">
          <h1 className="text-xl lg:text-2xl font-bold gradient-title flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" /> Metas por Município
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Meta × realizado por cidade — configure em{" "}
            <Link href="/configuracoes" className="text-primary hover:underline">/configuracoes</Link>
          </p>
        </div>

        {/* Seletor de adversário */}
        <div className="flex flex-col gap-1.5 min-w-[240px]">
          <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
            <Swords className="w-3 h-3" /> Comparar com adversário
          </label>
          <Select value={rivalName || "__none__"} onValueChange={(v) => handleRivalChange(v === "__none__" ? "" : v)}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.12] text-sm h-9">
              <SelectValue placeholder="Selecionar adversário..." />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__none__">— Nenhum —</SelectItem>
              {RIVAIS.map((r) => (
                <SelectItem key={r.nomeUrna} value={r.nomeUrna}>
                  {r.nomeUrna} <span className="text-muted-foreground">({r.partido})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          { label: "Municípios com meta",   value: goals.length,                           icon: Target,       color: "text-primary"    },
          { label: "Meta total de votos",   value: totalGoalVotes.toLocaleString("pt-BR"), icon: TrendingUp,   color: "text-blue-400"   },
          { label: "Confirmados agora",     value: totalConfirmados,                       icon: CheckCircle2, color: "text-green-400"  },
          { label: "Cidades com liderança", value: citiesWithLeader,                       icon: Users,        color: "text-purple-400" },
          { label: "Crescendo (30d)",       value: growing,                                icon: Clock,        color: "text-amber-400"  },
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

      {/* Banner do rival */}
      {rivalName && rivalInfo && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
          <Swords className="w-4 h-4 text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground">{rivalName}</span>
            <span className="text-xs text-muted-foreground ml-2">
              ({rivalInfo.partido}) · {rivalInfo.votos.toLocaleString("pt-BR")} votos em 2022
            </span>
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
          {/* Cabeçalho da lista + chips de ordenação */}
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">
                {goals.length} município{goals.length !== 1 ? "s" : ""}
              </h2>
            </div>

            {/* Separador */}
            <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />

            {/* Chips de ordenação */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">Ordenar:</span>
              <SortChip label="Cidade"    k="cidade"    />
              <SortChip label="% Meta"    k="meta_pct"  />
              <SortChip label="Ativos"    k="ativos"    />
              {rivalName && (
                <SortChip label="Cobertura" k="cobertura" />
              )}
            </div>

            <span className="ml-auto text-[10px] text-muted-foreground hidden sm:inline">
              Líderes meta: {totalGoalLeaders}
            </span>
          </div>

          {/* Lista ordenada */}
          <div className="divide-y divide-white/[0.05]">
            {sorted.map(({ g, real, votePct, rivalVotos, cobertura }) => {
              const leaderOk = g.targetLeaders === 0 || real.hasLeader;
              const roundPct = Math.round(votePct);
              const status: "ok" | "warn" | "danger" =
                roundPct >= 100 ? "ok" : roundPct >= 50 ? "warn" : "danger";
              const barColor  = status === "ok" ? "bg-green-500/70" : status === "warn" ? "bg-amber-500/70" : "bg-red-500/50";
              const textColor = status === "ok" ? "text-green-400"  : status === "warn" ? "text-amber-400"  : "text-red-400";

              const cobPrioridade =
                cobertura < 0  ? null :
                cobertura === 0 ? "critica" :
                cobertura < 1   ? "alta"    :
                cobertura < 3   ? "media"   : "ok";

              const proj = projection(g.city, g.targetVotes);
              const rate = weeklyGrowthMap[g.city] ?? 0;

              return (
                <div key={g.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  {/* Linha 1: cidade + valores */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      {leaderOk
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <p className="text-sm font-medium text-foreground">{g.city}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${textColor}`}>
                        {real.confirmados}{" "}
                        <span className="text-muted-foreground font-normal text-xs">/ {g.targetVotes} votos</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {real.ativos} ativo{real.ativos !== 1 ? "s" : ""} · {real.hasLeader ? "com liderança" : "sem liderança"}
                      </p>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Confirmados vs meta</span>
                      <span className={textColor}>{roundPct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all`}
                        style={{ width: `${Math.min(100, roundPct)}%` }}
                      />
                    </div>

                    {/* Projeção */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {rate > 0 ? `+${rate.toFixed(1)}/sem` : "sem atividade"}
                      </span>
                      <span className={proj.color}>{proj.label}</span>
                    </div>

                    {/* Linha do rival */}
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
                          {cobertura >= 0 ? `${cobertura.toFixed(1)}% cobertura` : "—"}
                          {cobPrioridade === "critica" && " · Zona cega"}
                          {cobPrioridade === "alta"    && " · Prioridade alta"}
                          {cobPrioridade === "media"   && " · Atenção"}
                          {cobPrioridade === "ok"      && " · OK"}
                        </span>
                      </div>
                    )}

                    {/* Sem rival */}
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
