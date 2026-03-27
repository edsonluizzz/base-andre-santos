import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "YYYY-MM"

  let where = {};
  if (month) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);
    where = { date: { gte: start, lte: end } };
  }

  const offerings = await db.offering.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      member: { select: { id: true, name: true } },
      event: { select: { id: true, title: true, type: true } },
    },
  });

  const total = offerings.reduce((sum: number, o: { amount: number }) => sum + o.amount, 0);
  return NextResponse.json({ offerings, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { memberId, eventId, amount, method, notes, date } = body;

  if (!memberId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const offering = await db.offering.create({
    data: {
      memberId,
      eventId: eventId || null,
      amount: parseFloat(amount),
      method: method || "CASH",
      notes: notes?.trim() || null,
      date: date ? new Date(date) : new Date(),
    },
    include: {
      member: { select: { id: true, name: true } },
      event: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(offering, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.offering.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
