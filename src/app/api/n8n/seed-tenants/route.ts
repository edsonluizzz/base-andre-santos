import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * POST /api/n8n/seed-tenants
 *
 * One-shot: popula campos padrão dos 2 tenants atuais e limpa
 * UserCampaigns duplicadas no André. Idempotente.
 *
 * Faz:
 *  1. Andre: set domain="ovile.com.br", candidateName="André Santos"
 *     (só se NULL — não sobrescreve valor existente).
 *  2. Miriam: set domain="miriam.ovile.com.br" (só se NULL).
 *  3. Deleta UserCampaigns PENDING quando existe ACCEPTED para o mesmo
 *     email+campaignId (deduplica convites antigos).
 *
 * Auth: Bearer N8N_API_KEY.
 * Será removido após uso.
 */
export async function POST(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result: Record<string, unknown> = {};

  // 1. André defaults
  const andre = await db.campaign.findUnique({
    where: { id: "andre-santos-2026" },
    select: { domain: true, candidateName: true },
  });
  if (andre) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (!andre.domain) updateData.domain = "ovile.com.br";
    if (!andre.candidateName) updateData.candidateName = "André Santos";
    if (Object.keys(updateData).length > 0) {
      await db.campaign.update({
        where: { id: "andre-santos-2026" },
        data: updateData,
      });
      result.andreUpdated = updateData;
    } else {
      result.andreUpdated = "no-changes";
    }
  } else {
    result.andreUpdated = "not-found";
  }

  // 2. Miriam defaults
  const miriam = await db.campaign.findUnique({
    where: { id: "miriam-ferreira" },
    select: { domain: true, candidateName: true },
  });
  if (miriam) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (!miriam.domain) updateData.domain = "miriam.ovile.com.br";
    if (Object.keys(updateData).length > 0) {
      await db.campaign.update({
        where: { id: "miriam-ferreira" },
        data: updateData,
      });
      result.miriamUpdated = updateData;
    } else {
      result.miriamUpdated = "no-changes";
    }
  } else {
    result.miriamUpdated = "not-found";
  }

  // 3. Dedupe UserCampaigns: deletar PENDING quando existe ACCEPTED
  //    para o mesmo pendingEmail+campaignId
  const duplicates = await db.$executeRaw`
    DELETE FROM "UserCampaign" uc1
    WHERE uc1."inviteStatus" = 'PENDING'
      AND EXISTS (
        SELECT 1 FROM "UserCampaign" uc2
        WHERE uc2."campaignId" = uc1."campaignId"
          AND uc2."inviteStatus" = 'ACCEPTED'
          AND uc2."userId" IS NOT NULL
          AND uc2."userId" IN (
            SELECT id FROM "User" WHERE email = uc1."pendingEmail"
          )
      )
  `;
  result.duplicatesDeleted = duplicates;

  return NextResponse.json({ ok: true, result });
}
