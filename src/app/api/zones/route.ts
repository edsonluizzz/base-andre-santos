import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    const zones = await db.zone.findMany({
      where: { campaignId: CID },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, type: true } },
        _count: { select: { collaborators: true } },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(zones);
  } catch (err) {
    console.error("[zones GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, type, parentId, color } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    const zone = await db.zone.create({
      data: { campaignId: CID, name: name.trim(), type: type ?? "MUNICIPAL", parentId: parentId || null, color: color || null },
    });
    return NextResponse.json(zone, { status: 201 });
  } catch (err) {
    console.error("[zones POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
