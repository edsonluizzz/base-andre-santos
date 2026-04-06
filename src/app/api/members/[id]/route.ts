import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const existing = await db.member.findFirst({ where: { id: params.id, establishmentId: eid } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { name, birthday, phone, notes, status, userId } = body;

    const member = await db.member.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(birthday !== undefined && { birthday: birthday?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(userId !== undefined && { userId: userId || null }),
      },
    });

    return NextResponse.json(member);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const existing = await db.member.findFirst({ where: { id: params.id, establishmentId: eid } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Soft-delete: preserva histórico de chamadas e financeiro
    await db.member.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
