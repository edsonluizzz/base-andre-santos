import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

// Cache de PrismaClient por URL — evita criar múltiplos clients para a mesma campanha
const cache = new Map<string, PrismaClient>();

/**
 * Retorna um PrismaClient conectado ao banco da campanha especificada.
 * Uso nas rotas (Sprint 2):
 *   const db  = getTenantDb(session.user.dbUrl!);
 *   const cid = session.user.campaignId!;
 */
export function getTenantDb(dbUrl: string): PrismaClient {
  if (!cache.has(dbUrl)) {
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaNeon(pool);
    cache.set(dbUrl, new PrismaClient({ adapter }));
  }
  return cache.get(dbUrl)!;
}
