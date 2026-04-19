import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB

// Magic bytes de cada tipo permitido
const MAGIC: { bytes: number[]; mime: string }[] = [
  { bytes: [0xFF, 0xD8, 0xFF],             mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4E, 0x47],       mime: "image/png"  },
  { bytes: [0x52, 0x49, 0x46, 0x46],       mime: "image/webp" }, // RIFF....WEBP
  { bytes: [0x47, 0x49, 0x46, 0x38],       mime: "image/gif"  }, // GIF8
  { bytes: [0x25, 0x50, 0x44, 0x46],       mime: "application/pdf" }, // %PDF
];

function detectMime(buf: Uint8Array): string | null {
  for (const { bytes, mime } of MAGIC) {
    if (bytes.every((b, i) => buf[i] === b)) return mime;
  }
  // WebP precisa de checagem extra: RIFF????WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

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
