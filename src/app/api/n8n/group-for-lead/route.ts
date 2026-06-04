import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { validateCampaign } from "@/lib/validate-campaign";
import { regionForCity, type PRRegion } from "@/lib/pr-regions";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * GET /api/n8n/group-for-lead?phone=X&campaign_id=Y
 *
 * Resolve qual grupo WhatsApp deve receber este lead com base na sua
 * cidade. Algoritmo:
 *   1. Busca Collaborator pelo phone (sufix 9 → 8 dígitos)
 *   2. Pega .city → regionForCity(city) → PRRegion
 *   3. WhatsAppGroup.findFirst({ campaignId, region })
 *   4. Se nada bate, retorna grupo fallback (isFallback=true)
 *   5. Se nem fallback existe, retorna null
 *
 * Resposta:
 *   { link, region, source: "matched" | "fallback" | "not-found", city }
 *
 * Auth: Bearer N8N_API_KEY
 */
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const phone = (searchParams.get("phone") ?? "").trim();
  const campaignId = searchParams.get("campaign_id") ?? "andre-santos-2026";

  const validated = await validateCampaign(campaignId);
  if (!validated) {
    return NextResponse.json({ error: `Campaign '${campaignId}' não encontrada` }, { status: 404 });
  }

  const dbUrl = validated.dbUrl ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  let city: string | null = null;
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    const sufix9 = digits.slice(-9);
    const sufix8 = digits.slice(-8);
    if (sufix8.length >= 8) {
      let collab = await db.collaborator.findFirst({
        where: { campaignId, phone: { contains: sufix9 } },
        select: { city: true },
      });
      if (!collab) {
        collab = await db.collaborator.findFirst({
          where: { campaignId, phone: { contains: sufix8 } },
          select: { city: true },
        });
      }
      city = collab?.city ?? null;
    }
  }

  const region: PRRegion = regionForCity(city);

  // Tenta achar grupo regional
  let group = null as { id: string; name: string; inviteLink: string | null } | null;
  let source: "matched" | "fallback" | "not-found" = "not-found";

  if (region !== "OUTROS") {
    group = await db.whatsAppGroup.findFirst({
      where: { campaignId, region: region as never, inviteLink: { not: null } },
      select: { id: true, name: true, inviteLink: true },
    });
    if (group) source = "matched";
  }

  // Fallback: grupo geral (isFallback=true)
  if (!group) {
    group = await db.whatsAppGroup.findFirst({
      where: { campaignId, isFallback: true, inviteLink: { not: null } },
      select: { id: true, name: true, inviteLink: true },
    });
    if (group) source = "fallback";
  }

  return NextResponse.json({
    ok: true,
    city,
    region,
    source,
    link: group?.inviteLink ?? null,
    groupName: group?.name ?? null,
  });
}
