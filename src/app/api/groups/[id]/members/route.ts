import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const group = await db.whatsAppGroup.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const members = await db.whatsAppGroupMember.findMany({
      where: { groupId: params.id },
      include: { collaborator: { select: { id: true, name: true, phone: true, city: true, campaignRole: true } } },
      orderBy: { collaborator: { name: "asc" } },
    });
    return NextResponse.json(members);
  } catch (err) {
    console.error("[group members GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const group = await db.whatsAppGroup.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { collaboratorId } = await req.json();
    const collab = await db.collaborator.findFirst({ where: { id: collaboratorId, campaignId: CID } });
    if (!collab) return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });

    const member = await db.whatsAppGroupMember.upsert({
      where: { groupId_collaboratorId: { groupId: params.id, collaboratorId } },
      update: {},
      create: { groupId: params.id, collaboratorId },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    console.error("[group members POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db } = getCampaignContext(session);
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { collaboratorId } = await req.json();
    await db.whatsAppGroupMember.deleteMany({ where: { groupId: params.id, collaboratorId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[group members DELETE]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
