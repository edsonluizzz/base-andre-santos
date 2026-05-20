import { getTenantDb } from "./tenant-db";
import { db as globalDb } from "./db";
import type { PrismaClient } from "@prisma/client";

/**
 * Resolve db e cid a partir da sessão.
 * Usa o db global (singleton) quando o banco é o mesmo (caso single-tenant).
 * Só cria um novo PrismaClient via getTenantDb quando a URL é diferente (multi-tenant real).
 */
export function getCampaignContext(session: {
  user: { dbUrl?: string; campaignId?: string };
}): { db: PrismaClient; cid: string } {
  const dbUrl = session.user.dbUrl ?? process.env.DATABASE_URL!;
  const cid   = session.user.campaignId ?? "andre-santos-2026";

  // Mesma URL → usa o db global provado em produção
  // URL diferente → cria client isolado para o tenant (Sprint 3+)
  const db = (!dbUrl || dbUrl === process.env.DATABASE_URL)
    ? globalDb
    : getTenantDb(dbUrl);

  return { db, cid };
}
