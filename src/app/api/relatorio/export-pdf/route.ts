import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import PDFDocument from "pdfkit";
import { PROFILE_LABEL } from "@/lib/labels";
import { getRelatorioAggregates, getGrowth, getExecutiveSummary, coverageScore } from "@/lib/relatorio-data";

export const maxDuration = 60;

const COVERAGE_LABEL_PT: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
const fmtMoney = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { db, cid: CID } = getCampaignContext(session);

    const [agg, growth, execSummary, campaign] = await Promise.all([
      getRelatorioAggregates(db, CID, {}),
      getGrowth(db, CID, {}, 30),
      getExecutiveSummary(db, CID),
      db.campaign.findUnique({ where: { id: CID }, select: { candidateName: true, name: true } }),
    ]);
    const candidateName = campaign?.candidateName ?? campaign?.name ?? "Campanha";

    const pdfBuffer = await buildReportPdf({ candidateName, agg, growth, execSummary });
    const date = new Date().toISOString().split("T")[0];

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-cobertura-${date}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[relatorio/export-pdf]", err);
    return NextResponse.json({ error: "Erro ao gerar PDF" }, { status: 500 });
  }
}

function buildReportPdf(opts: {
  candidateName: string;
  agg: Awaited<ReturnType<typeof getRelatorioAggregates>>;
  growth: { newN: number; prevN: number };
  execSummary: Awaited<ReturnType<typeof getExecutiveSummary>>;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { agg, growth, execSummary, candidateName } = opts;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottom = doc.page.height - doc.page.margins.bottom;

    function ensureSpace(needed: number) {
      if (doc.y + needed > bottom) doc.addPage();
    }

    function sectionTitle(text: string) {
      ensureSpace(30);
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#000").text(text);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor("#ccc").stroke();
      doc.moveDown(0.4);
    }

    function tableRow(cols: { text: string; width: number; align?: "left" | "right" | "center"; bold?: boolean; color?: string }[], y?: number) {
      ensureSpace(16);
      const rowY = y ?? doc.y;
      let x = doc.page.margins.left;
      for (const c of cols) {
        doc.font(c.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(c.color ?? "#000")
          .text(c.text, x, rowY, { width: c.width, align: c.align ?? "left" });
        x += c.width;
      }
      doc.y = rowY + 14;
    }

    // ─── Capa ────────────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#000").text("Relatório de Cobertura", { align: "center" });
    doc.font("Helvetica").fontSize(11).fillColor("#666").text(candidateName, { align: "center" });
    doc.fontSize(9).fillColor("#999").text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, { align: "center" });
    doc.moveDown(1);

    // ─── Resumo executivo ────────────────────────────────────────────────
    sectionTitle("Resumo Executivo");
    const resumoRows: [string, string][] = [
      ["Municípios com presença", String(agg.cities.length)],
      ["Total cadastrado", String(agg.totalAll)],
      ["Ativos", String(agg.totalActive)],
      ["Confirmados", String(agg.totalConfirm)],
      ["Leads não convertidos", String(agg.totalLeads)],
      ["Crescimento (30d vs. 30 anteriores)", `${growth.newN} (${growth.newN - growth.prevN >= 0 ? "+" : ""}${growth.newN - growth.prevN})`],
    ];
    if (execSummary.metaVotesPct !== null) {
      resumoRows.push(["Meta eleitoral (votos)", `${execSummary.metaVotesPct}% (${agg.totalConfirm} / ${execSummary.metaVotesTotal})`]);
    }
    if (execSummary.financeiro) {
      resumoRows.push(["Financeiro pago (Igrejas)", fmtMoney(execSummary.financeiro.amountPaid)]);
      resumoRows.push(["Financeiro pendente (Igrejas)", fmtMoney(execSummary.financeiro.amountPending)]);
    }
    for (const [label, val] of resumoRows) {
      ensureSpace(16);
      doc.font("Helvetica").fontSize(10).fillColor("#333").text(label, doc.page.margins.left, doc.y, { continued: false, width: pageWidth * 0.65 });
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000").text(val, doc.page.margins.left + pageWidth * 0.65, doc.y - 12, { width: pageWidth * 0.35, align: "right" });
    }

    if (execSummary.topLeaders.length > 0) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000").text("Top líderes (por ativos registrados):");
      execSummary.topLeaders.forEach((l, i) => {
        ensureSpace(14);
        doc.font("Helvetica").fontSize(9).fillColor("#333").text(`${i + 1}º ${l.name ?? "Sem nome"} — ${l.active} ativos`);
      });
    }

    // ─── Funil de conversão ────────────────────────────────────────────
    sectionTitle("Funil de Conversão");
    const pctAct = agg.totalAll > 0 ? Math.round((agg.totalActive / agg.totalAll) * 100) : 0;
    const pctConf = agg.totalActive > 0 ? Math.round((agg.totalConfirm / agg.totalActive) * 100) : 0;
    tableRow([
      { text: "Etapa", width: pageWidth * 0.5, bold: true },
      { text: "Quantidade", width: pageWidth * 0.25, align: "right", bold: true },
      { text: "Taxa", width: pageWidth * 0.25, align: "right", bold: true },
    ]);
    tableRow([{ text: "Total cadastrado", width: pageWidth * 0.5 }, { text: String(agg.totalAll), width: pageWidth * 0.25, align: "right" }, { text: "100%", width: pageWidth * 0.25, align: "right" }]);
    tableRow([{ text: "Ativos", width: pageWidth * 0.5 }, { text: String(agg.totalActive), width: pageWidth * 0.25, align: "right" }, { text: `${pctAct}%`, width: pageWidth * 0.25, align: "right" }]);
    tableRow([{ text: "Confirmados", width: pageWidth * 0.5 }, { text: String(agg.totalConfirm), width: pageWidth * 0.25, align: "right" }, { text: `${pctConf}% dos ativos`, width: pageWidth * 0.25, align: "right" }]);
    tableRow([{ text: "Leads não convertidos", width: pageWidth * 0.5 }, { text: String(agg.totalLeads), width: pageWidth * 0.25, align: "right" }, { text: "—", width: pageWidth * 0.25, align: "right" }]);

    // ─── Capital político ──────────────────────────────────────────────
    if (agg.crossProfiles.length > 0) {
      sectionTitle("Capital Político por Perfil (ativos)");
      const wProfile = pageWidth * 0.3, wCol = pageWidth * 0.14;
      tableRow([
        { text: "Perfil", width: wProfile, bold: true },
        { text: "Confirmado", width: wCol, align: "right", bold: true },
        { text: "Negociando", width: wCol, align: "right", bold: true },
        { text: "Neutro", width: wCol, align: "right", bold: true },
        { text: "Advers.", width: wCol, align: "right", bold: true },
        { text: "Total", width: wCol, align: "right", bold: true },
      ]);
      for (const p of agg.crossProfiles) {
        const row = agg.crossTable[p];
        tableRow([
          { text: PROFILE_LABEL[p] ?? p, width: wProfile },
          { text: String(row.confirmado), width: wCol, align: "right", color: row.confirmado > 0 ? "#16a34a" : "#999" },
          { text: String(row.negociando), width: wCol, align: "right", color: row.negociando > 0 ? "#d97706" : "#999" },
          { text: String(row.neutro), width: wCol, align: "right" },
          { text: String(row.adversario), width: wCol, align: "right", color: row.adversario > 0 ? "#dc2626" : "#999" },
          { text: String(row.total), width: wCol, align: "right", bold: true },
        ]);
      }
    }

    // ─── Cobertura por cidade (top 40 por ativos) ───────────────────────
    sectionTitle(`Cobertura por Cidade (top ${Math.min(40, agg.cities.length)} de ${agg.cities.length})`);
    const wCity = pageWidth * 0.34, wSmall = pageWidth * 0.165;
    tableRow([
      { text: "Município", width: wCity, bold: true },
      { text: "Cobertura", width: wSmall, bold: true },
      { text: "Ativos", width: wSmall, align: "right", bold: true },
      { text: "Leads", width: wSmall, align: "right", bold: true },
      { text: "Confirm.", width: wSmall, align: "right", bold: true },
    ]);
    for (const [city, m] of agg.cities.slice(0, 40)) {
      const cov = coverageScore(m.roles);
      tableRow([
        { text: city, width: wCity },
        { text: COVERAGE_LABEL_PT[cov], width: wSmall, color: cov === "alta" ? "#16a34a" : cov === "media" ? "#d97706" : "#999" },
        { text: String(m.active), width: wSmall, align: "right" },
        { text: String(m.leads || 0), width: wSmall, align: "right" },
        { text: String(m.confirmados || 0), width: wSmall, align: "right", color: m.confirmados > 0 ? "#16a34a" : "#999" },
      ]);
    }
    if (agg.cities.length > 40) {
      doc.moveDown(0.3);
      doc.font("Helvetica-Oblique").fontSize(8).fillColor("#999").text(`+${agg.cities.length - 40} outros municípios — ver export XLSX para a lista completa.`);
    }

    // ─── Municípios sem liderança ────────────────────────────────────
    if (agg.orphanCities.length > 0) {
      sectionTitle("Municípios sem Liderança (com ativos)");
      for (const [city, m] of agg.orphanCities) {
        ensureSpace(14);
        doc.font("Helvetica").fontSize(9).fillColor("#d97706").text(`${city} — ${m.active} ativo${m.active !== 1 ? "s" : ""}`);
      }
    }

    doc.moveDown(1);
    doc.font("Helvetica").fontSize(7.5).fillColor("#999").text("Documento gerado eletronicamente pelo sistema Ovile Eleitoral.", { align: "center" });

    doc.end();
  });
}

