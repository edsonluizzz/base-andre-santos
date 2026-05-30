import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCampaignDbUrl } from "@/lib/meta-db";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * GET /api/n8n/lead-by-phone?phone=...&campaign_id=...
 *
 * Busca um lead/colaborador pelo telefone (últimos 9 dígitos).
 * Usado pelo WF2 (resposta WhatsApp) para descobrir o nome antes
 * de personalizar as mensagens.
 *
 * Resposta: { found: bool, name?: string, id?: string }
 *
 * Autenticação: Authorization: Bearer <N8N_API_KEY>
 */
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone") ?? "";
  const campaignId = searchParams.get("campaign_id") ?? "andre-santos-2026";

  if (!phone) {
    return NextResponse.json({ error: "phone obrigatório" }, { status: 400 });
  }

  const digits = phone.replace(/\D/g, "");
  const suffix = digits.slice(-9);
  if (suffix.length < 8) {
    return NextResponse.json({ found: false });
  }

  const dbUrl = (await getCampaignDbUrl(campaignId)) ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  const collab = await db.collaborator.findFirst({
    where: {
      campaignId,
      phone: { contains: suffix },
    },
    select: { id: true, name: true },
  });

  if (!collab) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    id: collab.id,
    name: collab.name,
  });
}
