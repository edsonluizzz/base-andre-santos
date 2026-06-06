import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    // Agrega no banco (groupBy) em vez de puxar todos os colaboradores de cada líder
    const grouped = await db.collaborator.groupBy({
      by: ["registeredById", "status"],
      where: { campaignId: CID, registeredById: { not: null } },
      _count: { _all: true },
    });

    const byLeader = new Map<string, { total: number; active: number; leads: number }>();
    for (const g of grouped) {
      const id = g.registeredById!;
      const e = byLeader.get(id) ?? { total: 0, active: 0, leads: 0 };
      const c = g._count._all;
      e.total += c;
      if (g.status === "ACTIVE") e.active += c;
      if (g.status === "LEAD") e.leads += c;
      byLeader.set(id, e);
    }

    // Top 20 por ativos (desempate por total) — só busca os dados desses líderes
    const top = [...byLeader.entries()]
      .sort((a, b) => b[1].active - a[1].active || b[1].total - a[1].total)
      .slice(0, 20);

    const users = await db.user.findMany({
      where: { id: { in: top.map(([id]) => id) } },
      select: {
        id: true, name: true, image: true,
        userCampaigns: { where: { campaignId: CID }, select: { tier: true } },
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const ranked = top.map(([id, s]) => {
      const u = userMap.get(id);
      const conv = s.total > 0 ? Math.round((s.active / s.total) * 100) : 0;
      return {
        id,
        name: u?.name ?? null,
        image: u?.image ?? null,
        tier: u?.userCampaigns[0]?.tier ?? "APOIADOR",
        total: s.total, active: s.active, leads: s.leads, conv,
      };
    });

    return NextResponse.json(ranked);
  } catch (err) {
    console.error("[ranking GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
