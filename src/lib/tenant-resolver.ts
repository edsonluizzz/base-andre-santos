/**
 * Resolução de tenant para rotas PÚBLICAS (sem sessão).
 *
 * SEGURANÇA: o tenant é resolvido EXCLUSIVAMENTE pelo domínio do request.
 * Rotas públicas NÃO confiam em campaignId vindo de body/query/header — isso
 * permitiria escrita cross-tenant (IDOR): um anônimo enviaria o campaignId de
 * outra campanha e inseriria leads no banco dela. O domínio onde o formulário
 * está hospedado (ovile.com.br = André, miriam.ovile.com.br = Miriam) é a única
 * fonte de verdade confiável.
 *
 * Prioridade:
 *   1) host header → Campaign.domain (ativo)
 *   2) fallback "andre-santos-2026" (campanha original)
 */

import type { NextRequest } from "next/server";
import { db as globalDb } from "./db";
import { getCampaignContext } from "./campaign-context";
import { getCampaignByDomain } from "./meta-db";
import type { PrismaClient } from "@prisma/client";

// Mesma lógica de DEFAULT_CAMPAIGN_ID de auth.ts — cada implantação (projeto
// Vercel) tem seu próprio tenant padrão.
const FALLBACK_CID = process.env.DEFAULT_CAMPAIGN_ID ?? "andre-santos-2026";

export interface PublicTenantContext {
  db: PrismaClient;
  cid: string;
  source: "domain" | "fallback";
}

export async function resolvePublicTenant(
  req: NextRequest
): Promise<PublicTenantContext> {
  // Domínio do request — única fonte confiável em rota pública
  const host = req.headers.get("host") ?? req.headers.get("x-forwarded-host") ?? "";
  const matched = await getCampaignByDomain(host);
  if (matched) return buildContext(matched.id, "domain", matched.dbUrl);

  // Fallback: campanha original
  return buildContext(FALLBACK_CID, "fallback");
}

async function buildContext(
  cid: string,
  source: PublicTenantContext["source"],
  knownDbUrl?: string | null
): Promise<PublicTenantContext> {
  let dbUrl: string | null | undefined = knownDbUrl;
  if (dbUrl === undefined) {
    const c = await globalDb.campaign.findUnique({
      where: { id: cid },
      select: { dbUrl: true, active: true },
    });
    dbUrl = c?.active ? c.dbUrl : null;
  }
  const { db } = getCampaignContext({ user: { campaignId: cid, dbUrl: dbUrl ?? undefined } });
  return { db, cid, source };
}
