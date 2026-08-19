import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { sendContractEmail } from "@/lib/email";
import { zapiSendText, zapiSendDocument, toZapiPhone, ZapiNotConfiguredError } from "@/lib/zapi";

const sendSchema = z.object({
  channel: z.enum(["email", "whatsapp"]),
  to: z.string().optional(), // sobrescreve o e-mail/telefone cadastrado no contrato
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const parsed = sendSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const body = parsed.data;

    const contract = await gate.db.contract.findFirst({ where: { id: params.id, campaignId: gate.cid } });
    if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    if (!contract.pdfUrl) return NextResponse.json({ error: "Contrato sem PDF gerado" }, { status: 400 });

    const campaign = await gate.db.campaign.findUnique({ where: { id: gate.cid }, select: { candidateName: true, name: true } });
    const campaignName = campaign?.candidateName ?? campaign?.name ?? undefined;
    const fileName = `${contract.code}.pdf`;

    if (body.channel === "email") {
      const to = body.to || contract.counterpartyEmail;
      if (!to) return NextResponse.json({ error: "Contrato não tem e-mail cadastrado" }, { status: 400 });

      const pdfRes = await fetch(contract.pdfUrl);
      if (!pdfRes.ok) return NextResponse.json({ error: "Falha ao baixar o PDF do contrato" }, { status: 500 });
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

      await sendContractEmail({
        to,
        counterpartyName: contract.counterpartyName,
        contractCode: contract.code,
        pdfBuffer,
        fileName,
        campaignName,
      });
      return NextResponse.json({ ok: true, channel: "email", to });
    }

    // WhatsApp
    const rawPhone = body.to || contract.counterpartyPhone;
    if (!rawPhone) return NextResponse.json({ error: "Contrato não tem telefone cadastrado" }, { status: 400 });
    const phone = toZapiPhone(rawPhone);
    if (!phone) return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });

    try {
      await zapiSendText(
        gate.cid,
        phone,
        `Olá, ${contract.counterpartyName}! Segue o Contrato ${contract.code} para assinatura. ` +
          `Para assinar eletronicamente, acesse https://sso.acesso.gov.br/login?client_id=assinador.iti.br, ` +
          `faça login com sua conta gov.br, envie o PDF abaixo e assine. Depois nos devolva o arquivo assinado por aqui mesmo ou por e-mail.`,
      );
      await zapiSendDocument(gate.cid, phone, contract.pdfUrl, fileName);
    } catch (err) {
      const message = err instanceof ZapiNotConfiguredError ? "WhatsApp não configurado" : err instanceof Error ? err.message : "Falha ao enviar WhatsApp";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    return NextResponse.json({ ok: true, channel: "whatsapp", to: phone });
  } catch (err) {
    console.error("[api/financeiro/contratos/:id/enviar POST] erro:", err);
    return NextResponse.json({ error: "Erro ao enviar contrato" }, { status: 500 });
  }
}
