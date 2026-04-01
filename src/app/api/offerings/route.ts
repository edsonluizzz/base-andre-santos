import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "YYYY-MM"

    let dateWhere = {};
    if (month) {
      const [year, m] = month.split("-").map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59);
      dateWhere = { date: { gte: start, lte: end } };
    }

    const offerings = await db.offering.findMany({
      where: { establishmentId: eid, ...dateWhere },
      orderBy: { date: "desc" },
      include: {
        member: { select: { id: true, name: true } },
        event: { select: { id: true, title: true, type: true } },
      },
    });

    const total = offerings.reduce((sum: number, o: { amount: number }) => sum + o.amount, 0);
    return NextResponse.json({ offerings, total });
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
    const { memberId, eventId, amount, method, notes, date } = body;

    if (!memberId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const offering = await db.offering.create({
      data: {
        memberId,
        eventId: eventId || null,
        amount: parseFloat(amount),
        method: method || "CASH",
        notes: notes?.trim() || null,
        date: date ? new Date(date) : new Date(),
        establishmentId: eid,
      },
      include: {
        member: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(offering, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const existing = await db.offering.findFirst({ where: { id, establishmentId: eid } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.offering.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
