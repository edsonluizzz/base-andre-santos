import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { detectMime } from "@/lib/file-validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

/** Upload do documento assinado que volta do Contratado(a) — não marca status automaticamente. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const contract = await gate.db.contract.findFirst({ where: { id: params.id, campaignId: gate.cid } });
    if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Armazenamento indisponível. Tente novamente mais tarde." }, { status: 503 });
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "Requisição inválida (esperado multipart/form-data)" }, { status: 400 });
    }

    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Arquivo acima de 8MB" }, { status: 400 });

    const buf = new Uint8Array(await file.arrayBuffer());
    const detectedMime = detectMime(buf);
    if (!detectedMime) {
      return NextResponse.json({ error: "Arquivo não suportado — envie um PDF ou imagem (JPG, PNG, WebP)." }, { status: 400 });
    }

    const blob = await put(`contratos-assinados/${contract.code}-assinado`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
      contentType: detectedMime,
    });

    const updated = await gate.db.contract.update({
      where: { id: contract.id },
      data: { signedPdfUrl: blob.url, signedAt: new Date() },
    });

    return NextResponse.json({ ok: true, signedPdfUrl: updated.signedPdfUrl, signedAt: updated.signedAt });
  } catch (err) {
    console.error("[api/financeiro/contratos/:id/signed-pdf POST] erro:", err);
    return NextResponse.json({ error: "Erro ao anexar documento assinado" }, { status: 500 });
  }
}
