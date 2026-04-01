import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const event = await db.event.findFirst({
      where: { id: params.id, establishmentId: eid },
      include: {
        attendances: { include: { member: true } },
        offerings: { include: { member: true } },
      },
    });

    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Optional insights: for absent members, count absences in previous 5 events
    if (req.nextUrl.searchParams.get("insights") === "true") {
      const absentAttendances = event.attendances.filter((a) => a.status === "ABSENT");
      const absentMemberIds = absentAttendances.map((a) => a.memberId);

      if (absentMemberIds.length > 0) {
        const prev5 = await db.event.findMany({
          where: { date: { lt: event.date }, establishmentId: eid },
          orderBy: { date: "desc" },
          take: 5,
          select: { id: true },
        });

        const prev5Ids = prev5.map((e) => e.id);

        const history = await db.attendance.findMany({
          where: {
            eventId: { in: prev5Ids },
            memberId: { in: absentMemberIds },
          },
          select: { memberId: true, status: true },
        });

        const absenceCount: Record<string, number> = {};
        for (const id of absentMemberIds) {
          const memberHistory = history.filter((h) => h.memberId === id);
          const absentInHistory = memberHistory.filter((h) => h.status === "ABSENT").length;
          const notRecorded = prev5Ids.length - memberHistory.length;
          absenceCount[id] = absentInHistory + notRecorded;
        }

        const insights = absentAttendances
          .map((a) => ({
            memberId: a.memberId,
            name: a.member.name,
            absencesInLast5: absenceCount[a.memberId] ?? 0,
            totalPrev: prev5Ids.length,
          }))
          .filter((i) => i.absencesInLast5 >= 2)
          .sort((a, b) => b.absencesInLast5 - a.absencesInLast5);

        return NextResponse.json({ ...event, insights });
      }

      return NextResponse.json({ ...event, insights: [] });
    }

    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const existing = await db.event.findFirst({ where: { id: params.id, establishmentId: eid } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.event.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
