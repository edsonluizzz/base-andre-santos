import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/events/rsvp — próximos eventos com status de confirmação do membro logado
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user.establishmentId;
    const member = await db.member.findUnique({ where: { userId: session.user.id } });

    const events = await db.event.findMany({
      where: { establishmentId: eid, date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 10,
      include: {
        rsvps: member ? { where: { memberId: member.id }, select: { id: true } } : false,
        _count: { select: { rsvps: true } },
      },
    });

    return NextResponse.json(
      events.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        date: e.date,
        location: e.location,
        rsvpCount: e._count.rsvps,
        myRsvp: member ? (e.rsvps as { id: string }[]).length > 0 : false,
      }))
    );
  } catch (err) {
    console.error("[events/rsvp GET] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/events/rsvp — confirmar presença
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { eventId } = await req.json();
    if (!eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });

    const member = await db.member.findUnique({ where: { userId: session.user.id } });
    if (!member) return NextResponse.json({ error: "Membro não vinculado a esta conta" }, { status: 404 });

    await db.eventRsvp.upsert({
      where: { eventId_memberId: { eventId, memberId: member.id } },
      update: {},
      create: { eventId, memberId: member.id },
    });

    return NextResponse.json({ confirmed: true });
  } catch (err) {
    console.error("[events/rsvp POST] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/events/rsvp?eventId=xxx — cancelar confirmação
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId = new URL(req.url).searchParams.get("eventId");
    if (!eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });

    const member = await db.member.findUnique({ where: { userId: session.user.id } });
    if (!member) return NextResponse.json({ error: "Membro não vinculado" }, { status: 404 });

    await db.eventRsvp.deleteMany({ where: { eventId, memberId: member.id } });
    return NextResponse.json({ confirmed: false });
  } catch (err) {
    console.error("[events/rsvp DELETE] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
