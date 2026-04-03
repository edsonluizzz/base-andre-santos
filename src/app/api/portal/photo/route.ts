import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await db.member.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!member)
    return NextResponse.json({ error: "Membro não vinculado" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

  const blob = await put(`member-photos/${member.id}-${Date.now()}`, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN!,
  });

  await db.member.update({
    where: { id: member.id },
    data: { photoUrl: blob.url },
  });

  return NextResponse.json({ photoUrl: blob.url });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await db.member.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!member)
    return NextResponse.json({ error: "Membro não vinculado" }, { status: 404 });

  await db.member.update({
    where: { id: member.id },
    data: { photoUrl: null },
  });

  return NextResponse.json({ ok: true });
}
