import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recalcTier } from "@/lib/tier";
import { sendNewLeadNotificationEmail } from "@/lib/email";

const CID = "andre-santos-2026";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde 1 minuto." }, { status: 429 });
    }

    const body = await req.json();
    const { name, phone, city, neighborhood, email, contributionTypes, refUserId, refc, lgpdConsent } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ error: "WhatsApp é obrigatório" }, { status: 400 });
    if (!lgpdConsent) return NextResponse.json({ error: "Consentimento LGPD é obrigatório" }, { status: 400 });

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

    // Valida refUserId se fornecido (usuário logado que indicou)
    let registeredById: string | null = null;
    if (refUserId) {
      const refUser = await db.user.findUnique({ where: { id: refUserId }, select: { id: true } });
      if (refUser) registeredById = refUser.id;
    }

    // Resolve source — refc indica indicação por colaborador público
    let source = "CADASTRO_PUBLICO";
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
        contributionTypes: Array.isArray(contributionTypes) ? contributionTypes : [],
        registeredById,
        lgpdConsent: true,
        lgpdConsentAt: new Date(),
      },
    });

    // Leads não contam para tier (status=LEAD) — recalc só ao ativar
    if (registeredById) {
      await recalcTier(registeredById).catch(() => {});
      // Notifica o líder de célula por email
      const refUser = await db.user.findUnique({
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
      // Notificação in-app para o líder
      await db.notification.create({
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
        await db.notification.create({
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

    return NextResponse.json({ message: "Cadastro realizado com sucesso!", collaboratorId: created.id }, { status: 201 });
  } catch (err) {
    console.error("[public/cadastro POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
