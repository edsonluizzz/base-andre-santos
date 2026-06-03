import { db } from "./db";

/**
 * Valida que uma Campaign existe e está ativa, retornando seu dbUrl.
 *
 * Use em endpoints multi-tenant para evitar vazamento: se o caller passa
 * um campaign_id inválido, queremos retornar 404 em vez de cair no
 * fallback silencioso de DATABASE_URL (que aponta pro banco do André).
 *
 * Retorna null se:
 *  - Campaign não existe
 *  - Campaign existe mas active=false
 *
 * Cache: 60s em memória por instance de função (evita query repetida no
 * mesmo handler quando há múltiplas calls).
 */

export interface ValidatedCampaign {
  id: string;
  name: string;
  candidateName: string | null;
  dbUrl: string | null;
}

interface CachedCampaign extends ValidatedCampaign {
  active: boolean;
  expiresAt: number;
}

const cache = new Map<string, CachedCampaign>();
const TTL_MS = 60 * 1000;

export async function validateCampaign(campaignId: string): Promise<ValidatedCampaign | null> {
  if (!campaignId) return null;

  const now = Date.now();
  const cached = cache.get(campaignId);
  if (cached && cached.expiresAt > now) {
    return cached.active
      ? { id: cached.id, name: cached.name, candidateName: cached.candidateName, dbUrl: cached.dbUrl }
      : null;
  }

  try {
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, name: true, candidateName: true, dbUrl: true, active: true },
    });
    if (!campaign) {
      cache.set(campaignId, {
        id: campaignId, name: "", candidateName: null, dbUrl: null,
        active: false, expiresAt: now + TTL_MS,
      });
      return null;
    }
    cache.set(campaignId, { ...campaign, expiresAt: now + TTL_MS });
    return campaign.active
      ? { id: campaign.id, name: campaign.name, candidateName: campaign.candidateName, dbUrl: campaign.dbUrl }
      : null;
  } catch {
    return null;
  }
}
