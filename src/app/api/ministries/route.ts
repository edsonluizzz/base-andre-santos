import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const ministries = await db.ministry.findMany({
      where: { establishmentId: eid },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { members: true, events: true } },
      },
    });
    return NextResponse.json(ministries);
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

    const { name, description, color } = await req.json();
    if (!name?.trim())
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const ministry = await db.ministry.create({
      data: { name: name.trim(), description: description?.trim() || null, color: color || null, establishmentId: eid },
    });
    return NextResponse.json(ministry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
