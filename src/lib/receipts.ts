import type { PrismaClient } from "@prisma/client";
import PDFDocument from "pdfkit";
import { put } from "@vercel/blob";
import { sendPaymentReceiptEmail } from "./email";
import { zapiSendDocument, toZapiPhone, ZapiNotConfiguredError } from "./zapi";
import { valorPorExtenso } from "./valor-extenso";
import { formatCpf } from "./cpf";
import { formatCnpj, formatEndereco } from "./cnpj";

/**
 * Recibo eleitoral formal (Lei nº 9.504/1997 + Resoluções TSE de prestação de
 * contas). Não expõe o nome da igreja — só a localidade (regional) — por
 * prudência em não vincular publicamente instituições religiosas a
 * movimentação financeira de campanha.
 */
function buildReceiptPdf(opts: {
  receiptNumber: string;
  collaboratorName: string;
  collaboratorCpf: string | null;
  candidateName: string;
  office: string | null;
  party: string | null;
  electionYear: number | null;
  payerRazaoSocial: string | null;
  payerCnpj: string | null;
  payerAddress: string | null;
  issuedAt: Date;
  rate: number;
  rows: { locality: string; deliveredAt: Date | null }[];
  total: number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const fmtMoney = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "—");
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const officeLabel = opts.office ?? "candidato(a)";
    const cpfLabel = opts.collaboratorCpf ? formatCpf(opts.collaboratorCpf) : "não cadastrado";

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#666").text("RECIBO ELEITORAL", { align: "center" });
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(9).text(
      "Comprovante de pagamento por prestação de serviços à campanha eleitoral, nos termos da Lei nº 9.504/1997 " +
      "e das Resoluções do TSE relativas à arrecadação e aos gastos de campanha.",
      { align: "center" },
    );
    doc.moveDown(0.8);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor("#999").stroke();
    doc.moveDown(0.8);

    doc.fillColor("#000").font("Helvetica-Bold").fontSize(14).text(`Recibo nº ${opts.receiptNumber}`);
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Campanha: ${opts.candidateName} — ${officeLabel}${opts.electionYear ? ` — ${opts.electionYear}` : ""}`);
    if (opts.party) doc.text(`Partido: ${opts.party}`);
    if (opts.payerRazaoSocial || opts.payerCnpj) {
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#333");
      if (opts.payerRazaoSocial) doc.text(`Comitê financeiro: ${opts.payerRazaoSocial}`);
      if (opts.payerCnpj) doc.text(`CNPJ: ${formatCnpj(opts.payerCnpj)}`);
      if (opts.payerAddress) doc.text(opts.payerAddress);
      doc.fillColor("#000").fontSize(10);
    }
    doc.moveDown(1);

    doc.font("Helvetica").fontSize(11).text(
      `Recebi da campanha de ${opts.candidateName} ao cargo de ${officeLabel}, a importância de ` +
      `${fmtMoney(opts.total)} (${valorPorExtenso(opts.total)}), referente ao pagamento por serviços de apoio ` +
      `logístico e entrega de material de campanha, conforme discriminado abaixo:`,
      { align: "justify", width: pageWidth, lineGap: 2 },
    );
    doc.moveDown(1);

    const colX = doc.page.margins.left;
    const col1 = colX, col2 = colX + 30, col3 = colX + pageWidth - 100;
    doc.font("Helvetica-Bold").fontSize(9);
    const headerY = doc.y;
    doc.text("Nº", col1, headerY, { width: 25 });
    doc.text("Localidade", col2, headerY);
    doc.text("Data", col3, headerY, { width: 100 });
    doc.moveDown(0.3);
    doc.moveTo(colX, doc.y).lineTo(colX + pageWidth, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(9.5);
    opts.rows.forEach((r, i) => {
      const rowY = doc.y;
      doc.text(String(i + 1), col1, rowY, { width: 25 });
      doc.text(r.locality, col2, rowY, { width: col3 - col2 - 10 });
      doc.text(fmtDate(r.deliveredAt), col3, rowY, { width: 100 });
      doc.moveDown(0.4);
    });
    doc.moveDown(0.2);
    doc.moveTo(colX, doc.y).lineTo(colX + pageWidth, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(0.6);

    doc.font("Helvetica").fontSize(10).text(`Valor unitário por entrega: ${fmtMoney(opts.rate)}`);
    doc.font("Helvetica-Bold").fontSize(12).text(`Valor total: ${fmtMoney(opts.total)}`, { align: "right" });
    doc.moveDown(1.2);

    doc.font("Helvetica").fontSize(10.5).text(
      "Declaro, para os devidos fins eleitorais e de prestação de contas perante a Justiça Eleitoral, ter " +
      "recebido a quantia acima discriminada, sendo esta a expressão da verdade.",
      { align: "justify", width: pageWidth, lineGap: 2 },
    );
    doc.moveDown(1.5);

    doc.font("Helvetica").fontSize(10).text(`Emitido em ${opts.issuedAt.toLocaleDateString("pt-BR")}.`, { align: "right" });
    doc.moveDown(2.5);

    const sigWidth = 260;
    const sigX = doc.page.width / 2 - sigWidth / 2;
    doc.moveTo(sigX, doc.y).lineTo(sigX + sigWidth, doc.y).strokeColor("#000").stroke();
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(10).text(opts.collaboratorName, { align: "center" });
    doc.font("Helvetica").fontSize(9).text(`CPF: ${cpfLabel}`, { align: "center" });

    doc.moveDown(2);
    doc.fontSize(7.5).fillColor("#888").text(
      "Documento gerado eletronicamente pelo sistema Ovile Eleitoral.",
      { align: "center", width: pageWidth },
    );

    doc.end();
  });
}

/**
 * Gera e envia (email + WhatsApp, best-effort) o recibo consolidado de um lote de
 * entregas recém-pagas de um colaborador. Nunca lança — chamada depois que o
 * pagamento em si já foi commitado, então uma falha aqui não pode desfazê-lo nem
 * mudar o status HTTP da rota que chamou.
 */
export async function generateAndSendReceipt(
  db: PrismaClient,
  collaboratorId: string,
  assignmentIds: string[],
  campaignId: string,
  payingEntityId: string | null = null,
): Promise<void> {
  if (assignmentIds.length === 0) return;

  try {
    const [collaborator, campaign, settings, assignments, payingEntity] = await Promise.all([
      db.collaborator.findUnique({
        where: { id: collaboratorId },
        select: { name: true, email: true, phone: true, cpf: true },
      }),
      db.campaign.findUnique({
        where: { id: campaignId },
        select: { candidateName: true, name: true, party: true, electionYear: true },
      }),
      db.settings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton", campaignName: "Base Andre Santos", updatedAt: new Date() },
        select: {
          deliveryPaymentValue: true, cnpj: true, razaoSocial: true,
          cnpjLogradouro: true, cnpjNumero: true, cnpjComplemento: true,
          cnpjBairro: true, cnpjCep: true, cnpjMunicipio: true, cnpjUf: true,
        },
      }),
      db.churchAssignment.findMany({
        where: { id: { in: assignmentIds } },
        select: { deliveredAt: true, church: { select: { regional: true } } },
      }),
      payingEntityId ? db.payingEntity.findUnique({ where: { id: payingEntityId } }) : Promise.resolve(null),
    ]);

    if (!collaborator) return;

    const rate = settings.deliveryPaymentValue;
    const amount = rate * assignmentIds.length;
    const candidateName = payingEntity?.candidateName ?? payingEntity?.name ?? campaign?.candidateName ?? campaign?.name ?? "Campanha";
    const payerRazaoSocial = payingEntity?.razaoSocial ?? settings.razaoSocial ?? null;
    const payerCnpj = payingEntity?.cnpj ?? settings.cnpj ?? null;
    const payerAddress = payingEntity
      ? formatEndereco(payingEntity)
      : formatEndereco({
          logradouro: settings.cnpjLogradouro, numero: settings.cnpjNumero, complemento: settings.cnpjComplemento,
          bairro: settings.cnpjBairro, cep: settings.cnpjCep, municipio: settings.cnpjMunicipio, uf: settings.cnpjUf,
        });

    const receipt = await db.paymentReceipt.create({
      data: { collaboratorId, amount, rate, assignmentIds, payingEntityId },
    });

    let pdfUrl: string | null = null;
    try {
      const pdfBuffer = await buildReceiptPdf({
        receiptNumber: receipt.id.slice(-8).toUpperCase(),
        collaboratorName: collaborator.name,
        collaboratorCpf: collaborator.cpf,
        candidateName,
        office: payingEntity?.office ?? null,
        party: payingEntity?.party ?? campaign?.party ?? null,
        electionYear: payingEntity?.electionYear ?? campaign?.electionYear ?? null,
        payerRazaoSocial,
        payerCnpj,
        payerAddress,
        issuedAt: new Date(),
        rate,
        rows: assignments.map((a) => ({ locality: a.church.regional ?? "Não informado", deliveredAt: a.deliveredAt })),
        total: amount,
      });

      if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN ausente");
      const safeName = collaborator.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await put(`payment-receipts/${safeName}-${receipt.id}.pdf`, pdfBuffer, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
        contentType: "application/pdf",
      });
      pdfUrl = blob.url;
      await db.paymentReceipt.update({ where: { id: receipt.id }, data: { pdfUrl } });
    } catch (err) {
      console.error("[receipts] falha ao gerar/subir PDF:", err);
      return; // sem PDF, não há o que enviar nos dois canais
    }
    if (!pdfUrl) return;

    let emailStatus: "SKIPPED" | "SENT" | "FAILED" = "SKIPPED";
    let emailError: string | null = null;
    if (collaborator.email) {
      try {
        const pdfRes = await fetch(pdfUrl);
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
        await sendPaymentReceiptEmail({
          to: collaborator.email,
          collaboratorName: collaborator.name,
          amount,
          pdfBuffer,
          fileName: `recibo-${receipt.id}.pdf`,
          campaignName: candidateName,
        });
        emailStatus = "SENT";
      } catch (err) {
        emailStatus = "FAILED";
        emailError = err instanceof Error ? err.message : "Falha ao enviar email";
        console.error("[receipts] falha ao enviar email:", err);
      }
    }

    let whatsappStatus: "SKIPPED" | "SENT" | "FAILED" = "SKIPPED";
    let whatsappError: string | null = null;
    if (collaborator.phone) {
      const phone = toZapiPhone(collaborator.phone);
      if (!phone) {
        whatsappStatus = "FAILED";
        whatsappError = "Telefone inválido";
      } else {
        try {
          await zapiSendDocument(campaignId, phone, pdfUrl, `recibo-${receipt.id}.pdf`);
          whatsappStatus = "SENT";
        } catch (err) {
          whatsappStatus = "FAILED";
          whatsappError = err instanceof ZapiNotConfiguredError
            ? "WhatsApp não configurado"
            : err instanceof Error ? err.message : "Falha ao enviar WhatsApp";
          console.error("[receipts] falha ao enviar whatsapp:", err);
        }
      }
    }

    await db.paymentReceipt.update({
      where: { id: receipt.id },
      data: { emailStatus, emailError, whatsappStatus, whatsappError },
    });
  } catch (err) {
    console.error("[receipts] generateAndSendReceipt erro:", err);
  }
}
