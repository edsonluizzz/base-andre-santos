import { NextRequest, NextResponse } from "next/server";
import { recalcTier } from "@/lib/tier";
import { sendNewLeadNotificationEmail } from "@/lib/email";
import { sendTelegram } from "@/lib/telegram";
import { ensureCityGoal } from "@/lib/municipality-goals";
import { triggerLeadWebhook } from "@/lib/n8n";
import { resolvePublicTenant } from "@/lib/tenant-resolver";
import { isRateLimited } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/utils";
import { z } from "zod";

const ALLOWED_ORIGINS = new Set([
  "https://prandresantos.com.br",
  "https://www.prandresantos.com.br",
  "https://leads.prandresantos.com.br",
  "https://ovile.com.br",
  "https://www.ovile.com.br",
]);

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

const cadastroSchema = z.object({
  name: z.string().min(2).max(255),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional().or(z.literal("")).or(z.null()),
  city: z.string().max(100).optional().or(z.literal("")),
  neighborhood: z.string().max(100).optional().or(z.literal("")),
  lgpdConsent: z.literal(true),
  contributionTypes: z.array(z.string()).optional(),
  refUserId: z.string().optional().or(z.literal("")),
  refc: z.string().optional().or(z.literal("")),
  source: z.string().max(50).optional(),
  eventId: z.string().optional().or(z.literal("")),
  channel: z.enum(["INSTAGRAM", "WHATSAPP", "EVENTO", "LINK", "OUTRO"]).optional(),
  // campaignId NÃO é aceito aqui: o tenant vem do domínio (anti-IDOR). Ver tenant-resolver.ts.
});

/**
 * Rate-limit adaptativo por origem:
 * - Cadastros via EBOOK_* (QR Code em eventos físicos): 100/min por IP
 *   (mesmo WiFi de igreja/auditório, dezenas de pessoas legítimas).
 * - Outros (Instagram, indicação 1:1): 5/min por IP para deter spam.
 */
