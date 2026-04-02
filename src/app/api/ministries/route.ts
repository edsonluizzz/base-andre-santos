import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eid = session.user?.establishmentId ?? "default-porto-belo";
  const ministries = await db.ministry.findMany({
    where: { establishmentId: eid, active: true },
    orderBy: { name: "asc" },
    include: {
      members: {
        include: { member: { select: { id: true, name: true, photoUrl: true } } },
        orderBy: [{ role: "asc" }, { member: { name: "asc" } }],
      },
    },
  });

  return NextResponse.json(ministries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const eid = session.user?.establishmentId ?? "default-porto-belo";
  const { name, description } = await req.json();

  if (!name?.trim())
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const ministry = await db.ministry.create({
    data: { name: name.trim(), description: description?.trim() || null, establishmentId: eid },
    include: { members: true },
  });

  return NextResponse.json(ministry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const eid = session.user?.establishmentId ?? "default-porto-belo";
  await db.ministry.updateMany({
    where: { id, establishmentId: eid },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
