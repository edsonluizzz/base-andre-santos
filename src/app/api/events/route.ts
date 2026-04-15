import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notifyEventCreated } from "@/lib/event-notifications";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const { searchParams } = new URL(req.url);
    const ministryId = searchParams.get("ministryId");

    const events = await db.event.findMany({
      where: {
        establishmentId: eid,
        ...(ministryId ? { ministryId } : {}),
      },
      orderBy: { date: "desc" },
      include: {
        _count: { select: { attendances: true, offerings: true, rsvps: true } },
      },
    });
    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { title, type, date, location, notes, ministryId } = body;

    if (!title?.trim() || !type || !date) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const event = await db.event.create({
      data: {
        title: title.trim(),
        type,
        date: new Date(date),
        location: location?.trim() || null,
        notes: notes?.trim() || null,
        establishmentId: eid,
        ministryId: ministryId || null,
      },
    });

    // Disparar notificações de forma assíncrona (fire-and-forget)
    const establishment = await db.establishment.findUnique({
      where: { id: eid },
      select: { name: true },
    });
    notifyEventCreated(event, establishment?.name ?? "sua congregação").catch((err) =>
      console.error("[events] erro ao notificar evento criado:", err)
    );

    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
