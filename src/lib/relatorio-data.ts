import type { PrismaClient, Prisma } from "@prisma/client";
import { ROLE_ORDER, PROFILE_ORDER, SUPPORT_ORDER } from "@/lib/labels";
import { getPaymentsReport } from "@/lib/church-payments";

export const KEY_PROFILES = [
  "PASTOR", "VEREADOR", "LIDER_POLITICO", "EMPRESARIO", "PRESIDENTE_ASSOCIACAO", "LIDERANCA_COMUNITARIA",
] as const;

export interface RelatorioFilters {
  profile?: string | null;
  city?: string | null;
  role?: string | null;
}

export interface CityAggRow {
  city: string;
  roles: Record<string, number>;
  active: number;
  leads: number;
  confirmados: number;
  total: number;
}

interface CrossRow {
  confirmado: number;
  negociando: number;
  neutro: number;
  adversario: number;
  total: number;
}

export interface RelatorioAggregates {
  totalAll: number;
  totalLeads: number;
  totalActive: number;
  totalConfirm: number;
  cities: [string, CityAggRow][]; // ordenado por ativos desc, mesmo shape que o código antigo usava (Object.entries)
  totals: { total: number; active: number; leads: number; confirmados: number };
  highCoverage: number;
  medCoverage: number;
  orphanCities: [string, CityAggRow][];
  crossTable: Record<string, CrossRow>;
  crossProfiles: string[]; // perfis com total > 0, respeitando o filtro de perfil
  byProfile: { key: string; label: string; count: number }[];
  byRole: { key: string; label: string; count: number }[];
  bySupport: { key: string; label: string; count: number }[];
}

/**
 * Score de cobertura por município — critério único usado em page.tsx,
 * export-xlsx e export-pdf (antes duplicado em 2 lugares).
 */
export function coverageScore(roles: Record<string, number>): "alta" | "media" | "baixa" {
  if (roles.COORD_GERAL > 0 || roles.COORD_REGIONAL > 0 || roles.LIDER_MUNICIPAL > 0) return "alta";
  if (roles.LIDER_BAIRRO > 0) return "media";
  return "baixa";
}

function buildWhere(
  campaignId: string,
  filters: RelatorioFilters,
  extra?: Prisma.CollaboratorWhereInput,
): Prisma.CollaboratorWhereInput {
  return {
    campaignId,
    ...(filters.profile ? { profile: filters.profile as never } : {}),
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.role ? { campaignRole: filters.role as never } : {}),
    ...extra,
  };
}

/**
 * Agregações principais do relatório — tudo via groupBy/count no banco, sem
 * puxar linha por colaborador. Antes disso, a página fazia um único
 * `findMany` com `take: 5000` e agregava em JS — o `take` truncava
 * silenciosamente qualquer coisa além de 5000 colaboradores, e o custo de
 * CPU/memória crescia linear com a base inteira a cada carregamento.
 */
