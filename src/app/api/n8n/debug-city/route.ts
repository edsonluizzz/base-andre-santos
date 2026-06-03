import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * GET /api/n8n/debug-city?q=toledo&campaign_id=andre-santos-2026
 *
 * Lista variantes de spelling de city + status counts.
 * Diagnóstico do bug do mapa.
 *
 * Auth: Bearer N8N_API_KEY.
 */
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ error: "q obrigatorio" }, { status: 400 });

  // Group by city + status
  const rows = await db.collaborator.groupBy({
    by: ["city", "status", "profile"],
    where: {
      campaignId: "andre-santos-2026",
      city: { contains: q, mode: "insensitive" },
    },
    _count: { _all: true },
  });

  // Aggregate to spotting variants
  const variants: Record<string, { total: number; active: number; lead: number; inactive: number; profiles: Record<string, number> }> = {};
  for (const r of rows) {
    const city = r.city ?? "(null)";
    if (!variants[city]) variants[city] = { total: 0, active: 0, lead: 0, inactive: 0, profiles: {} };
    variants[city].total += r._count._all;
    if (r.status === "ACTIVE") variants[city].active += r._count._all;
    else if (r.status === "LEAD") variants[city].lead += r._count._all;
    else if (r.status === "INACTIVE") variants[city].inactive += r._count._all;
    variants[city].profiles[r.profile] = (variants[city].profiles[r.profile] ?? 0) + r._count._all;
  }

  // Test what /api/mapa/stats would return for these cities
  const mapaStatsTest = await db.collaborator.findMany({
    where: {
      campaignId: "andre-santos-2026",
      status: { not: "INACTIVE" },
      city: { contains: q, mode: "insensitive" },
    },
    select: { city: true, supportStatus: true },
  });
  const mapaStatsAgg: Record<string, { total: number; confirmado: number; negociando: number; neutro: number; adversario: number }> = {};
  for (const r of mapaStatsTest) {
    const city = (r.city ?? "").trim();
    if (!mapaStatsAgg[city]) mapaStatsAgg[city] = { total: 0, confirmado: 0, negociando: 0, neutro: 0, adversario: 0 };
    mapaStatsAgg[city].total++;
    if (r.supportStatus === "CONFIRMADO") mapaStatsAgg[city].confirmado++;
    else if (r.supportStatus === "NEGOCIANDO") mapaStatsAgg[city].negociando++;
    else if (r.supportStatus === "NEUTRO") mapaStatsAgg[city].neutro++;
    else if (r.supportStatus === "ADVERSARIO") mapaStatsAgg[city].adversario++;
  }

  // Busca super ampla: lista TODAS as cidades distintas que começam com a primeira letra
  const firstChar = q.charAt(0).toLowerCase();
  const allCitiesStartingWithChar = await db.collaborator.findMany({
    where: {
      campaignId: "andre-santos-2026",
      city: { startsWith: firstChar, mode: "insensitive" },
    },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });

  // Também busca em name + neighborhood (caso esteja em campo errado)
  const leakedToName = await db.collaborator.count({
    where: { campaignId: "andre-santos-2026", name: { contains: q, mode: "insensitive" } },
  });
  const leakedToNeighborhood = await db.collaborator.count({
    where: { campaignId: "andre-santos-2026", neighborhood: { contains: q, mode: "insensitive" } },
  });
  const leakedToNotes = await db.collaborator.count({
    where: { campaignId: "andre-santos-2026", notes: { contains: q, mode: "insensitive" } },
  });

  // Total de colaboradores com city NULL
  const nullCityCount = await db.collaborator.count({
    where: { campaignId: "andre-santos-2026", city: null },
  });

  // Top 30 cidades por count
  const topCities = await db.collaborator.groupBy({
    by: ["city"],
    where: { campaignId: "andre-santos-2026", city: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { city: "desc" } },
    take: 30,
  });

  return NextResponse.json({
    ok: true,
    query: q,
    variants,
    mapaStatsWillReturn: mapaStatsAgg,
    cityFieldDiagnostics: {
      citiesStartingWithChar_count: allCitiesStartingWithChar.length,
      citiesStartingWithChar: allCitiesStartingWithChar.map((c) => c.city).slice(0, 30),
      nullCityCount,
      leakedToName,
      leakedToNeighborhood,
      leakedToNotes,
      top30Cities: topCities.map((t) => ({ city: t.city, count: t._count._all })),
    },
  });
}
