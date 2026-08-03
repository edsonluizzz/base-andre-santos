import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const groups = await db.collaborator.groupBy({
      by: ["city", "supportStatus"],
      where: { campaignId: CID, status: { not: "INACTIVE" }, city: { not: null } },
      _count: true,
    });

    // Merge trimando o nome — cidades com espaço extra não normalizado ainda
    // caem no mesmo grupo (groupBy no banco não sabe disso, só JS pós-hoc).
    const agg: Record<string, { confirmado: number; negociando: number; neutro: number; adversario: number }> = {};
    for (const g of groups) {
      if (!g.city) continue;
      const city = g.city.trim();
      if (!agg[city]) agg[city] = { confirmado: 0, negociando: 0, neutro: 0, adversario: 0 };
      if (g.supportStatus === "CONFIRMADO")  agg[city].confirmado += g._count;
      else if (g.supportStatus === "NEGOCIANDO") agg[city].negociando += g._count;
      else if (g.supportStatus === "NEUTRO")     agg[city].neutro += g._count;
      else if (g.supportStatus === "ADVERSARIO") agg[city].adversario += g._count;
    }

    const cities = Object.entries(agg).map(([name, counts]) => ({ name, ...counts }));
    return NextResponse.json({ cities });
  } catch (err) {
    console.error("[mapa/stats GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
