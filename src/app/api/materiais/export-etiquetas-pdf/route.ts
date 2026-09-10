import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { formatDeliveryAddress, committeeFromSettings } from "@/lib/termo-apoiador";
import { parseMaterialFilters, buildMaterialWhere } from "@/lib/materiais-filters";

export const maxDuration = 60;

// Meia folha A4 (1 coluna × 2 linhas — 2 etiquetas por página, uma em cima da
// outra) com remetente e destinatário, sem conteúdo do pacote. Recorta ao
// meio pra colar/afixar em cada pacote.
const ROWS = 2;

type Label = { name: string; address: string };
type Sender = { name: string; address: string | null };

function buildLabelsPdf(labels: Label[], sender: Sender): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const cellH = pageHeight / ROWS;
    const pad = 32;

    labels.forEach((label, i) => {
      const posInPage = i % ROWS;
      if (i > 0 && posInPage === 0) doc.addPage();

      const y = posInPage * cellH;

      // Linha de corte entre as duas metades da folha.
      if (posInPage === 1) {
        doc.dash(3, { space: 3 }).moveTo(0, y).lineTo(pageWidth, y).stroke("#999999");
        doc.undash();
      }
      // Moldura da etiqueta.
      doc.rect(pad * 0.6, y + pad * 0.6, pageWidth - pad * 1.2, cellH - pad * 1.2).stroke("#cccccc");

      let cursorY = y + pad;

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#888")
        .text("REMETENTE", pad, cursorY, { characterSpacing: 1 });
      cursorY = doc.y + 2;
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#000")
        .text(sender.name, pad, cursorY, { width: pageWidth - pad * 2 });
      cursorY = doc.y + 1;
      if (sender.address) {
        doc.font("Helvetica").fontSize(9.5).fillColor("#333")
          .text(sender.address, pad, cursorY, { width: pageWidth - pad * 2, lineGap: 1 });
        cursorY = doc.y;
      }

      cursorY += 14;
      doc.moveTo(pad, cursorY).lineTo(pageWidth - pad, cursorY).stroke("#dddddd");
      cursorY += 14;

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#888")
        .text("DESTINATÁRIO", pad, cursorY, { characterSpacing: 1 });
      cursorY = doc.y + 4;
      doc.font("Helvetica-Bold").fontSize(15).fillColor("#000")
        .text(label.name, pad, cursorY, { width: pageWidth - pad * 2 });
      cursorY = doc.y + 4;
      doc.font("Helvetica").fontSize(12).fillColor("#000")
        .text(label.address, pad, cursorY, { width: pageWidth - pad * 2, lineGap: 2 });
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
    const filters = parseMaterialFilters(req.url, { defaultStatus: "APROVADO" });
    const where = buildMaterialWhere(cid, filters);

    const [rows, campaign, settings] = await Promise.all([
      db.materialRequest.findMany({
        where,
        select: {
          termSnapshotName: true,
          deliveryCep: true, deliveryLogradouro: true, deliveryNumero: true,
          deliveryComplemento: true, deliveryBairro: true, deliveryMunicipio: true, deliveryUf: true,
        },
        orderBy: { deliveryCep: "asc" },
      }),
      db.campaign.findUnique({ where: { id: cid }, select: { candidateName: true, name: true } }),
      db.settings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton", campaignName: "Base Andre Santos", updatedAt: new Date() },
        select: {
          razaoSocial: true, cnpj: true, cnpjLogradouro: true, cnpjNumero: true,
          cnpjComplemento: true, cnpjBairro: true, cnpjCep: true, cnpjMunicipio: true, cnpjUf: true,
        },
      }),
    ]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nenhuma solicitação nesse status pra gerar etiquetas" }, { status: 400 });
    }

    const committee = committeeFromSettings(settings);
    const sender = {
      name: committee.razaoSocial ?? campaign?.candidateName ?? campaign?.name ?? "Campanha",
      address: committee.address,
    };

    const labels = rows.map((r) => ({
      name: r.termSnapshotName,
      address: formatDeliveryAddress(r) ?? "(endereço não informado)",
    }));

    const pdfBuffer = await buildLabelsPdf(labels, sender);
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
