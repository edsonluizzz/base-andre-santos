import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await db.member.findUnique({
      where: { userId: session.user.id },
      include: {
        attendances: {
          include: { event: true },
          orderBy: { event: { date: "desc" } },
          take: 20,
        },
        shirtOrders: {
          include: { congress: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!member) return NextResponse.json({ linked: false });

    const upcomingEvents = await db.event.findMany({
      where: {
        establishmentId: session.user.establishmentId,
        date: { gte: new Date() },
      },
      orderBy: { date: "asc" },
      take: 10,
      include: {
        rsvps: { where: { memberId: member.id }, select: { id: true } },
        _count: { select: { rsvps: true } },
      },
    });

    const total = member.attendances.length;
    const present = member.attendances.filter((a) => a.status === "PRESENT").length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : null;

    const allActive = await db.member.findMany({
      where: { status: "ACTIVE", establishmentId: session.user.establishmentId },
      include: { attendances: { select: { status: true } } },
    });

    const ranked = allActive
      .map((m) => {
        const t = m.attendances.length;
        const p = m.attendances.filter((a) => a.status === "PRESENT").length;
        return { id: m.id, rate: t > 0 ? (p / t) * 100 : 0 };
      })
      .sort((a, b) => b.rate - a.rate);

    const rankPosition = ranked.findIndex((r) => r.id === member.id) + 1;

    return NextResponse.json({
      linked: true,
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone,
        photoUrl: member.photoUrl,
        birthday: member.birthday,
        status: member.status,
      },
      attendances: member.attendances.map((a) => ({
        id: a.id,
        status: a.status,
        event: {
          id: a.event.id,
          title: a.event.title,
          type: a.event.type,
          date: a.event.date,
        },
      })),
      stats: {
        total,
        present,
        attendanceRate,
        rankPosition,
        totalActive: allActive.length,
      },
      upcomingEvents: upcomingEvents.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        date: e.date,
        rsvpConfirmed: e.rsvps.length > 0,
        rsvpCount: e._count.rsvps,
      })),
      shirtOrders: member.shirtOrders.map((o) => ({
        id: o.id,
        size: o.size,
        quantity: o.quantity,
        paidAmount: Number(o.paidAmount),
        totalAmount: Number(o.totalAmount),
        status: o.status,
        paymentProofUrl: o.paymentProofUrl,
        paymentProofUploadedAt: o.paymentProofUploadedAt,
        congress: {
          id: o.congress.id,
          name: o.congress.name,
          date: o.congress.date,
          shirtArtUrl: o.congress.shirtArtUrl,
          shirtPricing: o.congress.shirtPricing as Record<string, number> | null,
        },
      })),
      openCongresses: await db.congress.findMany({
        where: {
          establishmentId: session.user.establishmentId,
          status: "OPEN",
          shirtOrders: { none: { memberId: member.id } },
        },
        select: {
          id: true,
          name: true,
          date: true,
          shirtArtUrl: true,
          shirtPricing: true,
        },
        orderBy: { date: "asc" },
      }),
    });
  } catch (err) {
    console.error("[portal/me] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
