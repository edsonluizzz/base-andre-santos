import { db } from "./db";
import { decrypt } from "./crypto";

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

/**
 * Configurações de integração por tenant — sempre lidas do banco global (Campaign).
 * Retorna null para qualquer campo não configurado para o tenant.
 */
export interface CampaignIntegrations {
  metricoolToken: string | null;
  metricoolBlogId: string | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  zApiInstance: string | null;
  zApiToken: string | null;
  zApiClientToken: string | null;
}

export async function getCampaignIntegrations(campaignId: string): Promise<CampaignIntegrations> {
  try {
    const c = await db.campaign.findUnique({
      where: { id: campaignId },
      select: {
        metricoolToken: true, metricoolBlogId: true,
        telegramBotToken: true, telegramChatId: true,
        zApiInstance: true, zApiToken: true, zApiClientToken: true,
      },
    });
    return {
      metricoolToken: decrypt(c?.metricoolToken ?? null),
      metricoolBlogId: c?.metricoolBlogId ?? null,
      telegramBotToken: decrypt(c?.telegramBotToken ?? null),
      telegramChatId: c?.telegramChatId ?? null,
      zApiInstance: c?.zApiInstance ?? null,
      zApiToken: decrypt(c?.zApiToken ?? null),
      zApiClientToken: decrypt(c?.zApiClientToken ?? null),
    };
  } catch {
    return {
      metricoolToken: null, metricoolBlogId: null,
      telegramBotToken: null, telegramChatId: null,
      zApiInstance: null, zApiToken: null, zApiClientToken: null,
    };
  }
}

/**
 * Resolve a campanha pelo host (domínio customizado).
 * Usado em rotas públicas para identificar o tenant.
 * Retorna null se não houver match — caller deve aplicar fallback.
 */
export async function getCampaignByDomain(host: string): Promise<{ id: string; dbUrl: string | null } | null> {
  if (!host) return null;
  const clean = host.toLowerCase().split(":")[0].replace(/^www\./, "");
  try {
    const c = await db.campaign.findFirst({
      where: { domain: clean, active: true },
      select: { id: true, dbUrl: true },
    });
    return c ?? null;
  } catch {
    return null;
  }
}
