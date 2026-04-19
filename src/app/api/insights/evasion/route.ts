import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user?.establishmentId ?? "";

    const last3Events = await db.event.findMany({
      where: {
        establishmentId: eid,
        date: { lt: new Date() },
        attendances: { some: {} },
      },
      orderBy: { date: "desc" },
      take: 3,
      select: { id: true, title: true, date: true },
    });

    if (last3Events.length < 3) {
      return NextResponse.json({ members: [], message: "Dados insuficientes (menos de 3 eventos registrados)." });
    }

    const eventIds = last3Events.map((e) => e.id);

    const [activeMembers, allAttendances] = await Promise.all([
      db.member.findMany({
        where: { establishmentId: eid, status: "ACTIVE" },
        select: { id: true, name: true, phone: true },
      }),
      db.attendance.findMany({
        where: { eventId: { in: eventIds } },
        select: { memberId: true, eventId: true, status: true },
      }),
    ]);

    // Group attendance records by memberId
    const byMember = new Map<string, { status: string }[]>();
    for (const a of allAttendances) {
      const list = byMember.get(a.memberId) ?? [];
      list.push({ status: a.status });
      byMember.set(a.memberId, list);
    }

    const membersAtRisk = activeMembers.filter((member) => {
      const records = byMember.get(member.id) ?? [];
      const absences = records.filter((r) => r.status === "ABSENT").length;
      const missingRecords = eventIds.length - records.length;
      return absences + missingRecords === 3;
    }).map((member) => ({
      id: member.id,
      name: member.name,
      phone: member.phone,
      lastEvents: last3Events.map((e) => e.title),
    }));

    return NextResponse.json({ members: membersAtRisk, eventsAnalyzed: last3Events });
  } catch (error) {
    console.error("[insights/evasion] erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
