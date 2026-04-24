import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const broadcasts = await db.broadcast.findMany({
      where: { campaignId: CID },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(broadcasts);
  } catch (err) {
    console.error("[broadcasts GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, message, audience } = await req.json();
    if (!title?.trim() || !message?.trim()) return NextResponse.json({ error: "Título e mensagem obrigatórios" }, { status: 400 });

    const broadcast = await db.broadcast.create({
      data: { campaignId: CID, title: title.trim(), message: message.trim(), audience: audience ?? "ALL", createdBy: session.user.id },
    });
    return NextResponse.json(broadcast, { status: 201 });
  } catch (err) {
    console.error("[broadcasts POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
