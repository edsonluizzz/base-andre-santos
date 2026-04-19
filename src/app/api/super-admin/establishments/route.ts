import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";


export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.isSuperAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [establishments, memberCounts, userCounts, eventCounts, ministryCounts] = await Promise.all([
      db.establishment.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          id: true, name: true, pixKey: true, suspended: true, plan: true,
          adminNote: true, joinCode: true, createdAt: true,
          stripeCustomerId: true, stripeSubscriptionId: true, stripePriceId: true,
          stripeStatus: true, trialEndsAt: true, currentPeriodEnd: true, cancelAtPeriodEnd: true,
          updatedAt: true,
        },
      }),
      db.member.groupBy({ by: ["establishmentId"], _count: { _all: true } }),
      db.user.groupBy({ by: ["establishmentId"], _count: { _all: true } }),
      db.event.groupBy({ by: ["establishmentId"], _count: { _all: true } }),
      db.ministry.groupBy({ by: ["establishmentId"], _count: { _all: true } }),
    ]);

    const toMap = (rows: { establishmentId: string; _count: { _all: number } }[]) =>
      new Map(rows.map((r) => [r.establishmentId, r._count._all]));

    const memberMap = toMap(memberCounts);
    const userMap = toMap(userCounts);
    const eventMap = toMap(eventCounts);
    const ministryMap = toMap(ministryCounts);

    const enriched = establishments.map((est) => ({
      ...est,
      memberCount: memberMap.get(est.id) ?? 0,
      userCount: userMap.get(est.id) ?? 0,
      eventCount: eventMap.get(est.id) ?? 0,
      ministryCount: ministryMap.get(est.id) ?? 0,
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.isSuperAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, name, pixKey } = await req.json();
    if (!id?.trim() || !name?.trim())
      return NextResponse.json({ error: "id e name são obrigatórios" }, { status: 400 });

    let joinCode = generateJoinCode();
    for (let i = 0; i < 10; i++) {
      const exists = await db.establishment.findUnique({ where: { joinCode } });
      if (!exists) break;
      joinCode = generateJoinCode();
    }

    const establishment = await db.establishment.create({
      data: { id: id.trim(), name: name.trim(), pixKey: pixKey?.trim() || null, joinCode },
    });
    return NextResponse.json(establishment, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002")
      return NextResponse.json({ error: "ID já existe" }, { status: 409 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
