import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const ministry = await db.ministry.findFirst({
      where: { id, establishmentId: eid },
      include: {
        members: {
          include: { member: true },
          orderBy: { joinedAt: "asc" },
        },
        _count: { select: { events: true, offerings: true, expenses: true } },
      },
    });
    if (!ministry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(ministry);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const { name, description, color } = await req.json();

    const ministry = await db.ministry.updateMany({
      where: { id, establishmentId: eid },
      data: {
        ...(name && { name: name.trim() }),
        description: description?.trim() || null,
        ...(color !== undefined && { color }),
      },
    });
    if (ministry.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const eid = session.user?.establishmentId ?? "default-porto-belo";
    await db.ministry.deleteMany({ where: { id, establishmentId: eid } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
