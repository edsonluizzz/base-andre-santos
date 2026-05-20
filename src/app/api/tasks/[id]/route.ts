import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const task = await db.task.findFirst({
      where: { id: params.id, campaignId: CID },
    });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = task.assignedToId === session.user.id || task.createdById === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { status } = await req.json();
    const newStatus = status ?? (task.status === "PENDING" ? "DONE" : "PENDING");

    const updated = await db.task.update({
      where: { id: params.id },
      data: { status: newStatus },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[task PATCH]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const task = await db.task.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = task.assignedToId === session.user.id || task.createdById === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.task.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[task DELETE]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
