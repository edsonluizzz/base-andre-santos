import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { suppressionFromEvent } from "@/lib/mala-direta/webhook";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    const key = process.env.RESEND_API_KEY;
    if (!secret || !key) return NextResponse.json({ error: "Não configurado" }, { status: 503 });

    const payload = await req.text();
    let event;
    try {
      event = new Resend(key).webhooks.verify({
        payload,
        headers: {
          id: req.headers.get("svix-id") ?? "",
          timestamp: req.headers.get("svix-timestamp") ?? "",
          signature: req.headers.get("svix-signature") ?? "",
        },
        webhookSecret: secret,
      });
    } catch {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
    }

    const action = suppressionFromEvent(event as Parameters<typeof suppressionFromEvent>[0]);
    if (!action) return NextResponse.json({ ok: true, ignored: true });

    // O tenant vem do próprio envio (providerId), nunca do payload.
    const send = await db.emailCampaignSend.findFirst({
      where: { providerId: action.emailId },
      select: { campaignId: true },
    });
    if (!send) return NextResponse.json({ ok: true, ignored: true });

    for (const email of action.emails) {
      await db.emailSuppression.upsert({
        where: { campaignId_email: { campaignId: send.campaignId, email } },
        create: { campaignId: send.campaignId, email, reason: action.reason },
        update: {},
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook resend] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
