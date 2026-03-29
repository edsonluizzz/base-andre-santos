import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const events = await db.event.findMany({
      orderBy: { date: "desc" },
      include: {
        _count: { select: { attendances: true, offerings: true } },
      },
    });
    return NextResponse.json(events);
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
    const { title, type, date, location, notes } = body;

    if (!title?.trim() || !type || !date) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const event = await db.event.create({
      data: {
        title: title.trim(),
        type,
        date: new Date(date),
        location: location?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
