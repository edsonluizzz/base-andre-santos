import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db"; // UserCampaign vive no banco GLOBAL

export const dynamic = "force-dynamic";

// Convites PENDING que são duplicata: o pendingEmail pertence a alguém que JÁ tem
// um UserCampaign ACCEPTED na MESMA campanha (ou seja, já entrou — o convite
// pendente é lixo). Devolve a lista para conferência e exclusão.
async function findDuplicates() {
  const pendings = await db.userCampaign.findMany({
    where: { inviteStatus: "PENDING", pendingEmail: { not: null } },
    select: { id: true, campaignId: true, pendingEmail: true, invitedAt: true },
  });
  if (pendings.length === 0) return [];

  const emails = [...new Set(pendings.map((p) => p.pendingEmail!.toLowerCase()))];
  const users = await db.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });
  if (users.length === 0) return [];

  const userIdToEmail = new Map(users.map((u) => [u.id, (u.email ?? "").toLowerCase()]));
  const accepted = await db.userCampaign.findMany({
    where: { inviteStatus: "ACCEPTED", userId: { in: users.map((u) => u.id) } },
    select: { userId: true, campaignId: true },
  });

  const acceptedSet = new Set<string>();
  for (const a of accepted) {
    const email = a.userId ? userIdToEmail.get(a.userId) : undefined;
    if (email) acceptedSet.add(`${email}|${a.campaignId}`);
  }

  return pendings.filter((p) => acceptedSet.has(`${p.pendingEmail!.toLowerCase()}|${p.campaignId}`));
}

// GET = dry-run (lista quem seria removido).
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.user.isSuperAdmin) return NextResponse.json({ error: "Apenas super-admin" }, { status: 403 });

    const dups = await findDuplicates();
    return NextResponse.json({
      count: dups.length,
      items: dups.map((d) => ({ campaignId: d.campaignId, email: d.pendingEmail, invitedAt: d.invitedAt })),
    });
  } catch (err) {
    console.error("[cleanup-duplicate-invites GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST = executa a remoção dos PENDING duplicados. Idempotente.
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.user.isSuperAdmin) return NextResponse.json({ error: "Apenas super-admin" }, { status: 403 });

    const dups = await findDuplicates();
    if (dups.length === 0) return NextResponse.json({ deleted: 0 });

    const result = await db.userCampaign.deleteMany({ where: { id: { in: dups.map((d) => d.id) } } });
    return NextResponse.json({ deleted: result.count });
  } catch (err) {
    console.error("[cleanup-duplicate-invites POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
