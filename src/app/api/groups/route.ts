import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const groups = await db.whatsAppGroup.findMany({
      where: { campaignId: CID },
      include: {
        zone: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(groups);
  } catch (err) {
    console.error("[groups GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, inviteLink, description, zoneId } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    const group = await db.whatsAppGroup.create({
      data: { campaignId: CID, name: name.trim(), inviteLink: inviteLink?.trim() || null, description: description?.trim() || null, zoneId: zoneId || null },
    });
    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    console.error("[groups POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
