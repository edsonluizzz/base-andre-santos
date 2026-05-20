import type { PrismaClient } from "@prisma/client";

export async function recalcTier(userId: string, db: PrismaClient, cid: string): Promise<void> {
  const count = await db.collaborator.count({
    where: { registeredById: userId, status: "ACTIVE", campaignId: cid },
  });
  const tier =
    count >= 15 ? "LIDER_CELULA" :
    count >= 5  ? "ATIVISTA"     :
                  "APOIADOR";
  await db.userCampaign.updateMany({
    where: { userId, campaignId: cid },
    data: { tier },
  });
}
