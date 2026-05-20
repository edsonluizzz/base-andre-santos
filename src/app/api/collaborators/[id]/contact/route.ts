import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const existing = await db.collaborator.findFirst({
      where: { id: params.id, campaignId: CID },
      select: { id: true, registeredById: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdminOrLeader = ["ADMIN", "LEADER"].includes(session.user.role ?? "");
    const isOwner = existing.registeredById === session.user.id;
    if (!isAdminOrLeader && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.collaborator.update({
      where: { id: params.id },
      data: { lastContactedAt: new Date() },
      select: { id: true, lastContactedAt: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[collaborator contact POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
