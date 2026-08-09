import { NextRequest, NextResponse } from "next/server";
import { n8nAuthCheck as authCheck } from "@/lib/api-auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { validateCampaign } from "@/lib/validate-campaign";
import { z } from "zod";

const patchSchema = z.object({
  campaignId: z.string().optional(),
  status: z.enum(["SENT", "DELIVERED", "READ", "FAILED", "SKIPPED"]),
  zapiMessageId: z.string().optional(),
  error: z.string().max(500).optional(),
});

/**
 * PATCH /api/n8n/broadcast/delivery/[id]
 *
 * Atualiza o status de uma delivery após o n8n executar a chamada Z-API.
 * Também atualiza sentCount/failedCount no broadcast pai e lastContactedAt
 * do Collaborator quando SENT.
 *
 * Body: { status: SENT|FAILED|..., zapiMessageId?, error?, campaignId? }
 * Auth: Bearer N8N_API_KEY
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Body inválido" }, { status: 400 });
  }

  const { status, zapiMessageId, error: errMsg, campaignId: explicitCid } = parsed.data;
  const campaignId = explicitCid ?? "andre-santos-2026";
  const validated = await validateCampaign(campaignId);
  if (!validated) {
    return NextResponse.json(
      { error: `Campaign '${campaignId}' não encontrada ou inativa` },
      { status: 404 }
    );
  }
  const dbUrl = validated.dbUrl ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  const delivery = await db.broadcastDelivery.findUnique({
    where: { id: params.id },
    select: { id: true, broadcastId: true, collaboratorId: true, status: true, attemptCount: true },
  });
  if (!delivery) return NextResponse.json({ error: "Delivery não encontrada" }, { status: 404 });

  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {
    status,
    attemptCount: (delivery.attemptCount ?? 0) + 1,
    updatedAt: now,
  };
  if (status === "SENT") data.sentAt = now;
  if (status === "DELIVERED") data.deliveredAt = now;
  if (status === "READ") data.readAt = now;
  if (zapiMessageId) data.zapiMessageId = zapiMessageId;
  if (errMsg) data.error = errMsg;

  await db.broadcastDelivery.update({ where: { id: delivery.id }, data });

  // Só soma no contador do broadcast pai na 1ª confirmação dessa entrega — se o n8n
  // chamar esse webhook de novo pra mesma entrega (retry/timeout), não pode contar 2x.
  const isFirstConfirmation = delivery.status === "PENDING" || delivery.status === "SENDING";

  if (isFirstConfirmation && status === "SENT") {
    await db.broadcast.update({
      where: { id: delivery.broadcastId },
      data: { sentCount: { increment: 1 } },
    }).catch(() => {});
    if (delivery.collaboratorId) {
      await db.collaborator.update({
        where: { id: delivery.collaboratorId },
        data: { lastContactedAt: now },
      }).catch(() => {});
    }
  } else if (isFirstConfirmation && status === "FAILED") {
    await db.broadcast.update({
      where: { id: delivery.broadcastId },
      data: { failedCount: { increment: 1 } },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, id: delivery.id, status });
}
