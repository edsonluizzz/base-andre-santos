import { NextRequest, NextResponse } from "next/server";
import { n8nAuthCheck as authCheck } from "@/lib/api-auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { validateCampaign } from "@/lib/validate-campaign";
import { renderMessage } from "@/lib/broadcast-helpers";
import { applyMessageVariation, variantIndexFor } from "@/lib/message-variation";

/**
 * GET /api/n8n/broadcast/next?broadcastId=...&campaign_id=...
 *
 * Endpoint consumido pelo n8n WF "broadcast-manual" a cada disparo.
 * Retorna a próxima delivery PENDING + a mensagem já renderizada com
 * placeholders ({nome}, {primeironome}, {cidade}) substituídos.
 *
 * Também impõe dailyLimit: se já enviou dailyLimit hoje no broadcast,
 * retorna { done: false, paused: true, reason: "daily-limit" } pro n8n
 * aguardar e re-checar amanhã (ou marcar como PAUSED).
 *
 * Resposta quando há delivery:
 *   { ok, broadcast: {...}, delivery: {...}, message, zapi: {...} }
 *
 * Quando não há mais:
 *   { ok, done: true, totalDeliveries }
 *
 * Quando bateu daily limit:
 *   { ok, paused: true, reason: "daily-limit", retryAfterMinutes }
 */
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const broadcastId = searchParams.get("broadcastId");
  const campaignId = searchParams.get("campaign_id") ?? "andre-santos-2026";
  if (!broadcastId) {
    return NextResponse.json({ error: "broadcastId obrigatório" }, { status: 400 });
  }

  const validated = await validateCampaign(campaignId);
  if (!validated) {
    return NextResponse.json(
      { error: `Campaign '${campaignId}' não encontrada ou inativa` },
      { status: 404 }
    );
  }
  const dbUrl = validated.dbUrl ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  const broadcast = await db.broadcast.findFirst({
    where: { id: broadcastId, campaignId },
  });
  if (!broadcast) {
    return NextResponse.json({ error: "Broadcast não encontrado" }, { status: 404 });
  }

  if (["COMPLETED", "FAILED", "CANCELLED"].includes(broadcast.status)) {
    return NextResponse.json({ ok: true, done: true, status: broadcast.status });
  }

  if (broadcast.status === "PAUSED") {
    return NextResponse.json({ ok: true, paused: true, reason: "manual-pause" });
  }

  if (broadcast.scheduledFor && broadcast.scheduledFor > new Date()) {
    const retryAfterMinutes = Math.max(1, Math.ceil((broadcast.scheduledFor.getTime() - Date.now()) / 60000));
    return NextResponse.json({
      ok: true,
      paused: true,
      reason: "scheduled",
      scheduledFor: broadcast.scheduledFor,
      retryAfterMinutes,
    });
  }

  // Conta deliveries enviadas nas últimas 24h pra impor dailyLimit
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sentLast24h = await db.broadcastDelivery.count({
    where: {
      broadcastId,
      status: { in: ["SENT", "DELIVERED", "READ"] },
      sentAt: { gte: since24h },
    },
  });
  if (sentLast24h >= broadcast.dailyLimit) {
    return NextResponse.json({
      ok: true,
      paused: true,
      reason: "daily-limit",
      dailyLimit: broadcast.dailyLimit,
      sentLast24h,
      retryAfterMinutes: 60,
    });
  }

  // Pega próxima PENDING
  const next = await db.broadcastDelivery.findFirst({
    where: { broadcastId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  if (!next) {
    // Sem mais PENDING — marcar broadcast como COMPLETED
    const counts = await db.broadcastDelivery.groupBy({
      by: ["status"],
      where: { broadcastId },
      _count: { _all: true },
    });
    const sent = counts.find((c) => c.status === "SENT" || c.status === "DELIVERED" || c.status === "READ");
    const failed = counts.find((c) => c.status === "FAILED");
    await db.broadcast.update({
      where: { id: broadcastId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        sentCount: sent?._count._all ?? 0,
        failedCount: failed?._count._all ?? 0,
      },
    });
    return NextResponse.json({ ok: true, done: true });
  }

  // Renderiza mensagem com placeholders
  const recipientCity = next.collaboratorId
    ? (await db.collaborator.findUnique({ where: { id: next.collaboratorId }, select: { city: true } }))?.city ?? null
    : null;

  let renderedMessage = renderMessage(broadcast.message, {
    name: next.name ?? "apoiador(a)",
    city: recipientCity,
  });

  // Anti-ban: varia saudação/fechamento por destinatário (sem alterar o conteúdo).
  // Só se aplica a envios individuais (GROUP é uma postagem única, sem sentido variar).
  if (broadcast.varyMessage && broadcast.type !== "GROUP") {
    renderedMessage = applyMessageVariation(renderedMessage, variantIndexFor(next.id, 8));
  }

  // Garante que broadcast.status = SENDING + startedAt setado
  if (broadcast.status === "QUEUED") {
    await db.broadcast.update({
      where: { id: broadcastId },
      data: { status: "SENDING", startedAt: new Date() },
    });
  }

  // Z-API config do tenant
  const { getCampaignIntegrations } = await import("@/lib/meta-db");
  const integrations = await getCampaignIntegrations(campaignId);

  return NextResponse.json({
    ok: true,
    broadcast: {
      id: broadcast.id,
      type: broadcast.type,
      groupId: broadcast.groupId,
      attachmentUrl: broadcast.attachmentUrl,
      attachmentType: broadcast.attachmentType,
      delaySecondsMin: broadcast.delaySecondsMin,
      delaySecondsMax: broadcast.delaySecondsMax,
    },
    delivery: {
      id: next.id,
      phone: next.phone,
      name: next.name,
    },
    message: renderedMessage,
    zapi: integrations.zApiInstance && integrations.zApiToken && integrations.zApiClientToken ? {
      instance: integrations.zApiInstance,
      token: integrations.zApiToken,
      clientToken: integrations.zApiClientToken,
      sendTextUrl: `https://api.z-api.io/instances/${integrations.zApiInstance}/token/${integrations.zApiToken}/send-text`,
      sendImageUrl: `https://api.z-api.io/instances/${integrations.zApiInstance}/token/${integrations.zApiToken}/send-image`,
      sendDocumentUrl: `https://api.z-api.io/instances/${integrations.zApiInstance}/token/${integrations.zApiToken}/send-document`,
      sendGroupTextUrl: `https://api.z-api.io/instances/${integrations.zApiInstance}/token/${integrations.zApiToken}/send-text`,
      configured: true,
    } : { configured: false },
  });
}
