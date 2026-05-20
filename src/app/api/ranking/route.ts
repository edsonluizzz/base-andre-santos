import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);

    const leaders = await db.user.findMany({
      where: { registeredCollaborators: { some: { campaignId: CID } } },
      select: {
        id: true, name: true, image: true,
        userCampaigns: { where: { campaignId: CID }, select: { tier: true } },
        registeredCollaborators: {
          where: { campaignId: CID },
          select: { status: true },
        },
      },
    });

    const ranked = leaders
      .map((l) => {
        const total    = l.registeredCollaborators.length;
        const active   = l.registeredCollaborators.filter((c) => c.status === "ACTIVE").length;
        const leads    = l.registeredCollaborators.filter((c) => c.status === "LEAD").length;
        const conv     = total > 0 ? Math.round((active / total) * 100) : 0;
        return { id: l.id, name: l.name, image: l.image, tier: l.userCampaigns[0]?.tier ?? "APOIADOR", total, active, leads, conv };
      })
      .sort((a, b) => b.active - a.active || b.total - a.total)
      .slice(0, 20);

    return NextResponse.json(ranked);
  } catch (err) {
    console.error("[ranking GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
