/**
 * Resolução de tenant para rotas públicas (sem sessão).
 * Prioridade:
 *   1) header `x-campaign-id` (interno, usado por testes/server actions)
 *   2) campaign_id em query/body explicitamente
 *   3) host header → Campaign.domain
 *   4) fallback "andre-santos-2026" (campanha original)
 */

import type { NextRequest } from "next/server";
import { db as globalDb } from "./db";
import { getCampaignContext } from "./campaign-context";
import { getCampaignByDomain } from "./meta-db";
import type { PrismaClient } from "@prisma/client";

const FALLBACK_CID = "andre-santos-2026";

export interface PublicTenantContext {
  db: PrismaClient;
  cid: string;
  source: "header" | "explicit" | "domain" | "fallback";
}

export async function resolvePublicTenant(
  req: NextRequest,
  explicitCampaignId?: string | null
): Promise<PublicTenantContext> {
  // 1) Header interno
  const headerCid = req.headers.get("x-campaign-id");
  if (headerCid) return buildContext(headerCid, "header");

  // 2) Explícito (vindo do body/query do caller)
  if (explicitCampaignId) return buildContext(explicitCampaignId, "explicit");

  // 3) Domínio do request
  const host = req.headers.get("host") ?? req.headers.get("x-forwarded-host") ?? "";
  const matched = await getCampaignByDomain(host);
  if (matched) return buildContext(matched.id, "domain", matched.dbUrl);

  // 4) Fallback
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
