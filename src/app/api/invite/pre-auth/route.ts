import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const CAMPAIGN_ID = "andre-santos-2026";

export async function POST(req: NextRequest) {
  try {
    const { token, email } = await req.json();
    if (!token) return NextResponse.json({ error: "Token ausente" }, { status: 400 });
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Email inválido" }, { status: 400 });

    const link = await db.inviteLink.findUnique({ where: { token } });
    if (!link) return NextResponse.json({ error: "Convite inválido" }, { status: 404 });
    if (link.usedAt) return NextResponse.json({ error: "Convite já utilizado" }, { status: 410 });
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
        // Marca link como usado e retorna ok — pessoa já tem acesso
        await db.inviteLink.update({ where: { id: link.id }, data: { usedAt: new Date(), usedBy: existingUser.id } }).catch(() => {});
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
      // Atualiza o role do convite pendente existente
      await db.userCampaign.update({ where: { id: existing.id }, data: { role: link.role } });
    }

    // Marca o InviteLink como usado
    await db.inviteLink.update({ where: { id: link.id }, data: { usedAt: new Date() } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[invite/pre-auth] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
