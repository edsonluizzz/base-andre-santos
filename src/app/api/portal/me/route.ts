import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user.establishmentId;

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

    // Fetch all dependent data in parallel
    const [upcomingEvents, presentCounts, totalCounts, activeCount, openCongresses] = await Promise.all([
      db.event.findMany({
        where: { establishmentId: eid, date: { gte: new Date() } },
        orderBy: { date: "asc" },
        take: 10,
        include: {
          rsvps: { where: { memberId: member.id }, select: { id: true } },
          _count: { select: { rsvps: true } },
        },
      }),
      db.attendance.groupBy({
        by: ["memberId"],
        where: { status: "PRESENT", member: { status: "ACTIVE", establishmentId: eid } },
        _count: { _all: true },
      }),
      db.attendance.groupBy({
        by: ["memberId"],
        where: { member: { status: "ACTIVE", establishmentId: eid } },
        _count: { _all: true },
      }),
      db.member.count({ where: { status: "ACTIVE", establishmentId: eid } }),
      db.congress.findMany({
        where: {
          establishmentId: eid,
          status: "OPEN",
          shirtOrders: { none: { memberId: member.id } },
        },
        select: { id: true, name: true, date: true, shirtArtUrl: true, shirtPricing: true },
        orderBy: { date: "asc" },
      }),
    ]);

    // Calculate rank from aggregated data
    const presentMap = new Map(presentCounts.map((r) => [r.memberId, r._count._all]));
    const totalMap = new Map(totalCounts.map((r) => [r.memberId, r._count._all]));

    const myTotal = totalMap.get(member.id) ?? 0;
    const myPresent = presentMap.get(member.id) ?? 0;
    const myRate = myTotal > 0 ? myPresent / myTotal : 0;

    // Count members with a strictly higher rate
    let betterCount = 0;
    totalMap.forEach((total, mid) => {
      if (mid === member.id) return;
      const present = presentMap.get(mid) ?? 0;
      const rate = total > 0 ? present / total : 0;
      if (rate > myRate) betterCount++;
    });
    const rankPosition = betterCount + 1;

    const total = member.attendances.length;
    const present = member.attendances.filter((a) => a.status === "PRESENT").length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : null;

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
        totalActive: activeCount,
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
      openCongresses,
    });
  } catch (err) {
    console.error("[portal/me] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
