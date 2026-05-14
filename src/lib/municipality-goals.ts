import { db } from "@/lib/db";
import { getMunicipioPR } from "@/lib/tse";

const CID = "andre-santos-2026";

export async function ensureCityGoal(city: string | null | undefined): Promise<void> {
  if (!city) return;
  const existing = await db.municipalityGoal.findUnique({
    where: { campaignId_city: { campaignId: CID, city } },
    select: { id: true },
  });
  if (existing) return;
  const suggestion = getMunicipioPR(city);
  if (!suggestion) return;
  await db.municipalityGoal.create({
    data: { campaignId: CID, city, targetVotes: suggestion.metaSugerida, targetLeaders: suggestion.metaLideres },
  });
}
