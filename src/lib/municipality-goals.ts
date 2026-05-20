import { getMunicipioPR } from "@/lib/tse";
import type { PrismaClient } from "@prisma/client";

export async function ensureCityGoal(city: string | null | undefined, db: PrismaClient, cid: string): Promise<void> {
  if (!city) return;
  const existing = await db.municipalityGoal.findUnique({
    where: { campaignId_city: { campaignId: cid, city } },
    select: { id: true },
  });
  if (existing) return;
  const suggestion = getMunicipioPR(city);
  if (!suggestion) return;
  await db.municipalityGoal.create({
    data: { campaignId: cid, city, targetVotes: suggestion.metaSugerida, targetLeaders: suggestion.metaLideres },
  });
}
