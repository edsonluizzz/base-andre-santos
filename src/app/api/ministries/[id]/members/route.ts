import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST: adicionar membro ao ministério
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { memberId, role } = await req.json();
  if (!memberId) return NextResponse.json({ error: "memberId obrigatório" }, { status: 400 });

  const link = await db.ministryMember.upsert({
    where: { ministryId_memberId: { ministryId: params.id, memberId } },
    update: { role: role ?? "MEMBER" },
    create: { ministryId: params.id, memberId, role: role ?? "MEMBER" },
  });

  return NextResponse.json(link, { status: 201 });
}

// DELETE: remover membro do ministério
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId obrigatório" }, { status: 400 });

  await db.ministryMember.deleteMany({
    where: { ministryId: params.id, memberId },
  });

  return NextResponse.json({ success: true });
}
