import PDFDocument from "pdfkit";
import { formatCpf } from "./cpf";
import { buildTermoText, formatCnpj, type TermoApoiadorData } from "./termo-apoiador";

/**
 * Gera o PDF do Termo de Apoiador. Segue o MESMO padrão de `buildReceiptPdf`
 * em receipts.ts (PDFDocument A4, chunks em memória) — não trocar por outra
 * lib de PDF: o pdfkit só funciona em serverless porque o Next está
 * configurado com `serverComponentsExternalPackages: ["pdfkit"]` +
 * `outputFileTracingIncludes` (ver next.config.mjs). Qualquer rota nova que
 * chame esta função precisa entrar nesse outputFileTracingIncludes.
 */
export function buildTermoApoiadorPdf(d: TermoApoiadorData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const { title, paragraphs, itemsLabel } = buildTermoText(d);

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#666").text("TERMO DE APOIADOR", { align: "center" });
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(9).text(
      "Declaração de recebimento de material de campanha para distribuição voluntária, nos termos da " +
      "Lei nº 9.504/1997.",
      { align: "center" },
    );
    doc.moveDown(0.8);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor("#999").stroke();
    doc.moveDown(0.8);

    doc.fillColor("#000").font("Helvetica-Bold").fontSize(14).text(title, { width: pageWidth });
    doc.moveDown(0.3);

    if (d.committee.razaoSocial || d.committee.cnpj) {
      doc.font("Helvetica").fontSize(9).fillColor("#333");
      if (d.committee.razaoSocial) doc.text(d.committee.razaoSocial);
      if (d.committee.cnpj) doc.text(`CNPJ: ${formatCnpj(d.committee.cnpj)}`);
      if (d.committee.address) doc.text(d.committee.address);
      doc.fillColor("#000");
    }
    doc.moveDown(1);

    doc.font("Helvetica").fontSize(11);
    paragraphs.forEach((p) => {
      doc.text(p, { align: "justify", width: pageWidth, lineGap: 2 });
      doc.moveDown(0.8);
    });

    if (itemsLabel.length > 0) {
      doc.moveDown(0.3);
      doc.font("Helvetica-Bold").fontSize(10).text("Itens recebidos:", { width: pageWidth });
      doc.font("Helvetica").fontSize(10);
      itemsLabel.forEach((i) => doc.text(`• ${i.qty} × ${i.label}`, { width: pageWidth }));
      doc.moveDown(1);
    }

    doc.font("Helvetica").fontSize(10).text(`Data do aceite: ${d.acceptedAt.toLocaleString("pt-BR")}.`, { width: pageWidth });
    if (d.ip) doc.font("Helvetica").fontSize(8).fillColor("#888").text(`Evidência de aceite eletrônico — IP: ${d.ip}`, { width: pageWidth });
    doc.fillColor("#000");
    doc.moveDown(2);

    const sigWidth = 260;
    const sigX = doc.page.width / 2 - sigWidth / 2;
    doc.moveTo(sigX, doc.y).lineTo(sigX + sigWidth, doc.y).strokeColor("#000").stroke();
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(10).text(d.supporterName, { align: "center" });
    doc.font("Helvetica").fontSize(9).text(`CPF: ${formatCpf(d.supporterCpf)}`, { align: "center" });
    doc.font("Helvetica").fontSize(8).fillColor("#888").text("Assinatura eletrônica (aceite digital) — sem assinatura manuscrita.", { align: "center" });

    doc.moveDown(2);
    doc.fontSize(7.5).fillColor("#888").text(
      "Documento gerado eletronicamente pelo sistema Ovile Eleitoral.",
      { align: "center", width: pageWidth },
    );

    doc.end();
  });
}
