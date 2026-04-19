import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { put } from "@vercel/blob";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB

const ALLOWED_MAGIC: { bytes: number[]; mime: string }[] = [
  { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" },
];

function detectMime(buf: Uint8Array): string | null {
  for (const { bytes, mime } of ALLOWED_MAGIC) {
    if (bytes.every((b, i) => buf[i] === b)) return mime;
  }
  // WebP: RIFF????WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

export async function POST(req: NextRequest) {
  try {
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

    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: "Foto muito grande. Máximo 4MB." }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buf = new Uint8Array(arrayBuffer);

    const detectedMime = detectMime(buf);
    if (!detectedMime)
      return NextResponse.json(
        { error: "Formato inválido. Use JPG, PNG ou WebP." },
        { status: 400 }
      );

    const blob = await put(`member-photos/${member.id}-${Date.now()}`, Buffer.from(arrayBuffer), {
      access: "public",
      contentType: detectedMime,
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    });

    await db.member.update({
      where: { id: member.id },
      data: { photoUrl: blob.url },
    });

    return NextResponse.json({ photoUrl: blob.url });
  } catch (err) {
    console.error("[portal/photo POST] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
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
  } catch (err) {
    console.error("[portal/photo DELETE] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
