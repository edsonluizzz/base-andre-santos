import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user.establishmentId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const canFinancial = await hasPermission(session.user.role as Role, "FINANCIAL", "VIEW", eid);

    // All queries in parallel
    const [
      members,
      events,
      establishment,
      evasionEvents,
      offeringsTotal,
      expensesTotal,
    ] = await Promise.all([
      db.member.findMany({
        where: { establishmentId: eid, deletedAt: null },
        select: { id: true, name: true, birthday: true, status: true },
      }),
      db.event.findMany({
        where: { establishmentId: eid },
        select: { id: true, title: true, type: true, date: true },
        orderBy: { date: "asc" },
      }),
      db.establishment.findUnique({
        where: { id: eid },
        select: { name: true, joinCode: true, logoBase64: true },
      }),
      // Evasion: last 3 events with attendance records
      db.event.findMany({
        where: { establishmentId: eid, date: { lt: now }, attendances: { some: {} } },
        orderBy: { date: "desc" },
        take: 3,
        select: { id: true, title: true, date: true },
      }),
      canFinancial
        ? db.offering.aggregate({
            where: { establishmentId: eid, date: { gte: monthStart, lte: monthEnd } },
            _sum: { amount: true },
          })
        : Promise.resolve(null),
      canFinancial
        ? db.expense.aggregate({
            where: { establishmentId: eid, date: { gte: monthStart, lte: monthEnd } },
            _sum: { amount: true },
          })
        : Promise.resolve(null),
    ]);

    // Evasion analysis
    const evasion: { members: { id: string; name: string; phone: string | null; lastEvents: string[] }[]; eventsAnalyzed: typeof evasionEvents } = {
      members: [],
      eventsAnalyzed: evasionEvents,
    };

    if (evasionEvents.length >= 3) {
      const eventIds = evasionEvents.map((e) => e.id);
      const activeMembers = members.filter((m) => m.status === "ACTIVE");
      const allAttendances = await db.attendance.findMany({
        where: { eventId: { in: eventIds } },
        select: { memberId: true, status: true },
      });

      const byMember = new Map<string, { status: string }[]>();
      for (const a of allAttendances) {
        const list = byMember.get(a.memberId) ?? [];
        list.push({ status: a.status });
        byMember.set(a.memberId, list);
      }

      evasion.members = activeMembers
        .filter((m) => {
          const records = byMember.get(m.id) ?? [];
          const absences = records.filter((r) => r.status === "ABSENT").length;
          return absences + (eventIds.length - records.length) === 3;
        })
        .map((m) => ({
          id: m.id,
          name: m.name,
          phone: null,
          lastEvents: evasionEvents.map((e) => e.title),
        }));
    }

    return NextResponse.json({
      members,
      events,
      settings: {
        hasJoinCode: !!establishment?.joinCode,
        hasLogo: !!establishment?.logoBase64,
      },
      evasion,
      financial: canFinancial
        ? {
            offeringsTotal: offeringsTotal?._sum?.amount ?? 0,
            expensesTotal: expensesTotal?._sum?.amount ?? 0,
          }
        : null,
    });
  } catch (err) {
    console.error("[dashboard/summary] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
