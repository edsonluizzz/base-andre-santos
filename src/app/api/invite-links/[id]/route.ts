import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db"; // InviteLink vive no banco global
import { getCampaignContext } from "@/lib/campaign-context";


export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { cid } = getCampaignContext(session);
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const link = await db.inviteLink.findFirst({
      where: { id: params.id, campaignId: cid },
    });
    if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.inviteLink.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[invite-links DELETE] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
