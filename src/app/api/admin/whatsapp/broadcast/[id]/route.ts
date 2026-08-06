import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

/**
 * GET /api/admin/whatsapp/broadcast/[id]
 *
 * Detalhe + deliveries (paginado).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { db, cid: CID } = getCampaignContext(session);
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);
  const cursor = searchParams.get("cursor") ?? undefined;
  const statusFilter = searchParams.get("status") ?? undefined;

  const broadcast = await db.broadcast.findFirst({
    where: { id: params.id, campaignId: CID },
  });
  if (!broadcast) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { broadcastId: broadcast.id };
  if (statusFilter) where.status = statusFilter;

  const deliveries = await db.broadcastDelivery.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: {
      id: true, name: true, phone: true, status: true,
      sentAt: true, deliveredAt: true, readAt: true,
      error: true, attemptCount: true, zapiMessageId: true,
    },
  });

  const hasMore = deliveries.length > limit;
  const items = hasMore ? deliveries.slice(0, limit) : deliveries;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  // Agrega por status
  const statusCounts = await db.broadcastDelivery.groupBy({
    by: ["status"],
    where: { broadcastId: broadcast.id },
    _count: { _all: true },
  });

  return NextResponse.json({
    ok: true,
    broadcast,
    deliveries: items,
    nextCursor,
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
  });
}

/**
 * PATCH /api/admin/whatsapp/broadcast/[id]
 * Atualiza status (cancel/pause/resume) — admin only.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { db, cid: CID } = getCampaignContext(session);
  const body = await req.json().catch(() => null);
  const action = body?.action as "cancel" | "pause" | "resume" | "retry-failed" | "start" | undefined;

  const broadcast = await db.broadcast.findFirst({
    where: { id: params.id, campaignId: CID },
  });
  if (!broadcast) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // retry-failed: reseta FAILED -> PENDING e reabre o broadcast pro n8n retomar.
  // Não é mutuamente exclusivo com os outros status changes abaixo (retorna antes).
  if (action === "retry-failed") {
    if (!["COMPLETED", "FAILED", "SENDING", "PAUSED"].includes(broadcast.status)) {
      return NextResponse.json({ error: `Não há falhas pra reenviar em status ${broadcast.status}` }, { status: 400 });
    }
    const { count } = await db.broadcastDelivery.updateMany({
      where: { broadcastId: broadcast.id, status: "FAILED" },
      data: { status: "PENDING", error: null },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Nenhuma entrega com falha pra reenviar" }, { status: 400 });
    }
    const updated = await db.broadcast.update({
      where: { id: broadcast.id },
      data: { status: "QUEUED", failedCount: 0, completedAt: null },
    });
    await triggerN8nBroadcast(updated.id, CID);
    return NextResponse.json({ ok: true, broadcast: updated, retried: count });
  }

  // start: promove um DRAFT (rascunho salvo) pra QUEUED e dispara o webhook do n8n.
  if (action === "start") {
    if (broadcast.status !== "DRAFT") {
      return NextResponse.json({ error: `Só é possível iniciar rascunhos (status atual: ${broadcast.status})` }, { status: 400 });
    }
    const updated = await db.broadcast.update({
      where: { id: broadcast.id },
      data: { status: "QUEUED" },
    });
    await triggerN8nBroadcast(updated.id, CID);
    return NextResponse.json({ ok: true, broadcast: updated });
  }

  let newStatus: string | null = null;
  if (action === "cancel" && ["DRAFT", "QUEUED", "SENDING", "PAUSED"].includes(broadcast.status)) {
    newStatus = "CANCELLED";
  } else if (action === "pause" && ["QUEUED", "SENDING"].includes(broadcast.status)) {
    newStatus = "PAUSED";
  } else if (action === "resume" && broadcast.status === "PAUSED") {
    newStatus = "QUEUED";
  } else {
    return NextResponse.json({ error: `Não pode aplicar '${action}' em status ${broadcast.status}` }, { status: 400 });
  }

  const updated = await db.broadcast.update({
    where: { id: broadcast.id },
    data: {
      status: newStatus as never,
      ...(newStatus === "CANCELLED" && { completedAt: new Date() }),
    },
  });

  return NextResponse.json({ ok: true, broadcast: updated });
}

/** Dispara (fire-and-forget) o webhook do n8n pra (re)iniciar o processamento de um broadcast. */
async function triggerN8nBroadcast(broadcastId: string, campaignId: string) {
  const webhookUrl = process.env.N8N_BROADCAST_WEBHOOK_URL ?? process.env.N8N_MANUAL_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broadcastId, campaignId }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.warn("[whatsapp/broadcast retry/start] n8n trigger falhou:", err instanceof Error ? err.message : err);
  }
}
