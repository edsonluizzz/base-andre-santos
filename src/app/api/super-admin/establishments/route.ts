import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";


export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.isSuperAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const establishments = await db.establishment.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true, name: true, pixKey: true, suspended: true, plan: true,
        adminNote: true, joinCode: true, createdAt: true,
        stripeCustomerId: true, stripeSubscriptionId: true, stripePriceId: true,
        stripeStatus: true, trialEndsAt: true, currentPeriodEnd: true, cancelAtPeriodEnd: true,
        updatedAt: true,
      },
    });

    // Attach stats to each establishment
    const enriched = await Promise.all(
      establishments.map(async (est) => {
        const [memberCount, userCount, eventCount, ministryCount] = await Promise.all([
          db.member.count({ where: { establishmentId: est.id } }),
          db.user.count({ where: { establishmentId: est.id } }),
          db.event.count({ where: { establishmentId: est.id } }),
          db.ministry.count({ where: { establishmentId: est.id } }),
        ]);
        return { ...est, memberCount, userCount, eventCount, ministryCount };
      })
    );

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    // Gera join code único automaticamente
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
