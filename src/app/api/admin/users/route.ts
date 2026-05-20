import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { sendAccessGrantedEmail } from "@/lib/email";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS ?? "")
      .split(",").map((e) => e.trim()).filter(Boolean);

    const userCampaigns = await db.userCampaign.findMany({
      where: { campaignId: CID },
      include: { user: { select: { id: true, name: true, email: true, image: true, createdAt: true } } },
      orderBy: { invitedAt: "desc" },
    });

    // Busca nomes dos inviters em batch
    const inviterIds = [...new Set(userCampaigns.map((uc) => uc.invitedBy).filter(Boolean))] as string[];
    const inviters = inviterIds.length > 0
      ? await db.user.findMany({ where: { id: { in: inviterIds } }, select: { id: true, name: true } })
      : [];
    const inviterMap = Object.fromEntries(inviters.map((u) => [u.id, u.name]));

    // Busca último acesso via tabela Session
    const userIds = userCampaigns.map((uc) => uc.userId).filter(Boolean) as string[];
    const sessions = userIds.length > 0
      ? await db.session.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, expires: true },
          orderBy: { expires: "desc" },
        })
      : [];
    const lastSeenMap: Record<string, Date> = {};
    for (const s of sessions) {
      if (!lastSeenMap[s.userId] || s.expires > lastSeenMap[s.userId]) {
        lastSeenMap[s.userId] = s.expires;
      }
    }

    // Batch count — single query instead of N+1
    const regCounts = await db.collaborator.groupBy({
      by: ["registeredById"],
      where: { campaignId: CID, registeredById: { not: null } },
      _count: true,
    });
    const regCountMap = Object.fromEntries(regCounts.map((r) => [r.registeredById!, r._count]));

    const withStats = userCampaigns.map((uc) => ({
      ...uc,
      registeredCount: uc.userId ? (regCountMap[uc.userId] ?? 0) : 0,
      isSuperAdmin: uc.user?.email ? superAdminEmails.includes(uc.user.email) : false,
      invitedByName: uc.invitedBy ? (inviterMap[uc.invitedBy] ?? null) : null,
      lastSeen: uc.userId ? (lastSeenMap[uc.userId] ?? null) : null,
    }));

    return NextResponse.json({ users: withStats, currentUserId: session.user.id });
  } catch (err) {
    console.error("[admin/users GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { email, role } = await req.json();
    if (!email?.trim()) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });

    const targetEmail = email.trim().toLowerCase();
    const targetRole = (role as string) ?? "MEMBER";

    const existingUser = await db.user.findUnique({ where: { email: targetEmail }, select: { id: true } });

    if (existingUser) {
      await db.userCampaign.upsert({
        where: { userId_campaignId: { userId: existingUser.id, campaignId: CID } },
        update: { role: targetRole as "ADMIN" | "LEADER" | "MEMBER", inviteStatus: "ACCEPTED" },
        create: { userId: existingUser.id, campaignId: CID, role: targetRole as "ADMIN" | "LEADER" | "MEMBER", inviteStatus: "ACCEPTED", acceptedAt: new Date(), invitedBy: session.user.id },
      });
      await db.user.update({ where: { id: existingUser.id }, data: { role: targetRole as "ADMIN" | "LEADER" | "MEMBER" } });
      await sendAccessGrantedEmail({ to: targetEmail, role: targetRole });
      await db.auditLog.create({ data: { action: "GRANT_ACCESS", actorId: session.user.id, targetId: existingUser.id, metadata: { email: targetEmail, role: targetRole } } }).catch(() => {});
      return NextResponse.json({ status: "linked", message: "Acesso concedido ao usuário existente" });
    }

    const existing = await db.userCampaign.findFirst({ where: { pendingEmail: targetEmail, campaignId: CID } });
    if (existing) {
      await db.userCampaign.update({ where: { id: existing.id }, data: { role: targetRole as "ADMIN" | "LEADER" | "MEMBER" } });
    } else {
      await db.userCampaign.create({
        data: { pendingEmail: targetEmail, campaignId: CID, role: targetRole as "ADMIN" | "LEADER" | "MEMBER", inviteStatus: "PENDING", invitedBy: session.user.id },
      });
    }
    await sendAccessGrantedEmail({ to: targetEmail, role: targetRole });
    await db.auditLog.create({ data: { action: "GRANT_ACCESS", actorId: session.user.id, metadata: { email: targetEmail, role: targetRole, status: "pending" } } }).catch(() => {});
    return NextResponse.json({ status: "pending", message: "Convite criado — ativo ao fazer login com Google" });
  } catch (err) {
    console.error("[admin/users POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
