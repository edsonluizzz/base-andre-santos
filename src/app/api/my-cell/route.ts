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

    const [uc, grouped] = await Promise.all([
      db.userCampaign.findFirst({ where: { userId: uid, campaignId: CID }, select: { tier: true } }),
      db.collaborator.groupBy({
        by: ["status"],
        where: { campaignId: CID, registeredById: uid },
        _count: { _all: true },
      }),
    ]);

    const countFor = (s: string) => grouped.find((g) => g.status === s)?._count._all ?? 0;
    const active = countFor("ACTIVE");
    const leads = countFor("LEAD");
    const inactive = countFor("INACTIVE");
    const total = grouped.reduce((sum, g) => sum + g._count._all, 0);

    return NextResponse.json({ tier: uc?.tier ?? "APOIADOR", total, active, leads, inactive, userId: uid });
  } catch (err) {
    console.error("[my-cell GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
