import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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

    const [postsRes, reelsRes, avgReachRes, avgEngRes] = await Promise.all([
      fetch(`${BASE}/v2/analytics/posts/instagram?from=${from}&to=${to}&timezone=${tz}`, { headers: h }),
      fetch(`${BASE}/v2/analytics/reels/instagram?from=${from}&to=${to}&timezone=${tz}`, { headers: h }),
      fetch(`${BASE}/v2/analytics/aggregation?network=instagram&metric=reach&subject=posts&from=${from}&to=${to}&timezone=${tz}`, { headers: h }),
      fetch(`${BASE}/v2/analytics/aggregation?network=instagram&metric=engagement&subject=posts&from=${from}&to=${to}&timezone=${tz}`, { headers: h }),
    ]);

    const [postsData, reelsData, avgReachData, avgEngData] = await Promise.all([
      postsRes.json(),
      reelsRes.json(),
      avgReachRes.json(),
      avgEngRes.json(),
    ]);

    return NextResponse.json(
      {
        posts: postsData.data ?? [],
        reels: reelsData.data ?? [],
        avgReach: avgReachData.data ?? 0,
        avgEngagement: avgEngData.data ?? 0,
      },
      { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("[metricool/instagram] erro:", err);
    return NextResponse.json({ error: "Erro ao buscar dados do Metricool" }, { status: 500 });
  }
}
