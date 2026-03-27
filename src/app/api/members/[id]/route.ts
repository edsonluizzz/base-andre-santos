import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, birthday, phone, notes, status } = body;

  const member = await db.member.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(birthday !== undefined && { birthday: birthday?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json(member);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.member.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