function rlConfigFor(source: string | undefined): { max: number; windowSec: number } {
  const isHighVolume = typeof source === "string" && source.startsWith("EBOOK_");
  return isHighVolume ? { max: 100, windowSec: 60 } : { max: 5, windowSec: 60 };
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);
  try {
    const body = await req.json();
    const parsed = cadastroSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Dados inválidos";
      return NextResponse.json({ error: msg }, { status: 400, headers: cors });
    }
    const { name, phone, city, neighborhood, email, contributionTypes, refUserId, refc, source: sourceParam, channel } = parsed.data;

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Número de WhatsApp inválido" }, { status: 400, headers: cors });
    }

    // Resolve tenant SEMPRE pelo host (anti-IDOR — nunca por input do usuário)
    const { db, cid: CID } = await resolvePublicTenant(req);

    // 1) Dedup ANTES do rate-limit: cadastro repetido com mesmo phone retorna
    //    200 cached, sem consumir cota — evita falso 429 quando o usuário
    //    aperta "enviar" 2x ou recebe retry do browser.
    //    Lookup por phoneNormalized (índice [campaignId, phoneNormalized]) — O(log n),
    //    sem full-scan. Todos os registros foram backfilled (PLAN phoneNormalized).
    //    phone já validado >= 10 dígitos acima, então pNorm é sempre não-null aqui.
    const pNorm = normalizePhone(cleanPhone);
    const existing = pNorm
      ? await db.collaborator.findFirst({
          where: { campaignId: CID, phoneNormalized: pNorm },
          select: { id: true },
        })
      : null;
    if (existing) {
      return NextResponse.json(
        { message: "Cadastro já realizado! Entraremos em contato.", collaboratorId: existing.id },
        { status: 200, headers: cors }
      );
    }

    // 2) Rate-limit adaptativo (após dedup): EBOOK_* tem cota alta para
    //    suportar evento físico com WiFi compartilhado (~50-100 cadastros/min).
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = rlConfigFor(sourceParam);
    if (await isRateLimited("cadastro_public", ip, rl.max, rl.windowSec)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde 1 minuto." },
        { status: 429, headers: cors }
      );
    }

    // Valida refUserId se fornecido (usuário logado que indicou) — User está no banco GLOBAL
    let registeredById: string | null = null;
    if (refUserId) {
      const { db: globalDb } = await import("@/lib/db");
      const refUser = await globalDb.user.findUnique({ where: { id: refUserId }, select: { id: true } });
      if (refUser) registeredById = refUser.id;
    }

    // Resolve source — prioridade: INDICACAO > EBOOK_* > EVENTO > CADASTRO_PUBLICO
    const VALID_SOURCES = new Set(["EVENTO", "INSTAGRAM", "WHATSAPP", "EBOOK"]);
    const isEbookSource = typeof sourceParam === "string" && sourceParam.startsWith("EBOOK_");
    let source = isEbookSource || VALID_SOURCES.has(sourceParam) ? sourceParam! : "CADASTRO_PUBLICO";
    if (refc) {
      const refCollab = await db.collaborator.findFirst({
        where: { id: refc, campaignId: CID },
        select: { id: true },
      });
      if (refCollab) source = "INDICACAO";
    }

    const created = await db.collaborator.create({
      data: {
        campaignId: CID,
        name: name.trim(),
        phone: cleanPhone,
        phoneNormalized: pNorm,
        email: email?.trim() || null,
        city: city?.trim() || null,
        neighborhood: neighborhood?.trim() || null,
        campaignRole: "VOLUNTARIO",
        status: "LEAD",
        source,
        channel: channel ?? null,
        contributionTypes: Array.isArray(contributionTypes) ? contributionTypes : [],
        registeredById,
        lgpdConsent: true,
        lgpdConsentAt: new Date(),
      },
    });

    // ─── Fire-and-forget: trabalho assíncrono que NÃO bloqueia o response ────────
    // Em burst (500+ cadastros simultâneos), o critical path é só:
    //   parse → dedup → rate-limit → create → return.
    // Tudo o que segue (n8n, telegram, email, tier, zone notification) é best-effort.
    // Cada um já tem .catch() próprio. Vercel Fluid Compute mantém o handler vivo
    // o suficiente para esses tasks completarem antes de killing a instance.

    // Garante meta automática para a cidade (idempotente)
    ensureCityGoal(city?.trim() || null, db, CID).catch(() => {});

    if (registeredById) {
      recalcTier(registeredById, db, CID).catch(() => {});

      import("@/lib/db").then(async ({ db: globalDb }) => {
        const refUser = await globalDb.user.findUnique({
          where: { id: registeredById! },
          select: { email: true, name: true },
        }).catch(() => null);
        if (refUser?.email) {
          sendNewLeadNotificationEmail({
            to: refUser.email,
            cellLeaderName: refUser.name ?? refUser.email,
            leadName: name.trim(),
            leadCity: city?.trim() || null,
            leadPhone: cleanPhone,
          }).catch(() => {});
        }
        globalDb.notification.create({
          data: {
            userId: registeredById!,
            title: "Novo apoiador cadastrado",
            body: `${name.trim()} de ${city?.trim() || "cidade não informada"} entrou pela sua célula`,
            type: "NEW_LEAD",
            link: "/minha-celula",
          },
        }).catch(() => {});
      }).catch(() => {});
    }

    // Auto-atribuição: notifica líder de zona quando aplica
    if (city?.trim() && !registeredById) {
      const normalizedCity = city.trim();
      db.zoneCollaborator.findFirst({
        where: {
          isLeader: true,
          zone: {
            campaignId: CID,
            type: "MUNICIPAL",
            name: { contains: normalizedCity, mode: "insensitive" },
          },
          collaborator: { userId: { not: null } },
        },
        select: { collaborator: { select: { userId: true } } },
      }).then(async (zoneLeader) => {
        if (zoneLeader?.collaborator?.userId) {
          const { db: globalDb } = await import("@/lib/db");
          globalDb.notification.create({
            data: {
              userId: zoneLeader.collaborator.userId,
              title: "Novo lead em sua zona",
              body: `${name.trim()} de ${normalizedCity} se cadastrou — aguarda seu contato`,
              type: "NEW_LEAD",
              link: "/colaboradores?status=LEAD",
            },
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    // Dispara n8n para contato imediato via WhatsApp
    triggerLeadWebhook({
      collaboratorId: created.id,
      name: created.name,
      phone: created.phone!,
      campaignId: CID,
      source,
      city: city?.trim() || null,
      referredByCollaboratorId: refc || null,
    }).catch(() => {});

    // Notifica Telegram — tenant-aware
    const sourceLabel: Record<string, string> = {
      EVENTO: "📍 Evento", INDICACAO: "🤝 Indicação", INSTAGRAM: "📸 Instagram",
      WHATSAPP: "💬 WhatsApp", CADASTRO_PUBLICO: "🌐 Site",
    };
    const ebookLabel = source.startsWith("EBOOK_")
      ? `📘 Ebook (${source.replace(/^EBOOK_/, "").toLowerCase().replace(/_/g, "-")})`
      : null;
    const cityLine = city?.trim() ? ` · 📍 ${city.trim()}` : "";
    sendTelegram(CID, `📥 <b>Novo lead:</b> ${name.trim()}${cityLine}\n<i>${ebookLabel ?? sourceLabel[source] ?? source}</i>`).catch(() => {});

    return NextResponse.json(
      { message: "Cadastro realizado com sucesso!", collaboratorId: created.id },
      { status: 201, headers: cors }
    );
  } catch (err) {
    console.error("[public/cadastro POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500, headers: cors });
  }
}
