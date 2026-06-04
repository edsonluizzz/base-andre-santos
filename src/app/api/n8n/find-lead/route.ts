import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { validateCampaign } from "@/lib/validate-campaign";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * GET /api/n8n/find-lead?city=foz&campaign_id=...
 *
 * Busca leads (status=LEAD, com phone) cuja cidade contém o termo.
 * Auth: Bearer N8N_API_KEY.
 */
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const city = (searchParams.get("city") ?? "").trim();
  const campaignId = searchParams.get("campaign_id") ?? "andre-santos-2026";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50);
  if (!city) return NextResponse.json({ error: "city obrigatório" }, { status: 400 });

  const validated = await validateCampaign(campaignId);
  if (!validated) return NextResponse.json({ error: "Campaign não encontrada" }, { status: 404 });
  const dbUrl = validated.dbUrl ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  const leads = await db.collaborator.findMany({
    where: {
      campaignId,
      city: { contains: city, mode: "insensitive" },
      phone: { not: null },
    },
    select: {
      id: true, name: true, phone: true, city: true, source: true,
      status: true, supportStatus: true, lastContactedAt: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ ok: true, count: leads.length, leads });
}