export async function getRelatorioAggregates(
  db: PrismaClient,
  campaignId: string,
  filters: RelatorioFilters,
): Promise<RelatorioAggregates> {
  const whereAll     = buildWhere(campaignId, filters);
  const whereActive  = buildWhere(campaignId, filters, { status: "ACTIVE" });
  const whereLead    = buildWhere(campaignId, filters, { status: "LEAD" });
  const whereConfirm = buildWhere(campaignId, filters, { status: "ACTIVE", supportStatus: "CONFIRMADO" });

  const [
    totalAll, totalLeads, totalActive, totalConfirm,
    cityRoleGroups, cityStatusGroups, cityConfirmGroups,
    crossGroups, profileGroups, roleGroups, supportGroups,
  ] = await Promise.all([
    db.collaborator.count({ where: whereAll }),
    db.collaborator.count({ where: whereLead }),
    db.collaborator.count({ where: whereActive }),
    db.collaborator.count({ where: whereConfirm }),
    db.collaborator.groupBy({ by: ["city", "campaignRole"], where: { ...whereAll, city: { not: null } }, _count: true }),
    db.collaborator.groupBy({ by: ["city", "status"],       where: { ...whereAll, city: { not: null } }, _count: true }),
    db.collaborator.groupBy({ by: ["city"],                 where: { ...whereConfirm, city: { not: null } }, _count: true }),
    db.collaborator.groupBy({ by: ["profile", "supportStatus"], where: whereActive, _count: true }),
    db.collaborator.groupBy({ by: ["profile"],      where: whereAll,    _count: true }),
    db.collaborator.groupBy({ by: ["campaignRole"], where: whereActive, _count: true }),
    db.collaborator.groupBy({ by: ["supportStatus"], where: whereActive, _count: true }),
  ]);

  // ─── Cidades ─────────────────────────────────────────────────────────
  const cityMap: Record<string, CityAggRow> = {};
  function ensureCity(city: string): CityAggRow {
    if (!cityMap[city]) cityMap[city] = { city, roles: {}, active: 0, leads: 0, confirmados: 0, total: 0 };
    return cityMap[city];
  }
  for (const g of cityRoleGroups) {
    if (!g.city) continue;
    const m = ensureCity(g.city);
    m.roles[g.campaignRole] = (m.roles[g.campaignRole] ?? 0) + g._count;
    m.total += g._count;
  }
  for (const g of cityStatusGroups) {
    if (!g.city) continue;
    const m = ensureCity(g.city);
    if (g.status === "ACTIVE") m.active += g._count;
    if (g.status === "LEAD")   m.leads  += g._count;
  }
  for (const g of cityConfirmGroups) {
    if (!g.city) continue;
    ensureCity(g.city).confirmados += g._count;
  }

  const cities = Object.entries(cityMap).sort((a, b) => b[1].active - a[1].active);
  const totals = cities.reduce((acc, [, m]) => ({
    total: acc.total + m.total, active: acc.active + m.active,
    leads: acc.leads + m.leads, confirmados: acc.confirmados + m.confirmados,
  }), { total: 0, active: 0, leads: 0, confirmados: 0 });

  const highCoverage = cities.filter(([, m]) => coverageScore(m.roles) === "alta").length;
  const medCoverage  = cities.filter(([, m]) => coverageScore(m.roles) === "media").length;
  const orphanCities = cities.filter(([, m]) => coverageScore(m.roles) === "baixa" && m.active > 0);

  // ─── Capital político (perfil × apoio) ──────────────────────────────
  const crossTable: Record<string, CrossRow> = {};
  for (const p of KEY_PROFILES) crossTable[p] = { confirmado: 0, negociando: 0, neutro: 0, adversario: 0, total: 0 };
  for (const g of crossGroups) {
    const row = crossTable[g.profile as string];
    if (!row) continue;
    const key = g.supportStatus === "CONFIRMADO" ? "confirmado"
      : g.supportStatus === "NEGOCIANDO" ? "negociando"
      : g.supportStatus === "NEUTRO" ? "neutro" : "adversario";
    row[key] += g._count;
    row.total += g._count;
  }
  const crossSource = filters.profile ? KEY_PROFILES.filter((p) => p === filters.profile) : KEY_PROFILES;
  const crossProfiles = crossSource.filter((p) => crossTable[p].total > 0);

  // ─── Breakdowns ──────────────────────────────────────────────────────
  const { ROLE_LABEL, PROFILE_LABEL, SUPPORT_LABEL } = await import("@/lib/labels");
  const profileCountByKey = Object.fromEntries(profileGroups.map((g) => [g.profile, g._count]));
  const roleCountByKey    = Object.fromEntries(roleGroups.map((g) => [g.campaignRole, g._count]));
  const supportCountByKey = Object.fromEntries(supportGroups.map((g) => [g.supportStatus, g._count]));

  const byProfile = PROFILE_ORDER
    .map((p) => ({ key: p, label: PROFILE_LABEL[p], count: profileCountByKey[p] ?? 0 }))
    .filter((x) => x.count > 0);
  const byRole = ROLE_ORDER.map((r) => ({ key: r, label: ROLE_LABEL[r], count: roleCountByKey[r] ?? 0 }));
  const bySupport = SUPPORT_ORDER.map((s) => ({ key: s, label: SUPPORT_LABEL[s], count: supportCountByKey[s] ?? 0 }));

  return {
    totalAll, totalLeads, totalActive, totalConfirm,
    cities, totals, highCoverage, medCoverage, orphanCities,
    crossTable, crossProfiles, byProfile, byRole, bySupport,
  };
}

/** Lista de cidades com pelo menos 1 colaborador — pra popular o filtro. */
export async function getAvailableCities(db: PrismaClient, campaignId: string): Promise<string[]> {
  const rows = await db.collaborator.findMany({
    where: { campaignId, city: { not: null } },
    distinct: ["city"],
    select: { city: true },
    orderBy: { city: "asc" },
  });
  return rows.map((r) => r.city!).filter(Boolean);
}

/** Crescimento no período (contagem, sem puxar linhas). */
export async function getGrowth(
  db: PrismaClient,
  campaignId: string,
  filters: RelatorioFilters,
  periodDays: number | null,
): Promise<{ newN: number; prevN: number }> {
  const whereAll = buildWhere(campaignId, filters);
  if (periodDays === null) {
    const newN = await db.collaborator.count({ where: whereAll });
    return { newN, prevN: 0 };
  }
  const now = new Date();
  const dStart = new Date(now.getTime() - periodDays * 86400000);
  const dPrev  = new Date(now.getTime() - periodDays * 2 * 86400000);
  const [newN, prevN] = await Promise.all([
    db.collaborator.count({ where: { ...whereAll, createdAt: { gte: dStart } } }),
    db.collaborator.count({ where: { ...whereAll, createdAt: { gte: dPrev, lt: dStart } } }),
  ]);
  return { newN, prevN };
}

