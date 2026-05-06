import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BarChart2, Download, FileSpreadsheet, AlertTriangle, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { PrintButton } from "@/components/relatorio/print-button";
import { ROLE_LABEL, PROFILE_LABEL, SUPPORT_LABEL, ROLE_ORDER, PROFILE_ORDER, SUPPORT_ORDER } from "@/lib/labels";

const CID = "andre-santos-2026";

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

function coverageScore(roles: Record<string, number>): "alta" | "media" | "baixa" {
  if (roles.COORD_GERAL > 0 || roles.COORD_REGIONAL > 0 || roles.LIDER_MUNICIPAL > 0) return "alta";
  if (roles.LIDER_BAIRRO > 0) return "media";
  return "baixa";
}

const COVERAGE_STYLE: Record<string, string> = {
  alta:  "border-green-500/30 bg-green-500/[0.05]",
  media: "border-yellow-500/30 bg-yellow-500/[0.05]",
  baixa: "border-white/[0.08] bg-white/[0.02]",
};
const COVERAGE_DOT: Record<string, string> = {
  alta: "bg-green-500", media: "bg-yellow-500", baixa: "bg-slate-500",
};

export default async function RelatorioPage() {
  await auth();

  const all = await db.collaborator.findMany({
    where: { campaignId: CID },
    select: { city: true, campaignRole: true, status: true, supportStatus: true, profile: true, contributionTypes: true, createdAt: true },
  });

  const active = all.filter((c) => c.status === "ACTIVE");
  const leads  = all.filter((c) => c.status === "LEAD");

  // Funil de conversão
  const totalAll     = all.length;
  const totalLeads   = leads.length;
  const totalActive  = active.length;
  const totalConfirm = active.filter((c) => c.supportStatus === "CONFIRMADO").length;
  const pctLeadActive = totalAll > 0 ? Math.round((totalActive / totalAll) * 100) : 0;
  const pctActiveConf = totalActive > 0 ? Math.round((totalConfirm / totalActive) * 100) : 0;

  // Crescimento últimos 30 dias
  const now    = new Date();
  const d30    = new Date(now.getTime() - 30 * 86400000);
  const d60    = new Date(now.getTime() - 60 * 86400000);
  const new30  = all.filter((c) => new Date(c.createdAt) >= d30).length;
  const prev30 = all.filter((c) => new Date(c.createdAt) >= d60 && new Date(c.createdAt) < d30).length;
  const growthDelta = new30 - prev30;

  // Cobertura por cidade
  const cityMap: Record<string, { roles: Record<string, number>; active: number; leads: number; confirmados: number; total: number }> = {};
  for (const c of all.filter((c) => c.city)) {
    const city = c.city!;
    if (!cityMap[city]) cityMap[city] = { roles: {}, active: 0, leads: 0, confirmados: 0, total: 0 };
    const m = cityMap[city];
    m.total++;
    m.roles[c.campaignRole] = (m.roles[c.campaignRole] ?? 0) + 1;
    if (c.status === "ACTIVE") m.active++;
    if (c.status === "LEAD")   m.leads++;
    if (c.supportStatus === "CONFIRMADO" && c.status === "ACTIVE") m.confirmados++;
  }
  const cities = Object.entries(cityMap).sort((a, b) => b[1].active - a[1].active);
  const totals  = cities.reduce((acc, [, m]) => ({
    total: acc.total + m.total, active: acc.active + m.active,
    leads: acc.leads + m.leads, confirmados: acc.confirmados + m.confirmados,
  }), { total: 0, active: 0, leads: 0, confirmados: 0 });

  const highCoverage = cities.filter(([, m]) => coverageScore(m.roles) === "alta").length;
  const medCoverage  = cities.filter(([, m]) => coverageScore(m.roles) === "media").length;

  // Municípios órfãos
  const orphanCities = cities.filter(([, m]) => coverageScore(m.roles) === "baixa" && m.active > 0);
  const orphanShown  = orphanCities.slice(0, 8);

  // Tabela cruzada: perfil × status de apoio
  const KEY_PROFILES = ["PASTOR", "VEREADOR", "LIDER_POLITICO", "EMPRESARIO", "PRESIDENTE_ASSOCIACAO", "LIDERANCA_COMUNITARIA"];
  type CrossRow = { confirmado: number; negociando: number; neutro: number; adversario: number; total: number };
  const crossTable: Record<string, CrossRow> = {};
  for (const p of KEY_PROFILES) {
    const group = active.filter((c) => c.profile === p);
    crossTable[p] = {
      confirmado: group.filter((c) => c.supportStatus === "CONFIRMADO").length,
      negociando: group.filter((c) => c.supportStatus === "NEGOCIANDO").length,
      neutro:     group.filter((c) => c.supportStatus === "NEUTRO").length,
      adversario: group.filter((c) => c.supportStatus === "ADVERSARIO").length,
      total: group.length,
    };
  }
  const crossProfiles = KEY_PROFILES.filter((p) => crossTable[p].total > 0);

  // Formas de contribuição
  const contribMap: Record<string, number> = {};
  for (const c of active) {
    for (const t of c.contributionTypes) {
      contribMap[t] = (contribMap[t] ?? 0) + 1;
    }
  }
  const topContrib = Object.entries(contribMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Breakdowns
  const byProfile = PROFILE_ORDER.map((p) => ({
    key: p, label: PROFILE_LABEL[p], count: all.filter((c) => c.profile === p).length,
  })).filter((x) => x.count > 0);

  const bySupport = SUPPORT_ORDER.map((s) => ({
    key: s, label: SUPPORT_LABEL[s], count: active.filter((c) => c.supportStatus === s).length,
  }));

  const byRole = ROLE_ORDER.map((r) => ({
    key: r, label: ROLE_LABEL[r], count: active.filter((c) => c.campaignRole === r).length,
  }));

  const maxProfile = Math.max(...byProfile.map((x) => x.count), 1);
  const maxRole    = Math.max(...byRole.map((x) => x.count), 1);

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
            href="/api/relatorio/export-xlsx"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar XLSX
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Municípios",      value: cities.length,       color: "text-primary"    },
          { label: "Cobertura Alta",  value: highCoverage,        color: "text-green-400",  hint: "Com coord. ou líder municipal" },
          { label: "Cobertura Média", value: medCoverage,         color: "text-yellow-400", hint: "Com líder de bairro" },
          { label: "Confirmados",     value: totals.confirmados,  color: "text-green-400"  },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-xl p-4 border border-white/[0.08]">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            {s.hint && <p className="text-[10px] text-muted-foreground/60 mb-0.5">{s.hint}</p>}
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
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
              <h2 className="text-sm font-semibold text-foreground">Crescimento (30 dias)</h2>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <p className="text-3xl font-bold text-foreground">+{new30}</p>
                <p className="text-xs text-muted-foreground">novos cadastros</p>
              </div>
              <div className={`text-xs font-medium mb-1 ${growthDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
                {growthDelta >= 0 ? "↑" : "↓"} {Math.abs(growthDelta)} vs mês anterior
              </div>
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
            <p className="text-xs text-muted-foreground mt-0.5">Status de apoio dos ativos, segmentado por tipo de liderança</p>
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
                      style={{ width: active.length > 0 ? `${Math.round((count / active.length) * 100)}%` : "0%" }} />
                  </div>
                  <span className="text-sm font-bold text-foreground w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 flex-wrap text-xs text-muted-foreground no-print">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Alta (coord. ou líder municipal)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> Média (líder de bairro)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" /> Baixa (só voluntários)</span>
      </div>

      {/* Tabela de cobertura */}
      <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
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
              {cities.map(([city, m]) => {
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
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">Total ({cities.length} municípios)</td>
                {ROLE_ORDER.map((r) => (
                  <td key={r} className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground">
                    {cities.reduce((s, [, m]) => s + (m.roles[r] ?? 0), 0) || "—"}
                  </td>
                ))}
                <td className="text-center px-3 py-3 text-xs font-semibold text-foreground">{totals.active}</td>
                <td className="text-center px-3 py-3 text-xs font-semibold text-amber-400">{totals.leads}</td>
                <td className="text-center px-3 py-3 text-xs font-semibold text-green-400">{totals.confirmados}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
