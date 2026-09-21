import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { getMalaDiretaConfig } from "@/lib/mala-direta/config";
import { loadRecipients } from "@/lib/mala-direta/recipients";
import { createPrismaSendStore } from "@/lib/mala-direta/prisma-store";
import { createResendMailer } from "@/lib/mala-direta/resend-mailer";
import { sendWave } from "@/lib/mala-direta/sender";

export const maxDuration = 60;

const bodySchema = z.object({ requested: z.number().int().min(1).max(5000) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gate = await requireFinanceAdmin();
    if (!gate.ok) return gate.response;
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "requested inválido" }, { status: 400 });

    const campaign = await gate.db.emailCampaign.findFirst({
      where: { id: params.id, campaignId: gate.cid },
    });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const cfg = getMalaDiretaConfig();
    const store = createPrismaSendStore(gate.db, gate.cid, campaign.id);

    // Seed idempotente: quem já está na tabela é ignorado; supressões novas já ficam de fora.
    const { recipients } = await loadRecipients(gate.db, gate.cid);
    await store.seed(recipients);

    const result = await sendWave({
      store, mailer: createResendMailer(), content: campaign,
      appUrl: cfg.appUrl, from: cfg.from, replyTo: cfg.replyTo,
      dailyLimit: cfg.dailyLimit, requested: parsed.data.requested,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[mala-direta send] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
