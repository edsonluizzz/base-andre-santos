import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCampaignDbUrl } from "@/lib/meta-db";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * POST /api/n8n/normalize-phones?campaign_id=...
 *
 * Migra TODOS os Collaborator.phone para apenas dígitos (remove máscara,
 * parênteses, hífen e espaços). Idempotente.
 *
 * Antes: "(41) 99988-8951"  → Depois: "41999888951"
 *
 * Necessário porque o cadastro público salvava phone com máscara, o que
 * quebrava o lookup por suffix usado pelo WF2 (Z-API envia phone só com
 * dígitos no webhook recebido).
 *
 * Autenticação: Authorization: Bearer <N8N_API_KEY>
 */
export async function POST(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id") ?? "andre-santos-2026";

  const dbUrl = (await getCampaignDbUrl(campaignId)) ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  // Postgres: regexp_replace remove tudo que não é dígito.
  // Usar [^0-9] em vez de \D porque template literal JS engole o backslash.
  const result = await db.$executeRaw`
    UPDATE "Collaborator"
    SET "phone" = regexp_replace("phone", '[^0-9]', '', 'g')
    WHERE "campaignId" = ${campaignId}
      AND "phone" IS NOT NULL
      AND "phone" ~ '[^0-9]'
  `;

  return NextResponse.json({
    ok: true,
    campaignId,
    rowsAffected: result,
  });
}
