import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { validateCampaign } from "@/lib/validate-campaign";
import { triggerLeadWebhook } from "@/lib/n8n";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * POST /api/n8n/trigger-lead?campaign_id=...&lead_id=...
 *
 * Aciona manualmente o WF3 (lead-novo-imediato) para um lead já cadastrado.
 * Útil para testes end-to-end do fluxo regional sem precisar de novo cadastro.
 *
 * Bypassa daily limit? NÃO — respeita LEAD_DAILY_LIMIT igual à origem normal.
 * Auth: Bearer N8N_API_KEY.
 */
export async function POST(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id") ?? "andre-santos-2026";
  const leadId = searchParams.get("lead_id");
  if (!leadId) return NextResponse.json({ error: "lead_id obrigatório" }, { status: 400 });

  const validated = await validateCampaign(campaignId);
  if (!validated) return NextResponse.json({ error: "Campaign não encontrada" }, { status: 404 });
  const dbUrl = validated.dbUrl ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  const lead = await db.collaborator.findFirst({
    where: { id: leadId, campaignId },
    select: { id: true, name: true, phone: true, city: true, source: true, status: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  if (!lead.phone) return NextResponse.json({ error: "Lead sem phone" }, { status: 400 });

  await triggerLeadWebhook({
    collaboratorId: lead.id,
    name: lead.name,
    phone: lead.phone,
    campaignId,
    city: lead.city,
    source: `MANUAL_TRIGGER:${lead.source ?? "unknown"}`,
  });

  return NextResponse.json({
    ok: true,
    message: "Webhook lead-novo disparado (fire-and-forget)",
    lead: { id: lead.id, name: lead.name, phone: lead.phone, city: lead.city, status: lead.status },
  });
}
