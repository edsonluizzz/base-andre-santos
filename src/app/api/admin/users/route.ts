import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userCampaigns = await db.userCampaign.findMany({
      where: { campaignId: CID },
      include: { user: { select: { id: true, name: true, email: true, image: true, createdAt: true } } },
      orderBy: { invitedAt: "desc" },
    });

    const withStats = await Promise.all(
      userCampaigns.map(async (uc) => {
        const registered = uc.userId
          ? await db.collaborator.count({ where: { registeredById: uc.userId, campaignId: CID } })
          : 0;
        return { ...uc, registeredCount: registered };
      })
    );

    return NextResponse.json(withStats);
  } catch (err) {
    console.error("[admin/users GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { email, role } = await req.json();
    if (!email?.trim()) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });

    const targetEmail = email.trim().toLowerCase();
    const targetRole = (role as string) ?? "MEMBER";

    // Verifica se já existe User com esse email
    const existingUser = await db.user.findUnique({ where: { email: targetEmail }, select: { id: true } });

    if (existingUser) {
      // Usuário já existe → upsert UserCampaign
      await db.userCampaign.upsert({
        where: { userId_campaignId: { userId: existingUser.id, campaignId: CID } },
        update: { role: targetRole as "ADMIN" | "LEADER" | "MEMBER", inviteStatus: "ACCEPTED" },
        create: { userId: existingUser.id, campaignId: CID, role: targetRole as "ADMIN" | "LEADER" | "MEMBER", inviteStatus: "ACCEPTED", acceptedAt: new Date(), invitedBy: session.user.id },
      });
      // Atualiza role no User tb
      await db.user.update({ where: { id: existingUser.id }, data: { role: targetRole as "ADMIN" | "LEADER" | "MEMBER" } });
      return NextResponse.json({ status: "linked", message: "Acesso concedido ao usuário existente" });
    }

    // Usuário não existe → cria convite pendente (será ativado no login)
    const existing = await db.userCampaign.findFirst({ where: { pendingEmail: targetEmail, campaignId: CID } });
    if (existing) {
      await db.userCampaign.update({ where: { id: existing.id }, data: { role: targetRole as "ADMIN" | "LEADER" | "MEMBER" } });
    } else {
      await db.userCampaign.create({
        data: { pendingEmail: targetEmail, campaignId: CID, role: targetRole as "ADMIN" | "LEADER" | "MEMBER", inviteStatus: "PENDING", invitedBy: session.user.id },
      });
    }
    return NextResponse.json({ status: "pending", message: "Convite criado — ativo ao fazer login com Google" });
  } catch (err) {
    console.error("[admin/users POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
