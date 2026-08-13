import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { sendPaymentReceiptEmail } from "@/lib/email";
import { zapiSendDocument, toZapiPhone, ZapiNotConfiguredError } from "@/lib/zapi";

const bodySchema = z.object({ channel: z.enum(["email", "whatsapp"]) });

export const maxDuration = 30;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem reenviar recibos" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const { channel } = parsed.data;
    const { db, cid: CID } = getCampaignContext(session);

    const receipt = await db.paymentReceipt.findUnique({
      where: { id: params.id },
      include: { collaborator: { select: { name: true, email: true, phone: true, campaignId: true } } },
    });
    if (!receipt || receipt.collaborator.campaignId !== CID) {
      return NextResponse.json({ error: "Recibo não encontrado" }, { status: 404 });
    }
    if (!receipt.pdfUrl) {
      return NextResponse.json({ error: "Recibo sem PDF gerado" }, { status: 400 });
    }

    if (channel === "email") {
      if (!receipt.collaborator.email) {
        return NextResponse.json({ error: "Colaborador sem email cadastrado" }, { status: 400 });
      }

      let emailStatus: "SENT" | "FAILED" = "SENT";
      let emailError: string | null = null;
      try {
        const campaign = await db.campaign.findUnique({ where: { id: CID }, select: { candidateName: true, name: true } });
        const pdfRes = await fetch(receipt.pdfUrl);
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
        await sendPaymentReceiptEmail({
          to: receipt.collaborator.email,
          collaboratorName: receipt.collaborator.name,
          amount: receipt.amount,
          pdfBuffer,
          fileName: `recibo-${receipt.id}.pdf`,
          campaignName: campaign?.candidateName ?? campaign?.name ?? "Campanha",
        });
      } catch (err) {
        emailStatus = "FAILED";
        emailError = err instanceof Error ? err.message : "Falha ao enviar email";
      }

      await db.paymentReceipt.update({ where: { id: receipt.id }, data: { emailStatus, emailError } });
      return NextResponse.json({ ok: true, emailStatus, emailError });
    }

    // channel === "whatsapp"
    if (!receipt.collaborator.phone) {
      return NextResponse.json({ error: "Colaborador sem telefone cadastrado" }, { status: 400 });
    }
    const phone = toZapiPhone(receipt.collaborator.phone);

    let whatsappStatus: "SENT" | "FAILED" = "SENT";
    let whatsappError: string | null = null;
    if (!phone) {
      whatsappStatus = "FAILED";
      whatsappError = "Telefone inválido";
    } else {
      try {
        await zapiSendDocument(CID, phone, receipt.pdfUrl, `recibo-${receipt.id}.pdf`);
      } catch (err) {
        whatsappStatus = "FAILED";
        whatsappError = err instanceof ZapiNotConfiguredError
          ? "WhatsApp não configurado"
          : err instanceof Error ? err.message : "Falha ao enviar WhatsApp";
      }
    }

    await db.paymentReceipt.update({ where: { id: receipt.id }, data: { whatsappStatus, whatsappError } });
    return NextResponse.json({ ok: true, whatsappStatus, whatsappError });
  } catch (err) {
    console.error("[api/payment-receipts/:id/resend] erro:", err);
    return NextResponse.json({ error: "Erro ao reenviar recibo" }, { status: 500 });
  }
}
