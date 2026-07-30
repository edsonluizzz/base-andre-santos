import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { detectImageMime } from "@/lib/file-validation";

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
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[churches/upload-photo] BLOB_READ_WRITE_TOKEN ausente");
      return NextResponse.json(
        { error: "Armazenamento de mídia indisponível. Tente novamente mais tarde." },
        { status: 503 },
      );
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

    // Valida o conteúdo real (magic bytes) — o MIME acima vem do cliente e é
    // falsificável (ex: SVG disfarçado de imagem executaria script no Blob público).
    const buf = new Uint8Array(await file.arrayBuffer());
    const detectedMime = detectImageMime(buf);
    if (!detectedMime) {
      return NextResponse.json({ error: "Arquivo não é uma imagem válida (JPG, PNG, WebP ou GIF)." }, { status: 400 });
    }

    try {
      const safeName = (file.name || "entrega").replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await put(`church-deliveries/${safeName}`, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
        contentType: detectedMime,
      });
      return NextResponse.json({ url: blob.url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no upload";
      console.error("[churches/upload-photo] %s", message);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (err) {
    console.error("[churches/upload-photo] erro:", err);
    return NextResponse.json({ error: "Erro no upload" }, { status: 500 });
  }
}
