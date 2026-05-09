import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendTelegram, buildEventNotification } from "@/lib/telegram";

const CID = "andre-santos-2026";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await db.event.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { title, type, date, location, notes, zoneId } = await req.json();
    const updated = await db.event.update({
      where: { id: params.id },
      data: {
        ...(title && { title: title.trim() }),
        ...(type && { type }),
        ...(date && { date: new Date(date) }),
        location: location?.trim() || null,
        notes: notes?.trim() || null,
        zoneId: zoneId || null,
      },
      include: { zone: { select: { name: true } } },
    });

    // Notifica Telegram se o evento for hoje
    const today = new Date();
    const evDate = new Date(updated.date);
    if (evDate.toDateString() === today.toDateString()) {
      sendTelegram(buildEventNotification("atualizado", { ...updated, date: updated.date.toISOString() })).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[event PUT]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await db.event.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Notifica Telegram se o evento for hoje (antes de deletar)
    const today = new Date();
    if (existing.date.toDateString() === today.toDateString()) {
      sendTelegram(buildEventNotification("removido", { ...existing, date: existing.date.toISOString() })).catch(() => {});
    }

    await db.event.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[event DELETE]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
