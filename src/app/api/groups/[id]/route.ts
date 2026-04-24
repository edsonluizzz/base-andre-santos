import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await db.whatsAppGroup.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { name, inviteLink, description, zoneId } = await req.json();
    const updated = await db.whatsAppGroup.update({
      where: { id: params.id },
      data: { ...(name && { name: name.trim() }), inviteLink: inviteLink?.trim() || null, description: description?.trim() || null, zoneId: zoneId || null },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[group PUT]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await db.whatsAppGroup.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.whatsAppGroup.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[group DELETE]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
