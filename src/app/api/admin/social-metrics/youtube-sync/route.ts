import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CHANNEL_HANDLE = "AndreSantos777";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "YOUTUBE_API_KEY não configurada. Adicione a variável de ambiente no Vercel." },
        { status: 422 }
      );
    }

    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${CHANNEL_HANDLE}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Falha ao buscar dados do YouTube" }, { status: 502 });
    }

    const data = await res.json();
    const stats = data?.items?.[0]?.statistics;
    if (!stats) {
      return NextResponse.json({ error: "Canal não encontrado ou sem estatísticas" }, { status: 404 });
    }

    const metric = await db.socialMetric.create({
      data: {
        platform: "YOUTUBE",
        followers: stats.subscriberCount ? parseInt(stats.subscriberCount) : null,
        posts: stats.videoCount ? parseInt(stats.videoCount) : null,
        views: stats.viewCount ? parseInt(stats.viewCount) : null,
        recordedBy: session.user.id,
      },
    });

    return NextResponse.json({ ok: true, metric });
  } catch (err) {
    console.error("[youtube-sync]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
