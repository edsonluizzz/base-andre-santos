import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendAccessGrantedEmail } from "@/lib/email";

const CID = "andre-santos-2026";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, role } = await req.json();
    if (!email?.trim()) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });

    const collaborator = await db.collaborator.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!collaborator) return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });

    if (collaborator.userId) {
      return NextResponse.json({ status: "already_user", message: "Este colaborador já tem acesso ao sistema" });
    }

    const targetEmail = email.trim().toLowerCase();
    const targetRole = (role as string) ?? "MEMBER";

    // Atualiza o email do Collaborator se não tinha
    if (!collaborator.email) {
      await db.collaborator.update({ where: { id: params.id }, data: { email: targetEmail } }).catch(() => {});
    }

    // Verifica se já existe User com esse email (já logou antes)
    const existingUser = await db.user.findUnique({ where: { email: targetEmail }, select: { id: true } });

    if (existingUser) {
      await db.userCampaign.upsert({
        where: { userId_campaignId: { userId: existingUser.id, campaignId: CID } },
        update: { role: targetRole as "ADMIN" | "LEADER" | "MEMBER", inviteStatus: "ACCEPTED" },
        create: {
          userId: existingUser.id, campaignId: CID,
          role: targetRole as "ADMIN" | "LEADER" | "MEMBER",
          inviteStatus: "ACCEPTED", acceptedAt: new Date(),
          invitedBy: session.user.id, collaboratorId: params.id,
        },
      });
      await db.user.update({ where: { id: existingUser.id }, data: { role: targetRole as "ADMIN" | "LEADER" | "MEMBER" } });
      // Vincula o Collaborator ao usuário existente
      await db.collaborator.update({ where: { id: params.id }, data: { userId: existingUser.id } }).catch(() => {});
      await sendAccessGrantedEmail({ to: targetEmail, role: targetRole });
      await db.auditLog.create({
        data: { action: "GRANT_ACCESS", actorId: session.user.id, targetId: existingUser.id, metadata: { email: targetEmail, role: targetRole, collaboratorId: params.id } },
      }).catch(() => {});
      return NextResponse.json({ status: "linked", message: "Acesso concedido e colaborador vinculado" });
    }

    // Usuário ainda não existe → cria invite pendente com referência ao Collaborator
    const existing = await db.userCampaign.findFirst({ where: { pendingEmail: targetEmail, campaignId: CID } });
    if (existing) {
      await db.userCampaign.update({
        where: { id: existing.id },
        data: { role: targetRole as "ADMIN" | "LEADER" | "MEMBER", collaboratorId: params.id },
      });
    } else {
      await db.userCampaign.create({
        data: {
          pendingEmail: targetEmail, campaignId: CID,
          role: targetRole as "ADMIN" | "LEADER" | "MEMBER",
          inviteStatus: "PENDING", invitedBy: session.user.id, collaboratorId: params.id,
        },
      });
    }
    await sendAccessGrantedEmail({ to: targetEmail, role: targetRole });
    await db.auditLog.create({
      data: { action: "GRANT_ACCESS", actorId: session.user.id, metadata: { email: targetEmail, role: targetRole, collaboratorId: params.id, status: "pending" } },
    }).catch(() => {});
    return NextResponse.json({ status: "pending", message: "Convite enviado — acesso ativo ao fazer login com Google" });
  } catch (err) {
    console.error("[collaborators/invite POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
