import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [instagram, youtube] = await Promise.all([
      db.socialMetric.findMany({
        where: { platform: "INSTAGRAM" },
        orderBy: { recordedAt: "desc" },
        take: 10,
      }),
      db.socialMetric.findMany({
        where: { platform: "YOUTUBE" },
        orderBy: { recordedAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({ instagram, youtube });
  } catch (err) {
    console.error("[social-metrics GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { platform, followers, posts, views, engRate } = await req.json();

    if (!["INSTAGRAM", "YOUTUBE"].includes(platform)) {
      return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 });
    }

    const metric = await db.socialMetric.create({
      data: {
        platform,
        followers: followers ? Number(followers) : null,
        posts: posts ? Number(posts) : null,
        views: views ? Number(views) : null,
        engRate: engRate ? Number(engRate) : null,
        recordedBy: session.user.id,
      },
    });

    return NextResponse.json(metric, { status: 201 });
  } catch (err) {
    console.error("[social-metrics POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
