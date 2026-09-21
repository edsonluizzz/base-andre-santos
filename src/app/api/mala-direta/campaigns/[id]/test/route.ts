import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { getMalaDiretaConfig } from "@/lib/mala-direta/config";
import { createResendMailer } from "@/lib/mala-direta/resend-mailer";
import { sendTestEmail } from "@/lib/mala-direta/sender";
import { isSendableEmail, normalizeEmail } from "@/lib/mala-direta/emails";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gate = await requireFinanceAdmin();
    if (!gate.ok) return gate.response;
    const campaign = await gate.db.emailCampaign.findFirst({
      where: { id: params.id, campaignId: gate.cid },
    });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const to = normalizeEmail(body.to) ?? normalizeEmail(gate.session.user.email);
    if (!to || !isSendableEmail(to)) {
      return NextResponse.json({ error: "Email de teste inválido" }, { status: 400 });
    }

    const cfg = getMalaDiretaConfig();
    await sendTestEmail({
      mailer: createResendMailer(), content: campaign,
      appUrl: cfg.appUrl, from: cfg.from, replyTo: cfg.replyTo, to,
    });
    return NextResponse.json({ ok: true, to });
  } catch (err) {
    console.error("[mala-direta test] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
