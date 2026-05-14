import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureCityGoal } from "@/lib/municipality-goals";

const CID = "andre-santos-2026";

// Safety net diário — 10h UTC (7h BRT). Metas já são criadas inline ao cadastrar colaboradores.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-vercel-cron-signature") ??
    req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const citiesInDB = await db.collaborator.findMany({
      where: { campaignId: CID, city: { not: null } },
      select: { city: true },
      distinct: ["city"],
    });

    let created = 0;
    for (const { city } of citiesInDB) {
      const before = await db.municipalityGoal.count({ where: { campaignId: CID, city: city! } });
      await ensureCityGoal(city);
      const after = await db.municipalityGoal.count({ where: { campaignId: CID, city: city! } });
      if (after > before) created++;
    }

    console.log(`[tse-sync] criadas=${created} | total-cidades=${citiesInDB.length}`);
    return NextResponse.json({ created, total: citiesInDB.length });
  } catch (err) {
    console.error("[tse-sync]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
