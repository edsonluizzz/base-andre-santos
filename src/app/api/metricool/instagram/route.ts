import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const BASE = "https://app.metricool.com/api";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = process.env.METRICOOL_TOKEN;
    if (!token) return NextResponse.json({ error: "Metricool não configurado" }, { status: 503 });

    const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") ?? "30"), 90);
    const tz = "America/Sao_Paulo";
    const now = new Date();
    const to = now.toISOString().replace(/\.\d{3}Z$/, "");
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace(/\.\d{3}Z$/, "");

    const h = { "X-Mc-Auth": token, Accept: "application/json" };

    const CID = "andre-santos-2026";
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const [postsRes, reelsRes, avgReachRes, avgEngRes, collabsRaw] = await Promise.all([
      fetch(`${BASE}/v2/analytics/posts/instagram?from=${from}&to=${to}&timezone=${tz}`, { headers: h }),
      fetch(`${BASE}/v2/analytics/reels/instagram?from=${from}&to=${to}&timezone=${tz}`, { headers: h }),
      fetch(`${BASE}/v2/analytics/aggregation?network=instagram&metric=reach&subject=posts&from=${from}&to=${to}&timezone=${tz}`, { headers: h }),
      fetch(`${BASE}/v2/analytics/aggregation?network=instagram&metric=engagement&subject=posts&from=${from}&to=${to}&timezone=${tz}`, { headers: h }),
      db.collaborator.findMany({
        where: { campaignId: CID, createdAt: { gte: fromDate, lte: toDate } },
        select: { createdAt: true },
      }),
    ]);

    const [postsData, reelsData, avgReachData, avgEngData] = await Promise.all([
      postsRes.json(),
      reelsRes.json(),
      avgReachRes.json(),
      avgEngRes.json(),
    ]);

    // Agrupa cadastros por dia (America/Sao_Paulo = UTC-3)
    const byDay = new Map<string, number>();
    for (const c of collabsRaw) {
      const d = new Date(c.createdAt.getTime() - 3 * 60 * 60 * 1000);
      const day = d.toISOString().split("T")[0];
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const dailyCadastros = Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(
      {
        posts: postsData.data ?? [],
        reels: reelsData.data ?? [],
        avgReach: avgReachData.data ?? 0,
        avgEngagement: avgEngData.data ?? 0,
        dailyCadastros,
      },
      { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("[metricool/instagram] erro:", err);
    return NextResponse.json({ error: "Erro ao buscar dados do Metricool" }, { status: 500 });
  }
}
