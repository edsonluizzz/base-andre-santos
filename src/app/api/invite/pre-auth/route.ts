import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const CAMPAIGN_ID = "andre-santos-2026";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip)) return NextResponse.json({ error: "Muitas tentativas. Aguarde 1 minuto." }, { status: 429 });

    const { token, email } = await req.json();
    if (!token) return NextResponse.json({ error: "Token ausente" }, { status: 400 });
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Email inválido" }, { status: 400 });

    const link = await db.inviteLink.findUnique({ where: { token } });
    if (!link) return NextResponse.json({ error: "Convite inválido" }, { status: 404 });
    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verifica se já existe usuário com esse email aceito
    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    if (existingUser) {
      const alreadyAccepted = await db.userCampaign.findFirst({
        where: { userId: existingUser.id, campaignId: CAMPAIGN_ID, inviteStatus: "ACCEPTED" },
      });
      if (alreadyAccepted) {
        await db.inviteLink.update({
          where: { id: link.id },
          data: { useCount: { increment: 1 }, usedAt: new Date(), usedBy: existingUser.id },
        }).catch(() => {});
        return NextResponse.json({ ok: true, alreadyHasAccess: true });
      }
    }

    // Cria ou atualiza UserCampaign pendente para esse email
    const existing = await db.userCampaign.findFirst({
      where: { pendingEmail: normalizedEmail, campaignId: CAMPAIGN_ID },
    });
    if (!existing) {
      await db.userCampaign.create({
        data: {
          campaignId: CAMPAIGN_ID,
          pendingEmail: normalizedEmail,
          role: link.role,
          inviteStatus: "PENDING",
          invitedAt: new Date(),
        },
      });
    } else {
      await db.userCampaign.update({ where: { id: existing.id }, data: { role: link.role } });
    }

    // Registra o uso (não bloqueia — link reutilizável)
    await db.inviteLink.update({
      where: { id: link.id },
      data: { useCount: { increment: 1 }, usedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[invite/pre-auth] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
