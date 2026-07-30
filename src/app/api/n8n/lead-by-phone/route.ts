import { NextRequest, NextResponse } from "next/server";
import { n8nAuthCheck as authCheck } from "@/lib/api-auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { validateCampaign } from "@/lib/validate-campaign";

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

  // Z-API às vezes manda celular sem o 9 (12 dígitos: 55+DDD+8); o banco pode
  // ter salvo com (13 dígitos: 55+DDD+9). Tenta 9 dígitos, fallback 8.
  const digits = phone.replace(/\D/g, "");
  const sufix9 = digits.slice(-9);
  const sufix8 = digits.slice(-8);
  if (sufix8.length < 8) {
    return NextResponse.json({ found: false });
  }

  // Valida tenant (evita vazamento cross-tenant via fallback DATABASE_URL)
  const validated = await validateCampaign(campaignId);
  if (!validated) {
    return NextResponse.json({ found: false });
  }
  const dbUrl = validated.dbUrl ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  let collab = await db.collaborator.findFirst({
    where: { campaignId, phone: { contains: sufix9 } },
    select: { id: true, name: true },
  });
  if (!collab) {
    collab = await db.collaborator.findFirst({
      where: { campaignId, phone: { contains: sufix8 } },
      select: { id: true, name: true },
    });
  }

  if (!collab) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    id: collab.id,
    name: collab.name,
  });
}
