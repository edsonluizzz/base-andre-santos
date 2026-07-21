import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = /^image\//;

/**
 * Upload de foto de comprovação de entrega VIA SERVIDOR — mesmo padrão do
 * upload de mídia do WhatsApp (evita o PUT direto do navegador pro Blob,
 * que já travou em silêncio por causa de CSP/CORS neste projeto).
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[churches/upload-photo] BLOB_READ_WRITE_TOKEN ausente");
    return NextResponse.json(
      { error: "Armazenamento de mídia indisponível. Tente novamente mais tarde." },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requisição inválida (esperado multipart/form-data)" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  }
  if (!ALLOWED.test(file.type)) {
    return NextResponse.json({ error: `Tipo não suportado: ${file.type || "desconhecido"}. Envie uma foto.` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Foto acima de 8MB" }, { status: 400 });
  }

  try {
    const safeName = (file.name || "entrega").replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`church-deliveries/${safeName}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
      contentType: file.type || undefined,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha no upload";
    console.error("[churches/upload-photo] %s", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
