import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 16 * 1024 * 1024; // limite de mídia do WhatsApp
const ALLOWED = /^(image|video|audio)\//;

/**
 * Upload de mídia de WhatsApp (foto/vídeo/áudio) VIA SERVIDOR.
 *
 * O arquivo sobe no body deste POST (multipart) e o servidor o grava no Vercel
 * Blob público com `put()`. Antes era client upload (PUT do navegador direto pro
 * Blob), mas o PUT cross-origin do navegador travava em silêncio (CSP/retry do
 * SDK) → botão "Enviando..." eterno sem erro. Subir pelo servidor elimina isso.
 *
 * Restrito a ADMIN. Limite prático do body de function (~4,5MB no Hobby) cobre
 * imagem e áudio de voz; vídeo grande é caso à parte (futuro).
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[zapi/upload] BLOB_READ_WRITE_TOKEN ausente no runtime de produção");
    return NextResponse.json(
      { error: "Armazenamento de mídia indisponível: conecte um Blob store ao projeto (BLOB_READ_WRITE_TOKEN) e refaça o deploy." },
      { status: 503 }
    );
  }

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas administradores podem enviar mídia" }, { status: 403 });
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
    return NextResponse.json({ error: `Tipo não suportado: ${file.type || "desconhecido"}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Arquivo acima de 16MB (limite do WhatsApp)" }, { status: 400 });
  }

  try {
    const safeName = (file.name || "midia").replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`whatsapp/${safeName}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN, // força o store PÚBLICO wpp-publico
      addRandomSuffix: true,
      contentType: file.type || undefined,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha no upload";
    console.error("[zapi/upload] %s", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
