import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    const uid = session.user.id;

    const [uc, total, active, leads, inactive] = await Promise.all([
      db.userCampaign.findFirst({ where: { userId: uid, campaignId: CID }, select: { tier: true } }),
      db.collaborator.count({ where: { campaignId: CID, registeredById: uid } }),
      db.collaborator.count({ where: { campaignId: CID, registeredById: uid, status: "ACTIVE" } }),
      db.collaborator.count({ where: { campaignId: CID, registeredById: uid, status: "LEAD" } }),
      db.collaborator.count({ where: { campaignId: CID, registeredById: uid, status: "INACTIVE" } }),
    ]);

    return NextResponse.json({ tier: uc?.tier ?? "APOIADOR", total, active, leads, inactive, userId: uid });
  } catch (err) {
    console.error("[my-cell GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
