import { db } from "./db";

/**
 * Resolve a DATABASE_URL de uma campanha a partir do registro Campaign.
 * Sprint 1: o banco atual serve como meta-database temporário.
 * Sprint 3: migrar para Neon dedicado com DATABASE_URL separada.
 */
export async function getCampaignDbUrl(campaignId: string): Promise<string | null> {
  try {
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { dbUrl: true, active: true },
    });
    if (!campaign?.active) return null;
    return campaign.dbUrl ?? null;
  } catch {
    return null;
  }
}
