import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function getMemberIdByUser(userId: string): Promise<string | null> {
  const m = await db.member.findUnique({ where: { userId }, select: { id: true } });
  return m?.id ?? null;
}

// GET: próximos eventos com status RSVP do membro autenticado
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eid = session.user.establishmentId;
  const memberId = await getMemberIdByUser(session.user.id);

  const now = new Date();
  const upcoming = await db.event.findMany({
    where: { establishmentId: eid, date: { gte: now } },
    orderBy: { date: "asc" },
    take: 10,
    include: { eventRsvps: { select: { memberId: true } } },
  });

  return NextResponse.json(
    upcoming.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      date: e.date,
      location: e.location,
      rsvpCount: e.eventRsvps.length,
      myRsvp: memberId ? e.eventRsvps.some((r) => r.memberId === memberId) : false,
    }))
  );
}

// POST: confirmar presença (RSVP)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = await getMemberIdByUser(session.user.id);
  if (!memberId) return NextResponse.json({ error: "Membro não vinculado" }, { status: 400 });

  const { eventId } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });

  await db.eventRsvp.upsert({
    where: { eventId_memberId: { eventId, memberId } },
    update: {},
    create: { eventId, memberId },
  });

  return NextResponse.json({ success: true });
}

// DELETE: cancelar RSVP
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = await getMemberIdByUser(session.user.id);
  if (!memberId) return NextResponse.json({ error: "Membro não vinculado" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });

  await db.eventRsvp.deleteMany({ where: { eventId, memberId } });

  return NextResponse.json({ success: true });
}
