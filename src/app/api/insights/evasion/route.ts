import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";

    // 1. Buscar os últimos 3 eventos da congregação (que já tiveram chamada)
    const last3Events = await db.event.findMany({
      where: { 
        establishmentId: eid,
        date: { lt: new Date() },
        attendances: { some: {} } // Somente eventos que tiveram registros de chamada
      },
      orderBy: { date: "desc" },
      take: 3,
      select: { id: true, title: true, date: true }
    });

    if (last3Events.length < 3) {
      return NextResponse.json({ members: [], message: "Dados insuficientes (menos de 3 eventos registrados)." });
    }

    const eventIds = last3Events.map(e => e.id);

    // 2. Buscar todos os membros ativos
    const activeMembers = await db.member.findMany({
      where: { establishmentId: eid, status: "ACTIVE" },
      select: { id: true, name: true, phone: true }
    });

    // 3. Verificar presença de cada membro nesses 3 eventos
    const membersAtRisk = [];

    for (const member of activeMembers) {
      const records = await db.attendance.findMany({
        where: {
          memberId: member.id,
          eventId: { in: eventIds }
        },
        select: { status: true }
      });

      // Se o membro faltou (ABSENT) em todos os 3 registros encontrados
      // Ou se nem há registro (o que também conta como falta se o evento aconteceu)
      const absences = records.filter(r => r.status === "ABSENT").length;
      const missingRecords = eventIds.length - records.length;

      if (absences + missingRecords === 3) {
        membersAtRisk.push({
          id: member.id,
          name: member.name,
          phone: member.phone,
          lastEvents: last3Events.map(e => e.title)
        });
      }
    }

    return NextResponse.json({ 
      members: membersAtRisk, 
      eventsAnalyzed: last3Events 
    });
  } catch (error) {
    console.error("[insights/evasion] erro:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
