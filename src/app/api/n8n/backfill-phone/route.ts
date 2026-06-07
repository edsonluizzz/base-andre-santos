import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { validateCampaign } from "@/lib/validate-campaign";

// One-shot (Step 2 do PLAN phoneNormalized): popula phoneNormalized nos registros
// existentes via UPDATE em lote no Postgres. Idempotente (só onde IS NULL).
// REMOVER após uso (Step 3).
export const maxDuration = 60;

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

export async function POST(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id") ?? "andre-santos-2026";

  const validated = await validateCampaign(campaignId);
  if (!validated) {
    return NextResponse.json({ error: `Campaign '${campaignId}' inválida` }, { status: 404 });
  }
  const dbUrl = validated.dbUrl ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  try {
    // RIGHT(só-dígitos, 8) = mesma chave do helper normalizePhone (últimos 8 dígitos)
    const updated = await db.$executeRaw`
      UPDATE "Collaborator"
      SET "phoneNormalized" = RIGHT(REGEXP_REPLACE("phone", '[^0-9]', '', 'g'), 8)
      WHERE "campaignId" = ${campaignId}
        AND "phone" IS NOT NULL
        AND "phoneNormalized" IS NULL
        AND LENGTH(REGEXP_REPLACE("phone", '[^0-9]', '', 'g')) >= 8
    `;
    return NextResponse.json({ ok: true, campaignId, updated });
  } catch (err) {
    console.error("[backfill-phone]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
