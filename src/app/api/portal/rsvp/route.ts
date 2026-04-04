import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/portal/rsvp — confirmar presença em evento
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });

  const member = await db.member.findUnique({ where: { userId: session.user.id } });
  if (!member) return NextResponse.json({ error: "Membro não vinculado" }, { status: 404 });

  await db.eventRsvp.upsert({
    where: { eventId_memberId: { eventId, memberId: member.id } },
    update: {},
    create: { eventId, memberId: member.id },
  });

  return NextResponse.json({ confirmed: true });
}

// DELETE /api/portal/rsvp — cancelar confirmação
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });

  const member = await db.member.findUnique({ where: { userId: session.user.id } });
  if (!member) return NextResponse.json({ error: "Membro não vinculado" }, { status: 404 });

  await db.eventRsvp.deleteMany({ where: { eventId, memberId: member.id } });
  return NextResponse.json({ confirmed: false });
}
