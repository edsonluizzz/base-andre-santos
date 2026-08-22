import PDFDocument from "pdfkit";

export type PdfColumn = { header: string; width: number; align?: "left" | "right" | "center" };

/**
 * PDF tabular genérico — usado por todos os exports "XLSX + PDF" do sistema
 * (colaboradores, lançamentos financeiros, cabos eleitorais, pagamentos de
 * igrejas) pra não duplicar a lógica de paginação/cabeçalho repetido em cada
 * rota. Orientação paisagem por padrão porque a maioria dessas tabelas tem
 * muitas colunas.
 */
export function buildSimpleTablePdf(opts: {
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: string[][];
  totalsRow?: string[];
  orientation?: "portrait" | "landscape";
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: opts.orientation ?? "landscape", margin: 36 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottom = doc.page.height - doc.page.margins.bottom;
    const colX = doc.page.margins.left;

    function drawHeader() {
      let x = colX;
      const y = doc.y;
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#fff");
      for (const c of opts.columns) {
        doc.rect(x, y, c.width, 18).fill("#1B3A5C");
        doc.fillColor("#fff").text(c.header, x + 4, y + 5, { width: c.width - 8, align: c.align ?? "left" });
        x += c.width;
      }
      doc.y = y + 18;
      doc.fillColor("#000");
    }

    function drawRow(cells: string[], i: number, bold = false) {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
      const cellHeights = opts.columns.map((c, ci) =>
        doc.heightOfString(cells[ci] ?? "", { width: c.width - 8, align: c.align ?? "left" }),
      );
      const rowHeight = Math.max(16, Math.max(...cellHeights) + 8);

      if (doc.y + rowHeight > bottom) {
        doc.addPage();
        doc.y = doc.page.margins.top;
        drawHeader();
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
      }
      let x = colX;
      const y = doc.y;
      if (!bold && i % 2 === 1) {
        doc.rect(colX, y, pageWidth, rowHeight).fill("#F0F4FF");
        doc.fillColor("#000");
      }
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
      opts.columns.forEach((c, ci) => {
        doc.text(cells[ci] ?? "", x + 4, y + 4, { width: c.width - 8, align: c.align ?? "left" });
        x += c.width;
      });
      doc.y = y + rowHeight;
    }

    doc.font("Helvetica-Bold").fontSize(14).fillColor("#000").text(opts.title);
    if (opts.subtitle) {
      doc.font("Helvetica").fontSize(9).fillColor("#666").text(opts.subtitle);
    }
    doc.fontSize(8).fillColor("#999").text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`);
    doc.moveDown(0.6);
    doc.fillColor("#000");

    drawHeader();
    opts.rows.forEach((row, i) => drawRow(row, i));
    if (opts.totalsRow) drawRow(opts.totalsRow, 0, true);

    doc.end();
  });
}
