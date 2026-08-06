import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { BarChart2, Download, FileSpreadsheet, FileText, AlertTriangle, TrendingUp, Users, CalendarRange, Target, Wallet, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { PrintButton } from "@/components/relatorio/print-button";
import { EngagementPanel } from "@/components/relatorio/engagement-panel";
import { CityFilterSelect } from "@/components/relatorio/city-filter-select";
import { Suspense } from "react";
import { PROFILE_LABEL, ROLE_LABEL, ROLE_ORDER } from "@/lib/labels";
import { getRelatorioAggregates, getGrowth, getContribuicoes, getMonthlySeries, getAvailableCities, getExecutiveSummary, coverageScore } from "@/lib/relatorio-data";


const ROLE_LABEL_SHORT: Record<string, string> = {
  COORD_GERAL: "C. Geral", COORD_REGIONAL: "C. Regional",
  LIDER_MUNICIPAL: "L. Municipal", LIDER_BAIRRO: "L. Bairro", VOLUNTARIO: "Voluntário",
};

const SUPPORT_COLOR: Record<string, string> = {
  CONFIRMADO: "bg-green-500/15 text-green-400 border-green-500/30",
  NEGOCIANDO: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  NEUTRO:     "bg-slate-500/15 text-slate-400 border-slate-500/30",
  ADVERSARIO: "bg-red-500/15 text-red-400 border-red-500/30",
};

const PROFILE_COLOR: Record<string, string> = {
  PASTOR:                "text-yellow-400",
  VEREADOR:              "text-blue-400",
  EMPRESARIO:            "text-green-400",
  LIDER_POLITICO:        "text-purple-400",
  PRESIDENTE_ASSOCIACAO: "text-cyan-400",
  LIDERANCA_COMUNITARIA: "text-orange-400",
  APOIADOR:              "text-slate-400",
};

const COVERAGE_STYLE: Record<string, string> = {
  alta:  "border-green-500/30 bg-green-500/[0.05]",
  media: "border-yellow-500/30 bg-yellow-500/[0.05]",
  baixa: "border-white/[0.08] bg-white/[0.02]",
};
const COVERAGE_DOT: Record<string, string> = {
  alta: "bg-green-500", media: "bg-yellow-500", baixa: "bg-slate-500",
};

const PERIODO_OPTIONS = [
  { key: "30",  label: "30 dias" },
  { key: "90",  label: "90 dias" },
  { key: "180", label: "6 meses" },
  { key: "all", label: "Tudo"    },
];

const KEY_PROFILE_OPTIONS = [
  { key: "PASTOR",                label: "Pastor"            },
  { key: "VEREADOR",              label: "Vereador"          },
  { key: "LIDER_POLITICO",        label: "Líder Político"    },
  { key: "EMPRESARIO",            label: "Empresário"        },
  { key: "PRESIDENTE_ASSOCIACAO", label: "Pres. Associação"  },
  { key: "LIDERANCA_COMUNITARIA", label: "Lid. Comunitária"  },
];

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: { cob?: string; perfil?: string; periodo?: string; cidade?: string; cargo?: string };
}) {
  const session = await auth();
  if (!session?.user) return null;
  if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return null;
  const { db, cid: CID } = getCampaignContext(session);
  const activeCob     = searchParams.cob    ?? null;
  const activeProfile = searchParams.perfil ?? null;
  const activePeriodo = searchParams.periodo ?? "30";
  const activeCity    = searchParams.cidade ?? null;
  const activeRole    = searchParams.cargo  ?? null;

  function buildUrl(overrides: Record<string, string | null>): string {
    const p: Record<string, string> = {};
    if (activeCob)                    p.cob     = activeCob;
    if (activeProfile)                p.perfil  = activeProfile;
    if (activePeriodo !== "30")       p.periodo = activePeriodo;
    if (activeCity)                   p.cidade  = activeCity;
    if (activeRole)                   p.cargo   = activeRole;
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) delete p[k];
      else            p[k] = v;
    }
    const qs = new URLSearchParams(p).toString();
    return qs ? `/relatorio?${qs}` : "/relatorio";
  }

  const filters = { profile: activeProfile, city: activeCity, role: activeRole };
  const periodDays = activePeriodo === "all" ? null : parseInt(activePeriodo);

  const [agg, { newN, prevN }, topContrib, monthlySeries, availableCities, execSummary] = await Promise.all([
    getRelatorioAggregates(db, CID, filters),
    getGrowth(db, CID, filters, periodDays),
    getContribuicoes(db, CID, filters),
    getMonthlySeries(db, CID, filters, 6),
    getAvailableCities(db, CID),
    getExecutiveSummary(db, CID),
  ]);

  const {
    totalAll, totalLeads, totalActive, totalConfirm,
    cities, totals, highCoverage, medCoverage, orphanCities,
    crossTable, crossProfiles, byProfile, byRole, bySupport,
  } = agg;

  const pctLeadActive = totalAll > 0 ? Math.round((totalActive / totalAll) * 100) : 0;
  const pctActiveConf = totalActive > 0 ? Math.round((totalConfirm / totalActive) * 100) : 0;

  const growthDelta = newN - prevN;
  const growthLabel = activePeriodo === "all" ? "total cadastrado" : `últimos ${PERIODO_OPTIONS.find(p => p.key === activePeriodo)?.label ?? activePeriodo}`;

  const allFilteredCities = cities.filter(([, m]) => {
    if (activeCob === "alta")    return coverageScore(m.roles) === "alta";
    if (activeCob === "media")   return coverageScore(m.roles) === "media";
    if (activeCob === "confirm") return m.confirmados > 0;
    return true;
  });
  const filteredCities = allFilteredCities.slice(0, 50);
  const orphanShown = orphanCities.slice(0, 8);

  const maxProfile = Math.max(...byProfile.map((x) => x.count), 1);
  const maxRole    = Math.max(...byRole.map((x) => x.count), 1);
  const maxMonthly = Math.max(...monthlySeries.map((x) => x.total), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" /> Relatório de Cobertura
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {cities.length} municípios · {totals.active} ativos · {totals.leads} leads
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PrintButton />
          <Link
            href="/api/relatorio/export"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.12] text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
          >
            <Download className="w-4 h-4" /> CSV
          </Link>
          <Link
            href="/api/relatorio/export-pdf"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.12] text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
          >
            <FileText className="w-4 h-4" /> PDF
          </Link>
          <Link
            href="/api/relatorio/export-xlsx"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar XLSX
          </Link>
        </div>
      </div>

      {/* Resumo Executivo — cruza Metas, Financeiro (Igrejas) e Ranking */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Meta Eleitoral</h2>
          </div>
          {execSummary.metaVotesPct === null ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma meta configurada — defina em{" "}
              <Link href="/metas" className="text-primary hover:underline">Metas</Link>.
            </p>
          ) : (
            <>
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-2xl font-bold text-foreground">{execSummary.metaVotesPct}%</span>
                <span className="text-xs text-muted-foreground">{totalConfirm} / {execSummary.metaVotesTotal} votos</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, execSummary.metaVotesPct)}%` }} />
              </div>
              <Link href="/metas" className="text-[10px] text-muted-foreground hover:text-foreground mt-2 inline-block underline underline-offset-2">
                Ver detalhamento por cidade
              </Link>
            </>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Financeiro (Igrejas)</h2>
          </div>
          {!execSummary.financeiro ? (
            <p className="text-xs text-muted-foreground">Sem dados financeiros ainda.</p>
          ) : (
            <>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Pago</span>
                <span className="text-green-400 font-bold">
                  {execSummary.financeiro.amountPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pendente</span>
                <span className="text-amber-400 font-bold">
                  {execSummary.financeiro.amountPending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <Link href="/igrejas" className="text-[10px] text-muted-foreground hover:text-foreground mt-3 inline-block underline underline-offset-2">
                Ver financeiro completo
              </Link>
            </>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Top Líderes</h2>
          </div>
          {execSummary.topLeaders.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ninguém registrou colaborador ativo ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {execSummary.topLeaders.map((l, i) => (
                <div key={l.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-3">{i + 1}º</span>
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={l.image ?? undefined} referrerPolicy="no-referrer" />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                      {(l.name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-foreground flex-1 truncate">{l.name ?? "Sem nome"}</span>
                  <span className="text-xs font-bold text-primary">{l.active}</span>
                </div>
              ))}
              <Link href="/ranking" className="text-[10px] text-muted-foreground hover:text-foreground mt-1 inline-block underline underline-offset-2">
                Ver ranking completo
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 border border-white/[0.07] space-y-3 no-print">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filtro por perfil */}
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Perfil</p>
            <div className="flex flex-wrap gap-1.5">
              <Link href={buildUrl({ perfil: null })}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${!activeProfile ? "bg-primary/15 text-primary border-primary/40" : "text-muted-foreground border-white/[0.08] hover:border-white/[0.2]"}`}>
                Todos
              </Link>
              {KEY_PROFILE_OPTIONS.map((o) => (
                <Link key={o.key} href={buildUrl({ perfil: activeProfile === o.key ? null : o.key })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${activeProfile === o.key ? "bg-primary/15 text-primary border-primary/40" : "text-muted-foreground border-white/[0.08] hover:border-white/[0.2]"}`}>
                  {o.label}
                </Link>
              ))}
            </div>
          </div>
          {/* Filtro por período */}
          <div className="shrink-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Período de crescimento</p>
            <div className="flex gap-1.5">
              {PERIODO_OPTIONS.map((o) => (
                <Link key={o.key} href={buildUrl({ periodo: o.key === "30" ? null : o.key })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${activePeriodo === o.key ? "bg-primary/15 text-primary border-primary/40" : "text-muted-foreground border-white/[0.08] hover:border-white/[0.2]"}`}>
                  {o.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-white/[0.06]">
          {/* Filtro por cargo */}
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Cargo</p>
            <div className="flex flex-wrap gap-1.5">
              <Link href={buildUrl({ cargo: null })}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${!activeRole ? "bg-primary/15 text-primary border-primary/40" : "text-muted-foreground border-white/[0.08] hover:border-white/[0.2]"}`}>
                Todos
              </Link>
              {ROLE_ORDER.map((r) => (
                <Link key={r} href={buildUrl({ cargo: activeRole === r ? null : r })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${activeRole === r ? "bg-primary/15 text-primary border-primary/40" : "text-muted-foreground border-white/[0.08] hover:border-white/[0.2]"}`}>
                  {ROLE_LABEL_SHORT[r] ?? ROLE_LABEL[r]}
                </Link>
              ))}
            </div>
          </div>
          {/* Filtro por cidade */}
          <div className="shrink-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Cidade</p>
            <CityFilterSelect cities={availableCities} value={activeCity} />
          </div>
        </div>
      </div>

      {/* KPIs clicáveis */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: null,      label: "Municípios",      value: cities.length,      color: "text-primary",    hint: null },
          { key: "alta",    label: "Cobertura Alta",  value: highCoverage,       color: "text-green-400",  hint: "Com coord. ou líder municipal" },
          { key: "media",   label: "Cobertura Média", value: medCoverage,        color: "text-yellow-400", hint: "Com líder de bairro" },
          { key: "confirm", label: "Confirmados",     value: totals.confirmados, color: "text-green-400",  hint: null },
        ].map((s) => {
          const isActive = activeCob === s.key || (s.key === null && activeCob === null);
          // Toggle: card ativo → limpa filtro; card inativo → aplica filtro
          const cardHref = buildUrl({ cob: isActive && s.key !== null ? null : s.key });
          return (
            <Link
              key={s.label}
              href={cardHref}
              className={`glass-card rounded-xl p-4 border transition-all hover:border-primary/40 group cursor-pointer ${isActive ? "border-primary/50 bg-primary/[0.04]" : "border-white/[0.08]"}`}
            >
              <p className={`text-xs transition-colors ${isActive ? "text-primary/80" : "text-muted-foreground group-hover:text-foreground/70"}`}>{s.label}</p>
              {s.hint && <p className="text-[10px] text-muted-foreground/60 mb-0.5">{s.hint}</p>}
              <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </Link>
          );
        })}
      </div>

      {/* INSIGHTS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Funil */}
        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Funil de Conversão</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Total cadastrado", value: totalAll,     pct: 100,            color: "bg-slate-500/50", sub: null },
              { label: "Ativos",           value: totalActive,  pct: pctLeadActive,  color: "bg-primary/60",  sub: `${pctLeadActive}% do total` },
              { label: "Confirmados",      value: totalConfirm, pct: pctActiveConf,  color: "bg-green-500/70", sub: `${pctActiveConf}% dos ativos` },
            ].map((step) => (
              <div key={step.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{step.label}</span>
                  <span className="text-foreground font-bold">{step.value}</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full ${step.color}`} style={{ width: `${step.pct}%` }} />
                </div>
                {step.sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{step.sub}</p>}
              </div>
            ))}
            <div className="pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Leads ainda não ativos</span>
                <span className="text-amber-400 font-semibold">{totalLeads}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Crescimento + Contribuições */}
        <div className="glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Crescimento ({growthLabel})</h2>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <p className="text-3xl font-bold text-foreground">{activePeriodo === "all" ? totalAll : `+${newN}`}</p>
                <p className="text-xs text-muted-foreground">{activePeriodo === "all" ? "total cadastrado" : "novos cadastros"}</p>
              </div>
              {activePeriodo !== "all" && (
                <div className={`text-xs font-medium mb-1 ${growthDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {growthDelta >= 0 ? "↑" : "↓"} {Math.abs(growthDelta)} vs período anterior
                </div>
              )}
            </div>
          </div>
          {topContrib.length > 0 && (
            <div className="pt-3 border-t border-white/[0.06]">
              <p className="text-xs font-semibold text-foreground mb-2">Como querem contribuir</p>
              <div className="space-y-1.5">
                {topContrib.map(([key, count]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ").toLowerCase()}</span>
                    <span className="text-foreground font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Municípios órfãos */}
        <div className="glass-card rounded-2xl p-5 border border-amber-500/20 bg-amber-500/[0.03]">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-foreground">Municípios sem Liderança</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Têm apoiadores ativos mas nenhum líder — prioridade de ação.</p>
          {orphanCities.length === 0 ? (
            <p className="text-xs text-green-400">Todos os municípios com ativos têm liderança.</p>
          ) : (
            <div className="space-y-2">
              {orphanShown.map(([city, m]) => (
                <div key={city} className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{city}</span>
                  <span className="text-xs text-amber-400 font-medium">{m.active} ativo{m.active !== 1 ? "s" : ""}</span>
                </div>
              ))}
              {orphanCities.length > 8 && (
                <p className="text-[10px] text-muted-foreground/60">+{orphanCities.length - 8} outros</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabela cruzada: perfil × status de apoio */}
      {crossProfiles.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-foreground">Capital Político por Perfil</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeProfile
                ? <>Filtrando por <span className="text-primary font-medium">{KEY_PROFILE_OPTIONS.find(o => o.key === activeProfile)?.label ?? activeProfile}</span> — <Link href={buildUrl({ perfil: null })} className="underline hover:text-foreground">ver todos</Link></>
                : "Status de apoio dos ativos, segmentado por tipo de liderança"
              }
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]" style={{ background: "rgba(13,27,42,0.4)" }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Perfil</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-green-400/80">Confirmado</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-yellow-400/80">Negociando</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400/80">Neutro</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-red-400/80">Adversário</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {crossProfiles.map((p) => {
                  const row = crossTable[p];
                  return (
                    <tr key={p} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium ${PROFILE_COLOR[p]}`}>{PROFILE_LABEL[p]}</span>
                      </td>
                      <td className="text-center px-4 py-3">
                        {row.confirmado > 0 ? <span className="font-bold text-green-400">{row.confirmado}</span> : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="text-center px-4 py-3">
                        {row.negociando > 0 ? <span className="font-semibold text-yellow-400">{row.negociando}</span> : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="text-center px-4 py-3">
                        {row.neutro > 0 ? <span className="text-slate-400">{row.neutro}</span> : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="text-center px-4 py-3">
                        {row.adversario > 0 ? <span className="font-semibold text-red-400">{row.adversario}</span> : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="text-center px-4 py-3 font-semibold text-foreground">{row.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evolução mensal */}
      <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
        <div className="flex items-center gap-2 mb-4">
          <CalendarRange className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Evolução Mensal (últimos 6 meses)</h2>
        </div>
        <div className="flex items-end gap-2 sm:gap-4 h-32">
          {monthlySeries.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <span className="text-xs font-bold text-foreground">{m.total || ""}</span>
              <div className="w-full flex flex-col justify-end h-full rounded-t-md overflow-hidden bg-white/[0.04]">
                <div
                  className="w-full bg-primary/70 rounded-t-md"
                  style={{ height: `${Math.round((m.total / maxMonthly) * 100)}%`, minHeight: m.total > 0 ? "4px" : "0" }}
                  title={`${m.total} cadastrados (${m.active} ativos)`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <h2 className="text-sm font-semibold text-foreground mb-4">Por Cargo (ativos)</h2>
          <div className="space-y-3">
            {byRole.map(({ key, label, count }) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{ROLE_LABEL_SHORT[key] ?? label}</span>
                  <span className="text-foreground font-medium">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06]">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.round((count / maxRole) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <h2 className="text-sm font-semibold text-foreground mb-4">Por Perfil (total)</h2>
          <div className="space-y-3">
            {byProfile.map(({ key, label, count }) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={PROFILE_COLOR[key] ?? "text-muted-foreground"}>{label}</span>
                  <span className="text-foreground font-medium">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full ${key === "PASTOR" ? "bg-yellow-400/60" : key === "VEREADOR" ? "bg-blue-400/60" : key === "EMPRESARIO" ? "bg-green-400/60" : "bg-slate-400/60"}`}
                    style={{ width: `${Math.round((count / maxProfile) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <h2 className="text-sm font-semibold text-foreground mb-4">Status de Apoio (ativos)</h2>
          <div className="space-y-2.5">
            {bySupport.map(({ key, label, count }) => (
              <div key={key} className="flex items-center justify-between">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${SUPPORT_COLOR[key]}`}>{label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-white/[0.06]">
                    <div className={`h-full rounded-full ${key === "CONFIRMADO" ? "bg-green-400" : key === "NEGOCIANDO" ? "bg-yellow-400" : key === "ADVERSARIO" ? "bg-red-400" : "bg-slate-400"}`}
                      style={{ width: totalActive > 0 ? `${Math.round((count / totalActive) * 100)}%` : "0%" }} />
                  </div>
                  <span className="text-sm font-bold text-foreground w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engajamento */}
      <Suspense fallback={<div className="glass-card rounded-2xl p-6 border border-white/[0.08] h-40 animate-pulse" />}>
        <EngagementPanel db={db} cid={CID} />
      </Suspense>

      {/* Legenda */}
      <div className="flex gap-4 flex-wrap text-xs text-muted-foreground no-print">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Alta (coord. ou líder municipal)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> Média (líder de bairro)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" /> Baixa (só voluntários)</span>
      </div>

      {/* Tabela de cobertura */}
      <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
        {/* Indicador de filtro ativo */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]" style={{ background: "rgba(13,27,42,0.3)" }}>
          <p className="text-xs text-muted-foreground">
            {activeCob ? (
              <>Mostrando <span className="text-foreground font-medium">{filteredCities.length}</span> de {allFilteredCities.length} municípios — filtro: <span className="text-primary font-medium">{activeCob === "alta" ? "Cobertura Alta" : activeCob === "media" ? "Cobertura Média" : "Confirmados"}</span></>
            ) : (
              <>{cities.length} município{cities.length !== 1 ? "s" : ""} — clique em um card acima para filtrar</>
            )}
          </p>
          {activeCob && (
            <Link href="/relatorio" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
              Limpar filtro
            </Link>
          )}
        </div>
        {/* ─── Mobile: cards verticais com todas as métricas ─── */}
        <div className="lg:hidden divide-y divide-white/[0.04]">
          {filteredCities.map(([city, m]) => {
            const score = coverageScore(m.roles);
            return (
              <div key={city} className={`p-3 ${COVERAGE_STYLE[score]}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${COVERAGE_DOT[score]}`} />
                  <span className="font-semibold text-foreground flex-1 truncate">{city}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {score === "alta" ? "Alta" : score === "media" ? "Média" : "Baixa"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] py-1.5 text-center">
                    <p className="text-base font-bold text-foreground leading-none">{m.active}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Ativos</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/[0.06] border border-amber-500/15 py-1.5 text-center">
                    <p className="text-base font-bold text-amber-400 leading-none">{m.leads || "—"}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Leads</p>
                  </div>
                  <div className="rounded-lg bg-green-500/[0.06] border border-green-500/15 py-1.5 text-center">
                    <p className="text-base font-bold text-green-400 leading-none">{m.confirmados || "—"}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Confirm.</p>
                  </div>
                </div>
                {/* Liderança por cargo */}
                <div className="flex flex-wrap gap-1">
                  {ROLE_ORDER.filter((r) => m.roles[r]).map((r) => (
                    <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-muted-foreground">
                      {ROLE_LABEL_SHORT[r]} <span className="text-foreground font-semibold">{m.roles[r]}</span>
                    </span>
                  ))}
                  {ROLE_ORDER.filter((r) => m.roles[r]).length === 0 && (
                    <span className="text-[10px] text-muted-foreground/60 italic">Sem liderança</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Desktop: tabela cruzada completa ─── */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]" style={{ background: "rgba(13,27,42,0.5)" }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Município</th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground">{ROLE_LABEL_SHORT[r]}</th>
                ))}
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground">Ativos</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground">Leads</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-green-400/80">Confirm.</th>
              </tr>
            </thead>
            <tbody>
              {filteredCities.map(([city, m]) => {
                const score = coverageScore(m.roles);
                return (
                  <tr key={city} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${COVERAGE_STYLE[score]}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${COVERAGE_DOT[score]}`} />
                        <span className="font-medium text-foreground">{city}</span>
                      </div>
                    </td>
                    {ROLE_ORDER.map((r) => (
                      <td key={r} className="text-center px-3 py-3">
                        {m.roles[r] ? <span className="font-semibold text-foreground">{m.roles[r]}</span> : <span className="text-muted-foreground/30">—</span>}
                      </td>
                    ))}
                    <td className="text-center px-3 py-3 font-semibold text-foreground">{m.active}</td>
                    <td className="text-center px-3 py-3 text-amber-400">{m.leads || <span className="text-muted-foreground/30">—</span>}</td>
                    <td className="text-center px-3 py-3 text-green-400 font-semibold">{m.confirmados || <span className="text-muted-foreground/30">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.08]" style={{ background: "rgba(13,27,42,0.5)" }}>
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">Total ({filteredCities.length} municípios{activeCob ? ` filtrado${filteredCities.length !== 1 ? "s" : ""}` : ""})</td>
                {ROLE_ORDER.map((r) => (
                  <td key={r} className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground">
                    {filteredCities.reduce((s, [, m]) => s + (m.roles[r] ?? 0), 0) || "—"}
                  </td>
                ))}
                <td className="text-center px-3 py-3 text-xs font-semibold text-foreground">{filteredCities.reduce((s, [, m]) => s + m.active, 0)}</td>
                <td className="text-center px-3 py-3 text-xs font-semibold text-amber-400">{filteredCities.reduce((s, [, m]) => s + m.leads, 0) || "—"}</td>
                <td className="text-center px-3 py-3 text-xs font-semibold text-green-400">{filteredCities.reduce((s, [, m]) => s + m.confirmados, 0) || "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
