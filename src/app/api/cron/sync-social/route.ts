import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const CHANNEL_HANDLE = "AndreSantos777";

export async function GET(req: NextRequest) {
  // Vercel assina crons com Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY não configurada" }, { status: 422 });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${CHANNEL_HANDLE}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Falha ao buscar YouTube" }, { status: 502 });
    }
    const data = await res.json();
    const stats = data?.items?.[0]?.statistics;
    if (!stats) {
      return NextResponse.json({ error: "Canal não encontrado" }, { status: 404 });
    }

    const metric = await db.socialMetric.create({
      data: {
        platform: "YOUTUBE",
        followers: stats.subscriberCount ? parseInt(stats.subscriberCount) : null,
        posts:     stats.videoCount     ? parseInt(stats.videoCount)     : null,
        views:     stats.viewCount      ? parseInt(stats.viewCount)      : null,
        recordedBy: "cron",
      },
    });

    console.log("[cron/sync-social] YouTube synced:", metric.followers, "inscritos");
    return NextResponse.json({ ok: true, platform: "YOUTUBE", followers: metric.followers });
  } catch (err) {
    console.error("[cron/sync-social]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
