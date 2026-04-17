import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { AttendanceStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { eventId, attendances } = body;

    if (!eventId || !Array.isArray(attendances)) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (attendances.length > 500) {
      return NextResponse.json({ error: "Lote muito grande" }, { status: 400 });
    }

    const result = await db.$transaction(
      async (tx) => {
        const results = [];
        for (const { memberId, status, justification } of attendances as { memberId: string; status: string; justification?: string }[]) {
          results.push(
            await tx.attendance.upsert({
              where: { eventId_memberId: { eventId, memberId } },
              update: { status: status as AttendanceStatus, justification: justification ?? null },
              create: { eventId, memberId, status: status as AttendanceStatus, justification: justification ?? null },
            })
          );
        }
        return results;
      },
      { timeout: 30000 }
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
