import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { detectMime } from "@/lib/file-validation";

const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB

export async function POST(req: NextRequest) {
  if (!req.body) {
    return NextResponse.json({ error: "Corpo da requisição ausente" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo 4.5MB." }, { status: 400 });
  }

  // Ler o corpo completo para verificar magic bytes
  const arrayBuffer = await req.arrayBuffer();
  const buf = new Uint8Array(arrayBuffer);

  if (buf.length > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo 4.5MB." }, { status: 400 });
  }

  const detectedMime = detectMime(buf);
  if (!detectedMime) {
    return NextResponse.json(
      { error: "Tipo de arquivo não permitido. Use JPG, PNG, WebP, GIF ou PDF." },
      { status: 400 }
    );
  }

  const ALLOWED_FOLDERS = new Set(["uploads", "logos", "shirts", "shirt-proofs", "member-photos"]);
  const rawFolder = req.headers.get("x-folder") ?? "uploads";
  const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : "uploads";

  const originalName = req.headers.get("x-filename") ?? `upload-${Date.now()}`;
  const ext = originalName.split(".").pop() ?? "bin";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const blob = await put(filename, Buffer.from(buf), {
      access: "public",
      contentType: detectedMime,
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Erro interno ao processar o upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
