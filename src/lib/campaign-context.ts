import { getTenantDb } from "./tenant-db";
import type { PrismaClient } from "@prisma/client";

/**
 * Resolve db e cid a partir da sessão do usuário.
 * Sprint 2: dbUrl aponta para o mesmo Neon (um tenant).
 * Sprint 3: cada campanha terá seu próprio Neon — sem mudança aqui.
 */
export function getCampaignContext(session: {
  user: { dbUrl?: string; campaignId?: string };
}): { db: PrismaClient; cid: string } {
  const dbUrl = session.user.dbUrl ?? process.env.DATABASE_URL!;
  const cid   = session.user.campaignId ?? "andre-santos-2026";
  return { db: getTenantDb(dbUrl), cid };
}
