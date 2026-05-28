import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db"; // InviteLink vive no banco global
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { cid } = getCampaignContext(session);
    const CID = cid;
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const links = await db.inviteLink.findMany({
      where: { campaignId: cid },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(links);
  } catch (err) {
    console.error("[invite-links GET] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { cid } = getCampaignContext(session);
    const CID = cid;
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { role, expiresAt } = await req.json();

    const link = await db.inviteLink.create({
      data: {
        campaignId: cid,
        role: role ?? "MEMBER",
        createdBy: session.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (err) {
    console.error("[invite-links POST] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
