import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { eventId } = params;

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, date: true, establishmentId: true },
    });
    if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

    // Verifica se o usuário tem vínculo com este estabelecimento
    const ue = await db.userEstablishment.findFirst({
      where: { userId: session.user.id, establishmentId: event.establishmentId, inviteStatus: "ACCEPTED" },
    });
    if (!ue) return NextResponse.json({ error: "Você não pertence a esta congregação" }, { status: 403 });

    // Encontra o membro: por userId (preferencial) ou por email
    let member = await db.member.findFirst({
      where: { userId: session.user.id, establishmentId: event.establishmentId, status: "ACTIVE" },
    });

    if (!member && session.user.email) {
      member = await db.member.findFirst({
        where: { email: session.user.email, establishmentId: event.establishmentId, status: "ACTIVE" },
      });
      // Aproveita e vincula o userId ao membro encontrado por email
      if (member) {
        await db.member.update({ where: { id: member.id }, data: { userId: session.user.id } }).catch(() => {});
      }
    }

    if (!member) {
      return NextResponse.json(
        { error: "Você não está cadastrado como membro ativo desta congregação" },
        { status: 404 }
      );
    }

    await db.attendance.upsert({
      where: { eventId_memberId: { eventId: event.id, memberId: member.id } },
      update: { status: "PRESENT" },
      create: { eventId: event.id, memberId: member.id, status: "PRESENT" },
    });

    return NextResponse.json({ ok: true, memberName: member.name, eventTitle: event.title });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const event = await db.event.findUnique({
      where: { id: params.eventId },
      select: { id: true, title: true, date: true, type: true, location: true, establishmentId: true },
    });
    if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

    // Verifica acesso
    const ue = await db.userEstablishment.findFirst({
      where: { userId: session.user.id, establishmentId: event.establishmentId, inviteStatus: "ACCEPTED" },
    });
    if (!ue) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    // Verifica se já registrou presença
    const member = await db.member.findFirst({
      where: {
        OR: [
          { userId: session.user.id, establishmentId: event.establishmentId },
          { email: session.user.email ?? undefined, establishmentId: event.establishmentId },
        ],
        status: "ACTIVE",
      },
    });

    let alreadyPresent = false;
    if (member) {
      const att = await db.attendance.findFirst({
        where: { eventId: event.id, memberId: member.id, status: "PRESENT" },
      });
      alreadyPresent = !!att;
    }

    return NextResponse.json({ event, memberName: member?.name ?? null, alreadyPresent });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
