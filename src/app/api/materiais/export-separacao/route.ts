import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { materialItemLabel, MATERIAL_CATALOG_MAP, type MaterialRequestItem } from "@/lib/material-catalog";
import type { MaterialRequestStatus } from "@prisma/client";

export const maxDuration = 60;

const VALID_STATUSES = new Set<MaterialRequestStatus>(["PENDENTE_APROVACAO", "APROVADO", "ENTREGUE", "RECUSADO"]);

type Envio = { name: string; cidadeUf: string; itemsLabel: string };

function buildSeparacaoPdf(opts: {
  statusLabel: string;
  totalRows: { label: string; qty: number; unidade: string }[];
  grandTotal: number;
  envios: Envio[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottom = doc.page.height - doc.page.margins.bottom;
    const colX = doc.page.margins.left;
    const NAVY = "#1B3A5C";

    function ensureSpace(h: number) {
      if (doc.y + h > bottom) doc.addPage();
    }

    // Cabeçalho geral
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#000").text("Separação de Material de Campanha");
    doc.font("Helvetica").fontSize(9).fillColor("#666").text(`${opts.envios.length} envio(s) — status: ${opts.statusLabel}`);
    doc.fontSize(8).fillColor("#999").text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`);
    doc.moveDown(0.8);

    // ── Seção 1: resumo agregado ──────────────────────────────────────────
    doc.fillColor("#000").font("Helvetica-Bold").fontSize(12).text("1. Quanto separar no total");
    doc.moveDown(0.3);

    const cols1 = [
      { header: "Item", width: pageWidth - 260 },
      { header: "Quantidade", width: 130, align: "right" as const },
      { header: "Unidade", width: 130 },
    ];
    function drawHeader1() {
      let x = colX;
      const y = doc.y;
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#fff");
      for (const c of cols1) {
        doc.rect(x, y, c.width, 18).fill(NAVY);
        doc.fillColor("#fff").text(c.header, x + 4, y + 5, { width: c.width - 8, align: c.align ?? "left" });
        x += c.width;
      }
      doc.y = y + 18;
      doc.fillColor("#000");
    }
    drawHeader1();
    opts.totalRows.forEach((r, i) => {
      ensureSpace(16);
      if (doc.y === doc.page.margins.top) drawHeader1();
      let x = colX;
      const y = doc.y;
      if (i % 2 === 1) doc.rect(colX, y, pageWidth, 16).fill("#F0F4FF");
      doc.fillColor("#000").font("Helvetica").fontSize(8.5);
      doc.text(r.label, x + 4, y + 4, { width: cols1[0].width - 8 });
      x += cols1[0].width;
      doc.text(String(r.qty), x + 4, y + 4, { width: cols1[1].width - 8, align: "right" });
      x += cols1[1].width;
      doc.text(r.unidade, x + 4, y + 4, { width: cols1[2].width - 8 });
      doc.y = y + 16;
    });
    // total geral
    {
      const y = doc.y;
      doc.font("Helvetica-Bold").fontSize(8.5);
      doc.text("TOTAL GERAL", colX + 4, y + 4, { width: cols1[0].width - 8 });
      doc.text(String(opts.grandTotal), colX + cols1[0].width + 4, y + 4, { width: cols1[1].width - 8, align: "right" });
      doc.y = y + 18;
    }

    doc.moveDown(1.2);

    // ── Seção 2: por envio ────────────────────────────────────────────────
    ensureSpace(40);
    doc.fillColor("#000").font("Helvetica-Bold").fontSize(12).text("2. Por envio");
    doc.moveDown(0.3);

    const cols2 = [
      { header: "#", width: 28 },
      { header: "Destinatário", width: 170 },
      { header: "Cidade/UF", width: 110 },
      { header: "Itens desse envio", width: pageWidth - 28 - 170 - 110 },
    ];
    function drawHeader2() {
      let x = colX;
      const y = doc.y;
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#fff");
      for (const c of cols2) {
        doc.rect(x, y, c.width, 18).fill(NAVY);
        doc.fillColor("#fff").text(c.header, x + 4, y + 5, { width: c.width - 8 });
        x += c.width;
      }
      doc.y = y + 18;
      doc.fillColor("#000");
    }
    drawHeader2();
    opts.envios.forEach((e, i) => {
      // altura variável conforme o texto de itens quebra linha — estima 2 linhas de folga
      const rowH = 30;
      ensureSpace(rowH);
      if (doc.y === doc.page.margins.top) drawHeader2();
      let x = colX;
      const y = doc.y;
      if (i % 2 === 1) doc.rect(colX, y, pageWidth, rowH).fill("#F0F4FF");
      doc.fillColor("#000").font("Helvetica").fontSize(8.5);
      doc.text(String(i + 1), x + 4, y + 4, { width: cols2[0].width - 8 });
      x += cols2[0].width;
      doc.font("Helvetica-Bold").text(e.name, x + 4, y + 4, { width: cols2[1].width - 8 });
      x += cols2[1].width;
      doc.font("Helvetica").text(e.cidadeUf, x + 4, y + 4, { width: cols2[2].width - 8 });
      x += cols2[2].width;
      doc.text(e.itemsLabel, x + 4, y + 4, { width: cols2[3].width - 8, lineGap: 1 });
      doc.y = y + rowH;
    });

    doc.end();
  });
}

/**
 * Relatório de separação em 2 partes: (1) soma agregada de cada item — quanto
 * pegar no estoque de uma vez — e (2) detalhamento por envio, pra saber o que
 * vai em cada pacote/remessa individual na hora de embalar.
 */
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
      select: { items: true, termSnapshotName: true, deliveryMunicipio: true, deliveryUf: true },
      orderBy: { termSnapshotName: "asc" },
    });

    const totals = new Map<string, number>();
    for (const r of rows) {
      for (const it of r.items as unknown as MaterialRequestItem[]) {
        totals.set(it.item, (totals.get(it.item) ?? 0) + it.qty);
      }
    }
    const itemIds = Array.from(totals.keys()).sort((a, b) => materialItemLabel(a).localeCompare(materialItemLabel(b), "pt-BR"));
    const totalRows = itemIds.map((id) => ({
      label: materialItemLabel(id),
      qty: totals.get(id) ?? 0,
      unidade: MATERIAL_CATALOG_MAP[id]?.unidade ?? "unidades",
    }));
    const grandTotal = itemIds.reduce((sum, id) => sum + (totals.get(id) ?? 0), 0);

    const envios: Envio[] = rows.map((r) => ({
      name: r.termSnapshotName,
      cidadeUf: [r.deliveryMunicipio, r.deliveryUf].filter(Boolean).join("/") || "—",
      itemsLabel: (r.items as unknown as MaterialRequestItem[]).map((it) => `${it.qty}× ${materialItemLabel(it.item)}`).join(", "),
    }));

    const pdfBuffer = await buildSeparacaoPdf({ statusLabel: status, totalRows, grandTotal, envios });

    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="separacao-material-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/materiais/export-separacao GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
