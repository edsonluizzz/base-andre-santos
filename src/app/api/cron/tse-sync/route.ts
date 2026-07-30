import { NextRequest, NextResponse } from "next/server";
import { db as globalDb } from "@/lib/db";
import { ensureCityGoal } from "@/lib/municipality-goals";
import { getCampaignContext } from "@/lib/campaign-context";
import { cronSecretMatches } from "@/lib/api-auth";

// Safety net diário — 10h UTC (7h BRT). Itera todas as campanhas ativas.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-vercel-cron-signature") ??
    req.nextUrl.searchParams.get("secret");
  if (!cronSecretMatches(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const campaigns = await globalDb.campaign.findMany({
      where: { active: true },
      select: { id: true, dbUrl: true },
    });

    const perCampaign: Array<{ campaignId: string; created: number; total: number }> = [];

    for (const camp of campaigns) {
      try {
        const { db } = getCampaignContext({ user: { campaignId: camp.id, dbUrl: camp.dbUrl ?? undefined } });
        const citiesInDB = await db.collaborator.findMany({
          where: { campaignId: camp.id, city: { not: null } },
          select: { city: true },
          distinct: ["city"],
        });

        let created = 0;
        for (const { city } of citiesInDB) {
          const before = await db.municipalityGoal.count({ where: { campaignId: camp.id, city: city! } });
          await ensureCityGoal(city, db, camp.id);
          const after = await db.municipalityGoal.count({ where: { campaignId: camp.id, city: city! } });
          if (after > before) created++;
        }
        perCampaign.push({ campaignId: camp.id, created, total: citiesInDB.length });
      } catch (err) {
        console.error(`[tse-sync] erro na campanha ${camp.id}:`, err);
      }
    }

    console.log(`[tse-sync] campanhas=${perCampaign.length}`, perCampaign);
    return NextResponse.json({ campaigns: perCampaign });
  } catch (err) {
    console.error("[tse-sync]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
