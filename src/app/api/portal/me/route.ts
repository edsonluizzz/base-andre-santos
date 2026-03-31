import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
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

  const total = member.attendances.length;
  const present = member.attendances.filter((a) => a.status === "PRESENT").length;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : null;

  const allActive = await db.member.findMany({
    where: { status: "ACTIVE" },
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
    shirtOrders: member.shirtOrders.map((o) => ({
      id: o.id,
      size: o.size,
      quantity: o.quantity,
      paidAmount: Number(o.paidAmount),
      totalAmount: Number(o.totalAmount),
      status: o.status,
      congress: {
        id: o.congress.id,
        name: o.congress.name,
        date: o.congress.date,
      },
    })),
  });
}
