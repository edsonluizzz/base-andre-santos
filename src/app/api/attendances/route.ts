import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { AttendanceStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { eventId, attendances } = body;
  // attendances: [{ memberId, status }]

  if (!eventId || !Array.isArray(attendances)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // Upsert all attendance records
  const ops = attendances.map(({ memberId, status }: { memberId: string; status: string }) =>
    db.attendance.upsert({
      where: { eventId_memberId: { eventId, memberId } },
      update: { status: status as AttendanceStatus },
      create: { eventId, memberId, status: status as AttendanceStatus },
    })
  );

  const result = await db.$transaction(ops);
  return NextResponse.json(result);
}
