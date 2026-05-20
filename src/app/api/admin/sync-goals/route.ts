import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { ensureCityGoal } from "@/lib/municipality-goals";


export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rows = await db.collaborator.findMany({
      where: { campaignId: CID, city: { not: null } },
      select: { city: true },
      distinct: ["city"],
    });

    let created = 0;
    for (const { city } of rows) {
      const before = await db.municipalityGoal.count({ where: { campaignId: CID, city: city! } });
      await ensureCityGoal(city, db, cid);
      const after = await db.municipalityGoal.count({ where: { campaignId: CID, city: city! } });
      if (after > before) created++;
    }

    return NextResponse.json({ ok: true, created, total: rows.length });
  } catch (err) {
    console.error("[sync-goals]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
