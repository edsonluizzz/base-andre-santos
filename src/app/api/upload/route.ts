import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];
const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB

export async function POST(req: NextRequest) {
  if (!req.body) {
    return NextResponse.json({ error: "Corpo da requisição ausente" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "application/octet-stream";
  const mimeType = contentType.split(";")[0].trim();

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: "Tipo de arquivo não permitido. Use JPG, PNG, WebP, GIF ou PDF." },
      { status: 400 }
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo 4.5MB." },
      { status: 400 }
    );
  }

  const originalName = req.headers.get("x-filename") ?? `upload-${Date.now()}`;
  const folder = req.headers.get("x-folder") ?? "uploads";
  const ext = originalName.split(".").pop() ?? "bin";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const blob = await put(filename, req.body, {
      access: "public",
      contentType: mimeType,
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Erro interno ao processar o upload no Vercel Blob";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
