import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { resolveRecipients, type BroadcastFilters } from "@/lib/broadcast-helpers";
import { z } from "zod";

const filtersSchema = z.object({
  source: z.union([z.string(), z.array(z.string())]).optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  supportStatus: z.string().optional(),
  city: z.string().optional(),
  profile: z.union([z.string(), z.array(z.string())]).optional(),
  channel: z.string().optional(),
  scoreMin: z.number().optional(),
  scoreMax: z.number().optional(),
  notContactedDays: z.number().optional(),
  hasPhone: z.boolean().optional(),
  lgpdConsent: z.boolean().optional(),
  collaboratorIds: z.array(z.string()).optional(),
}).passthrough();

const createSchema = z.object({
  title: z.string().min(2).max(150),
  message: z.string().min(2).max(4000),
  audience: z.string().max(150),                      // Label legível
  type: z.enum(["DIRECT", "GROUP", "BROADCAST"]).default("DIRECT"),
  groupId: z.string().optional(),                     // obrigatório quando type=GROUP
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.enum(["image", "document"]).optional(),
  delaySecondsMin: z.number().int().min(60).max(3600).default(300),
  delaySecondsMax: z.number().int().min(60).max(3600).default(600),
  dailyLimit: z.number().int().min(10).max(2000).default(200),
  filters: filtersSchema,
  scheduledFor: z.string().datetime().optional(),
  immediate: z.boolean().default(true),               // se true, status vai pra QUEUED imediato
  previewOnly: z.boolean().default(false),            // se true, só calcula recipients sem salvar
});

/**
 * POST /api/admin/whatsapp/broadcast
 *
 * Cria um disparo WhatsApp.
 * - previewOnly=true → só retorna count + 20 amostras (não salva)
 * - immediate=true   → cria e marca como QUEUED (n8n processa)
 * - immediate=false  → cria como DRAFT (admin revisa antes de disparar)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const data = parsed.data;

  if (data.delaySecondsMin > data.delaySecondsMax) {
    return NextResponse.json({ error: "delaySecondsMin > delaySecondsMax" }, { status: 400 });
  }
  if (data.type === "GROUP" && !data.groupId) {
    return NextResponse.json({ error: "groupId obrigatório quando type=GROUP" }, { status: 400 });
  }

  const { db, cid: CID } = getCampaignContext(session);

  // Resolve destinatários
  const filters = data.filters as BroadcastFilters;
  const { count, recipients } = await resolveRecipients(db, CID, filters, {
    preview: data.previewOnly,
  });

  if (data.previewOnly) {
    return NextResponse.json({
      ok: true,
      preview: true,
      count,
      sample: recipients.slice(0, 20),
    });
  }

  if (data.type !== "GROUP" && count === 0) {
    return NextResponse.json({ error: "Filtros não retornaram nenhum destinatário com phone válido" }, { status: 400 });
  }

  // Cria Broadcast
  const broadcast = await db.broadcast.create({
    data: {
      campaignId: CID,
      title: data.title,
      message: data.message,
      audience: data.audience,
      type: data.type,
      status: data.immediate ? "QUEUED" : "DRAFT",
      filters: filters as object,
      groupId: data.groupId ?? null,
      attachmentUrl: data.attachmentUrl ?? null,
      attachmentType: data.attachmentType ?? null,
      delaySecondsMin: data.delaySecondsMin,
      delaySecondsMax: data.delaySecondsMax,
      dailyLimit: data.dailyLimit,
      totalCount: data.type === "GROUP" ? 1 : count,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      createdBy: session.user.id,
    },
  });

  // Cria deliveries para DIRECT/BROADCAST (GROUP é uma única postagem)
  if (data.type !== "GROUP" && recipients.length > 0) {
    await db.broadcastDelivery.createMany({
      data: recipients.map((r) => ({
        broadcastId: broadcast.id,
        collaboratorId: r.id,
        phone: r.phone,
        name: r.name,
        status: "PENDING",
      })),
    });
  }

  // Dispara webhook n8n (fire-and-forget). Usa env separada do bulk-invite (WF4)
  // pois o WF5 (broadcast) espera payload diferente — { broadcastId, ... } em vez
  // de { leads: [...] }. Fallback pro env antigo evita quebrar prod até a env
  // nova ser configurada no Vercel.
  const webhookUrl = process.env.N8N_BROADCAST_WEBHOOK_URL ?? process.env.N8N_MANUAL_WEBHOOK_URL;
  if (webhookUrl && data.immediate) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        broadcastId: broadcast.id,
        campaignId: CID,
        type: broadcast.type,
        triggeredBy: session.user.id,
      }),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => {
      console.warn("[whatsapp/broadcast] n8n trigger falhou:", err?.message ?? err);
    });
  }

  return NextResponse.json({
    ok: true,
    broadcast: {
      id: broadcast.id,
      title: broadcast.title,
      status: broadcast.status,
      totalCount: broadcast.totalCount,
      createdAt: broadcast.createdAt,
    },
  }, { status: 201 });
}

/**
 * GET /api/admin/whatsapp/broadcast?limit=20
 * Lista broadcasts da campanha (mais recentes primeiro).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { db, cid: CID } = getCampaignContext(session);
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 100);

  const broadcasts = await db.broadcast.findMany({
    where: { campaignId: CID },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, title: true, audience: true, type: true, status: true,
      totalCount: true, sentCount: true, failedCount: true,
      delaySecondsMin: true, delaySecondsMax: true, dailyLimit: true,
      scheduledFor: true, startedAt: true, completedAt: true,
      createdAt: true, updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, broadcasts });
}
