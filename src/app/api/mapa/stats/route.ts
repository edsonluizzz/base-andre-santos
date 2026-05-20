import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);

    const rows = await db.collaborator.findMany({
      where: { campaignId: CID, status: { not: "INACTIVE" }, city: { not: null } },
      select: { city: true, supportStatus: true },
    });

    const agg: Record<string, { confirmado: number; negociando: number; neutro: number; adversario: number }> = {};
    for (const r of rows) {
      const city = r.city!.trim();
      if (!agg[city]) agg[city] = { confirmado: 0, negociando: 0, neutro: 0, adversario: 0 };
      if (r.supportStatus === "CONFIRMADO")  agg[city].confirmado++;
      else if (r.supportStatus === "NEGOCIANDO") agg[city].negociando++;
      else if (r.supportStatus === "NEUTRO")     agg[city].neutro++;
      else if (r.supportStatus === "ADVERSARIO") agg[city].adversario++;
    }

    const cities = Object.entries(agg).map(([name, counts]) => ({ name, ...counts }));
    return NextResponse.json({ cities });
  } catch (err) {
    console.error("[mapa/stats GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
