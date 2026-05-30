import { NextRequest, NextResponse } from "next/server";
import { recalcTier } from "@/lib/tier";
import { sendNewLeadNotificationEmail } from "@/lib/email";
import { sendTelegram } from "@/lib/telegram";
import { ensureCityGoal } from "@/lib/municipality-goals";
import { triggerLeadWebhook } from "@/lib/n8n";
import { resolvePublicTenant } from "@/lib/tenant-resolver";
import { isRateLimited } from "@/lib/rate-limit";
import { z } from "zod";

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
  campaignId: z.string().optional(), // tenant explícito (raro)
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await isRateLimited("cadastro_public", ip, 5, 60)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde 1 minuto." }, { status: 429 });
    }

    const parsed = cadastroSchema.safeParse(await req.json());
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Dados inválidos";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { name, phone, city, neighborhood, email, contributionTypes, refUserId, refc, source: sourceParam, channel, campaignId: explicitCampaign } = parsed.data;

    // Resolve tenant pelo host (ou explicit/fallback)
    const { db, cid: CID } = await resolvePublicTenant(req, explicitCampaign ?? null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Número de WhatsApp inválido" }, { status: 400 });
    }

    const existing = await db.collaborator.findFirst({
      where: { campaignId: CID, phone: { contains: cleanPhone.slice(-8) } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ message: "Cadastro já realizado! Entraremos em contato.", collaboratorId: existing.id }, { status: 200 });
    }

    // Valida refUserId se fornecido (usuário logado que indicou) — User está no banco GLOBAL
    let registeredById: string | null = null;
    if (refUserId) {
      const { db: globalDb } = await import("@/lib/db");
      const refUser = await globalDb.user.findUnique({ where: { id: refUserId }, select: { id: true } });
      if (refUser) registeredById = refUser.id;
    }

    // Resolve source — prioridade: INDICACAO > EVENTO > CADASTRO_PUBLICO
    const VALID_SOURCES = new Set(["EVENTO", "INSTAGRAM", "WHATSAPP"]);
    let source = VALID_SOURCES.has(sourceParam) ? sourceParam : "CADASTRO_PUBLICO";
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
        phone: phone.trim(),
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

    // Garante meta automática para a cidade (idempotente, sem bloquear resposta)
    ensureCityGoal(city?.trim() || null, db, CID).catch(() => {});

    // Leads não contam para tier (status=LEAD) — recalc só ao ativar
    if (registeredById) {
      await recalcTier(registeredById).catch(() => {});
      // Notifica o líder de célula por email — User está no banco global
      const { db: globalDb } = await import("@/lib/db");
      const refUser = await globalDb.user.findUnique({
        where: { id: registeredById },
        select: { email: true, name: true },
      }).catch(() => null);
      if (refUser?.email) {
        await sendNewLeadNotificationEmail({
          to: refUser.email,
          cellLeaderName: refUser.name ?? refUser.email,
          leadName: name.trim(),
          leadCity: city?.trim() || null,
          leadPhone: phone.trim(),
        }).catch(() => {});
      }
      // Notificação in-app para o líder — Notification está no banco global
      await globalDb.notification.create({
        data: {
          userId: registeredById,
          title: "Novo apoiador cadastrado",
          body: `${name.trim()} de ${city?.trim() || "cidade não informada"} entrou pela sua célula`,
          type: "NEW_LEAD",
          link: "/minha-celula",
        },
      }).catch(() => {});
    }

    // Auto-atribuição: se a cidade tem um líder de zona, notifica esse líder
    if (city?.trim() && !registeredById) {
      const normalizedCity = city.trim();
      const zoneLeader = await db.zoneCollaborator.findFirst({
        where: {
          isLeader: true,
          zone: {
            campaignId: CID,
            type: "MUNICIPAL",
            name: { contains: normalizedCity, mode: "insensitive" },
          },
          collaborator: { userId: { not: null } },
        },
        select: {
          collaborator: { select: { userId: true } },
          zone: { select: { name: true } },
        },
      }).catch(() => null);

      if (zoneLeader?.collaborator?.userId) {
        const { db: globalDb } = await import("@/lib/db");
        await globalDb.notification.create({
          data: {
            userId: zoneLeader.collaborator.userId,
            title: "Novo lead em sua zona",
            body: `${name.trim()} de ${normalizedCity} se cadastrou — aguarda seu contato`,
            type: "NEW_LEAD",
            link: "/colaboradores?status=LEAD",
          },
        }).catch(() => {});
      }
    }

    // Dispara n8n para contato imediato via WhatsApp (fire-and-forget)
    triggerLeadWebhook({
      collaboratorId: created.id,
      name: created.name,
      phone: created.phone!,
      campaignId: CID,
      source,
      city: city?.trim() || null,
      referredByCollaboratorId: refc || null,
    }).catch(() => {});

    // Notifica Telegram (canal central) — tenant-aware
    const sourceLabel: Record<string, string> = {
      EVENTO: "📍 Evento", INDICACAO: "🤝 Indicação", INSTAGRAM: "📸 Instagram",
      WHATSAPP: "💬 WhatsApp", CADASTRO_PUBLICO: "🌐 Site",
    };
    const cityLine = city?.trim() ? ` · 📍 ${city.trim()}` : "";
    sendTelegram(CID, `📥 <b>Novo lead:</b> ${name.trim()}${cityLine}\n<i>${sourceLabel[source] ?? source}</i>`).catch(() => {});

    return NextResponse.json({ message: "Cadastro realizado com sucesso!", collaboratorId: created.id }, { status: 201 });
  } catch (err) {
    console.error("[public/cadastro POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
