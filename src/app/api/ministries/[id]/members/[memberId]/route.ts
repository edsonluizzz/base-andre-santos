import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, memberId } = await params;
    const eid = session.user?.establishmentId ?? "default-porto-belo";

    // Verify ministry belongs to this establishment
    const ministry = await db.ministry.findFirst({ where: { id, establishmentId: eid } });
    if (!ministry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.ministryMember.deleteMany({ where: { ministryId: id, memberId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, memberId } = await params;
    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const { role } = await req.json();

    const ministry = await db.ministry.findFirst({ where: { id, establishmentId: eid } });
    if (!ministry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.ministryMember.updateMany({
      where: { ministryId: id, memberId },
      data: { role: role === "COORDINATOR" ? "COORDINATOR" : "MEMBER" },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
