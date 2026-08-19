import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { formatDeliveryAddress } from "@/lib/termo-apoiador";
import { materialItemLabel, type MaterialRequestItem } from "@/lib/material-catalog";
import type { MaterialRequestStatus } from "@prisma/client";

export const maxDuration = 60;

const VALID_STATUSES = new Set<MaterialRequestStatus>(["PENDENTE_APROVACAO", "APROVADO", "ENTREGUE", "RECUSADO"]);

// Grade genérica 2×5 (10 etiquetas por página A4) — não é alinhada a uma folha
// adesiva específica (ex.: Pimaco); tem linha pontilhada de corte pra quem for
// recortar. Pra colar em folha adesiva pronta, usar o XLSX (export-etiquetas)
// numa ferramenta de etiqueta (ex.: Etiqueta Fácil dos Correios).
const COLS = 2;
const ROWS = 5;

function buildLabelsPdf(labels: { name: string; address: string; items: string }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 28 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
    const cellW = pageWidth / COLS;
    const cellH = pageHeight / ROWS;
    const perPage = COLS * ROWS;

    labels.forEach((label, i) => {
      const posInPage = i % perPage;
      if (i > 0 && posInPage === 0) doc.addPage();

      const col = posInPage % COLS;
      const row = Math.floor(posInPage / COLS);
      const x = doc.page.margins.left + col * cellW;
      const y = doc.page.margins.top + row * cellH;
      const pad = 12;

      doc.dash(2, { space: 2 }).rect(x, y, cellW, cellH).stroke("#aaaaaa");
      doc.undash();

      doc.font("Helvetica-Bold").fontSize(11).fillColor("#000")
        .text(label.name, x + pad, y + pad, { width: cellW - pad * 2 });
      doc.font("Helvetica").fontSize(9.5)
        .text(label.address, x + pad, doc.y + 2, { width: cellW - pad * 2, lineGap: 1 });
      doc.font("Helvetica-Oblique").fontSize(8).fillColor("#666")
        .text(label.items, x + pad, y + cellH - pad - 22, { width: cellW - pad * 2 });
    });

    doc.end();
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { db, cid } = getCampaignContext(session);
    const statusParam = new URL(req.url).searchParams.get("status") ?? "APROVADO";
    const status = VALID_STATUSES.has(statusParam as MaterialRequestStatus) ? (statusParam as MaterialRequestStatus) : "APROVADO";

    const rows = await db.materialRequest.findMany({
      where: { campaignId: cid, status },
      select: {
        items: true, termSnapshotName: true,
        deliveryCep: true, deliveryLogradouro: true, deliveryNumero: true,
        deliveryComplemento: true, deliveryBairro: true, deliveryMunicipio: true, deliveryUf: true,
      },
      orderBy: { deliveryCep: "asc" },
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nenhuma solicitação nesse status pra gerar etiquetas" }, { status: 400 });
    }

    const labels = rows.map((r) => ({
      name: r.termSnapshotName,
      address: formatDeliveryAddress(r) ?? "(endereço não informado)",
      items: (r.items as unknown as MaterialRequestItem[]).map((it) => `${it.qty}× ${materialItemLabel(it.item)}`).join(", "),
    }));

    const pdfBuffer = await buildLabelsPdf(labels);
    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="etiquetas-correio-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/materiais/export-etiquetas-pdf GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
