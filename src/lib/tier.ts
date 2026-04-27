import { db } from "@/lib/db";

const CID = "andre-santos-2026";

export async function recalcTier(userId: string): Promise<void> {
  const count = await db.collaborator.count({
    where: { registeredById: userId, status: "ACTIVE", campaignId: CID },
  });
  const tier =
    count >= 15 ? "LIDER_CELULA" :
    count >= 5  ? "ATIVISTA"     :
                  "APOIADOR";
  await db.userCampaign.updateMany({
    where: { userId, campaignId: CID },
    data: { tier },
  });
}
