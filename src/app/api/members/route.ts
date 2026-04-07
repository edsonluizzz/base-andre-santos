import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const members = await db.member.findMany({
      where: { establishmentId: eid, deletedAt: null },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(members);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, birthday, phone, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const eid = session.user?.establishmentId ?? "default-porto-belo";

    // Enforce free plan limit of 10 members
    const est = await db.establishment.findUnique({ where: { id: eid }, select: { plan: true } });
    if (!est || est.plan === "FREE") {
      const count = await db.member.count({ where: { establishmentId: eid, deletedAt: null } });
      if (count >= 10) {
        return NextResponse.json(
          { error: "Limite de 10 membros atingido no plano gratuito. Faça upgrade para o plano Pro." },
          { status: 403 }
        );
      }
    }

    const member = await db.member.create({
      data: {
        name: name.trim(),
        birthday: birthday?.trim() || null,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
        establishmentId: eid,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
