import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCampaignIntegrations } from "@/lib/meta-db";

const BASE = "https://app.metricool.com/api";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);

    // Token Metricool POR CAMPANHA — env global é fallback APENAS para André enquanto não migra.
    const integrations = await getCampaignIntegrations(cid);
    const isAndre = cid === "andre-santos-2026";
    const token = integrations.metricoolToken ?? (isAndre ? process.env.METRICOOL_TOKEN : null);
    if (!token) {
      return NextResponse.json({ error: "Metricool não conectado para esta campanha" }, { status: 503 });
    }

    const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") ?? "30"), 90);
    const tz = "America/Sao_Paulo";
    const now = new Date();
    const to = now.toISOString().replace(/\.\d{3}Z$/, "");
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace(/\.\d{3}Z$/, "");

    const h = { "X-Mc-Auth": token, Accept: "application/json" };
    const blogParam = integrations.metricoolBlogId ? `&blogId=${integrations.metricoolBlogId}` : "";

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const [postsRes, reelsRes, storiesRes, avgReachRes, avgEngRes, instagramCount] = await Promise.all([
      fetch(`${BASE}/v2/analytics/posts/instagram?from=${from}&to=${to}&timezone=${tz}${blogParam}`, { headers: h }),
      fetch(`${BASE}/v2/analytics/reels/instagram?from=${from}&to=${to}&timezone=${tz}${blogParam}`, { headers: h }),
      fetch(`${BASE}/v2/analytics/stories/instagram?from=${from}&to=${to}&timezone=${tz}${blogParam}`, { headers: h }),
      fetch(`${BASE}/v2/analytics/aggregation?network=instagram&metric=reach&subject=posts&from=${from}&to=${to}&timezone=${tz}${blogParam}`, { headers: h }),
      fetch(`${BASE}/v2/analytics/aggregation?network=instagram&metric=engagement&subject=posts&from=${from}&to=${to}&timezone=${tz}${blogParam}`, { headers: h }),
      db.collaborator.count({
        where: { campaignId: cid, createdAt: { gte: fromDate, lte: toDate }, channel: "INSTAGRAM" },
      }),
    ]);

    const storiesText = await storiesRes.text();

    const [postsData, reelsData, avgReachData, avgEngData] = await Promise.all([
      postsRes.json(),
      reelsRes.json(),
      avgReachRes.json(),
      avgEngRes.json(),
    ]);

    let storiesData: { data?: unknown[] } = { data: [] };
    try { storiesData = JSON.parse(storiesText); } catch { /* endpoint pode não existir ainda */ }

    return NextResponse.json(
      {
        posts: postsData.data ?? [],
        reels: reelsData.data ?? [],
        stories: storiesData.data ?? [],
        avgReach: avgReachData.data ?? 0,
        avgEngagement: avgEngData.data ?? 0,
        instagramCadastros: instagramCount,
      },
      { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("[metricool/instagram] erro:", err);
    return NextResponse.json({ error: "Erro ao buscar dados do Metricool" }, { status: 500 });
  }
}
