import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { role, tier } = await req.json();

    const uc = await db.userCampaign.findFirst({ where: { userId: params.id, campaignId: CID } });
    if (!uc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (role) data.role = role;
    if (tier) data.tier = tier;

    await db.userCampaign.update({ where: { id: uc.id }, data });

    if (role && uc.userId) {
      await db.user.update({ where: { id: uc.userId }, data: { role } }).catch(() => {});
    }

    await db.auditLog.create({
      data: { action: "UPDATE_USER", actorId: session.user.id, targetId: params.id, metadata: { role, tier } },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/users PUT]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (params.id === session.user.id) {
      return NextResponse.json({ error: "Não é possível revogar seu próprio acesso" }, { status: 400 });
    }

    await db.userCampaign.deleteMany({ where: { userId: params.id, campaignId: CID } });

    await db.auditLog.create({
      data: { action: "REVOKE_ACCESS", actorId: session.user.id, targetId: params.id },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/users DELETE]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Remove convite pendente
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const uc = await db.userCampaign.findUnique({ where: { id: params.id } });
    await db.userCampaign.delete({ where: { id: params.id } });

    await db.auditLog.create({
      data: { action: "REVOKE_ACCESS", actorId: session.user.id, metadata: { pendingEmail: uc?.pendingEmail } },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