/**
 * Formas de contribuição — `contributionTypes` é array Postgres, sem
 * suporte a groupBy nativo no Prisma. Select estreito (só esse campo, só
 * ativos) em vez do objeto completo — ainda assim muito mais leve que o
 * findMany de 11 colunas que existia antes.
 */
export async function getContribuicoes(
  db: PrismaClient,
  campaignId: string,
  filters: RelatorioFilters,
): Promise<[string, number][]> {
  const whereActive = buildWhere(campaignId, filters, { status: "ACTIVE" });
  const rows = await db.collaborator.findMany({ where: whereActive, select: { contributionTypes: true } });
  const contribMap: Record<string, number> = {};
  for (const r of rows) {
    for (const t of r.contributionTypes) contribMap[t] = (contribMap[t] ?? 0) + 1;
  }
  return Object.entries(contribMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

export interface MonthlyPoint { month: string; label: string; total: number; active: number }

/**
 * Série mensal de cadastros (últimos N meses) — select estreito
 * (createdAt + status), bucketado em JS. Evita $queryRaw/date_trunc; como só
 * 2 campos são selecionados, o custo é uma fração do que seria puxar o
 * objeto completo.
 */
export async function getMonthlySeries(
  db: PrismaClient,
  campaignId: string,
  filters: RelatorioFilters,
  months = 6,
): Promise<MonthlyPoint[]> {
  const whereAll = buildWhere(campaignId, filters);
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const rows = await db.collaborator.findMany({
    where: { ...whereAll, createdAt: { gte: since } },
    select: { createdAt: true, status: true },
  });

  const buckets = new Map<string, { total: number; active: number }>();
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, { total: 0, active: 0 });
  }
  for (const r of rows) {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.get(key);
    if (!b) continue; // fora da janela (não deveria acontecer, where já filtra)
    b.total++;
    if (r.status === "ACTIVE") b.active++;
  }

  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return Array.from(buckets.entries()).map(([month, v]) => {
    const [, m] = month.split("-");
    return { month, label: MESES[parseInt(m, 10) - 1], total: v.total, active: v.active };
  });
}

export interface ExecutiveSummary {
  metaVotesTotal: number;
  metaVotesPct: number | null; // null se nenhuma meta configurada em /metas
  financeiro: { amountPaid: number; amountPending: number } | null; // null se financeiro não disponível
  topLeaders: { id: string; name: string | null; image: string | null; active: number }[];
}

/**
 * Resumo executivo cross-módulo: cruza Metas (progresso de votos), o
 * financeiro de entregas de Igrejas e o top 3 do Ranking num painel só —
 * sempre sem os filtros de perfil/cidade/cargo (é uma visão geral da
 * campanha, não do recorte filtrado).
 */
export async function getExecutiveSummary(db: PrismaClient, campaignId: string): Promise<ExecutiveSummary> {
  const [goals, confirmedTotal, payments, leaderGroups] = await Promise.all([
    db.municipalityGoal.findMany({ where: { campaignId }, select: { targetVotes: true } }),
    db.collaborator.count({ where: { campaignId, status: "ACTIVE", supportStatus: "CONFIRMADO" } }),
    getPaymentsReport(db, campaignId).catch(() => null),
    db.collaborator.groupBy({
      by: ["registeredById"],
      where: { campaignId, registeredById: { not: null }, status: "ACTIVE" },
      _count: true,
    }),
  ]);

  const metaVotesTotal = goals.reduce((s, g) => s + g.targetVotes, 0);
  const metaVotesPct = metaVotesTotal > 0 ? Math.round((confirmedTotal / metaVotesTotal) * 100) : null;

  const topGroups = [...leaderGroups].sort((a, b) => b._count - a._count).slice(0, 3);
  const users = topGroups.length > 0
    ? await db.user.findMany({
        where: { id: { in: topGroups.map((g) => g.registeredById!) } },
        select: { id: true, name: true, image: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));
  const topLeaders = topGroups.map((g) => ({
    id: g.registeredById!,
    name: userMap.get(g.registeredById!)?.name ?? null,
    image: userMap.get(g.registeredById!)?.image ?? null,
    active: g._count,
  }));

  return {
    metaVotesTotal,
    metaVotesPct,
    financeiro: payments ? { amountPaid: payments.totals.amountPaid, amountPending: payments.totals.amountPending } : null,
    topLeaders,
  };
}
