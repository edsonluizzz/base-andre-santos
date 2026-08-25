import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

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
    // PrismaNeon(pool) com um `Pool` do @neondatabase/serverless quebra em
    // runtime (TypeError ERR_INVALID_ARG_TYPE em addCString, no startup do
    // protocolo Postgres) — mesmo bug reproduzido com QUALQUER dbUrl Neon,
    // inclusive o do André. O construtor correto (igual a db.ts, que funciona
    // em produção) é passar { connectionString } direto, sem Pool manual.
    const isNeon = /neon\.tech/i.test(dbUrl);
    const adapter = isNeon ? new PrismaNeon({ connectionString: dbUrl }) : new PrismaPg({ connectionString: dbUrl });
    cache.set(dbUrl, new PrismaClient({ adapter }));
  }
  return cache.get(dbUrl)!;
}
