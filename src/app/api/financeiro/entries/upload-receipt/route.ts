import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { detectMime } from "@/lib/file-validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

/** Upload de comprovante (imagem ou PDF) via servidor — mesmo padrão de church-deliveries. */
export async function POST(request: Request): Promise<NextResponse> {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[financeiro/upload-receipt] BLOB_READ_WRITE_TOKEN ausente");
      return NextResponse.json({ error: "Armazenamento indisponível. Tente novamente mais tarde." }, { status: 503 });
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
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Comprovante acima de 8MB" }, { status: 400 });
    }

    const buf = new Uint8Array(await file.arrayBuffer());
    const detectedMime = detectMime(buf);
    if (!detectedMime) {
      return NextResponse.json({ error: "Arquivo não suportado — envie uma imagem (JPG, PNG, WebP, GIF) ou PDF." }, { status: 400 });
    }

    try {
      const safeName = (file.name || "comprovante").replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await put(`financeiro-comprovantes/${safeName}`, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
        contentType: detectedMime,
      });
      return NextResponse.json({ url: blob.url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no upload";
      console.error("[financeiro/upload-receipt] %s", message);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (err) {
    console.error("[financeiro/upload-receipt] erro:", err);
    return NextResponse.json({ error: "Erro no upload" }, { status: 500 });
  }
}
