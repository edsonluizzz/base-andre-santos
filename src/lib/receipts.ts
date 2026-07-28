import type { PrismaClient } from "@prisma/client";
import PDFDocument from "pdfkit";
import { put } from "@vercel/blob";
import { sendPaymentReceiptEmail } from "./email";
import { zapiSendDocument, toZapiPhone, ZapiNotConfiguredError } from "./zapi";

function buildReceiptPdf(opts: {
  collaboratorName: string;
  candidateName: string;
  issuedAt: Date;
  rate: number;
  rows: { churchName: string; deliveredAt: Date | null }[];
  total: number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const fmtMoney = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "—");

    doc.fontSize(18).text(`Recibo de pagamento — ${opts.candidateName}`, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#555").text(`Emitido em ${opts.issuedAt.toLocaleDateString("pt-BR")}`, { align: "center" });
    doc.moveDown(2);

    doc.fillColor("#000").fontSize(12).text(`Colaborador: ${opts.collaboratorName}`);
    doc.text(`Valor unitário por entrega: ${fmtMoney(opts.rate)}`);
    doc.moveDown(1);

    doc.fontSize(12).text("Entregas cobertas por este recibo:", { underline: true });
    doc.moveDown(0.5);
    opts.rows.forEach((r, i) => {
      doc.fontSize(11).text(`${i + 1}. ${r.churchName} — entregue em ${fmtDate(r.deliveredAt)}`);
    });

    doc.moveDown(1.5);
    doc.fontSize(14).text(`Total pago: ${fmtMoney(opts.total)}`, { align: "right" });

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
): Promise<void> {
  if (assignmentIds.length === 0) return;

  try {
    const [collaborator, campaign, settings, assignments] = await Promise.all([
      db.collaborator.findUnique({
        where: { id: collaboratorId },
        select: { name: true, email: true, phone: true },
      }),
      db.campaign.findUnique({ where: { id: campaignId }, select: { candidateName: true, name: true } }),
      db.settings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton", campaignName: "Base Andre Santos", updatedAt: new Date() },
        select: { deliveryPaymentValue: true },
      }),
      db.churchAssignment.findMany({
        where: { id: { in: assignmentIds } },
        select: { deliveredAt: true, church: { select: { name: true } } },
      }),
    ]);

    if (!collaborator) return;

    const rate = settings.deliveryPaymentValue;
    const amount = rate * assignmentIds.length;
    const candidateName = campaign?.candidateName ?? campaign?.name ?? "Campanha";

    const receipt = await db.paymentReceipt.create({
      data: { collaboratorId, amount, rate, assignmentIds },
    });

    let pdfUrl: string | null = null;
    try {
      const pdfBuffer = await buildReceiptPdf({
        collaboratorName: collaborator.name,
        candidateName,
        issuedAt: new Date(),
        rate,
        rows: assignments.map((a) => ({ churchName: a.church.name, deliveredAt: a.deliveredAt })),
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
