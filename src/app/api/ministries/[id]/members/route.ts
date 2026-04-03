import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const eid = session.user?.establishmentId ?? "default-porto-belo";

    // Verify ministry belongs to this establishment
    const ministry = await db.ministry.findFirst({ where: { id, establishmentId: eid } });
    if (!ministry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const members = await db.ministryMember.findMany({
      where: { ministryId: id },
      include: { member: true },
      orderBy: { joinedAt: "asc" },
    });
    return NextResponse.json(members);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const { memberId, role } = await req.json();

    if (!memberId) return NextResponse.json({ error: "memberId obrigatório" }, { status: 400 });

    // Verify ministry and member belong to this establishment
    const [ministry, member] = await Promise.all([
      db.ministry.findFirst({ where: { id, establishmentId: eid } }),
      db.member.findFirst({ where: { id: memberId, establishmentId: eid } }),
    ]);
    if (!ministry || !member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const mm = await db.ministryMember.create({
      data: {
        ministryId: id,
        memberId,
        role: role === "COORDINATOR" ? "COORDINATOR" : "MEMBER",
      },
      include: { member: true },
    });
    return NextResponse.json(mm, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002")
      return NextResponse.json({ error: "Membro já está neste ministério" }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
