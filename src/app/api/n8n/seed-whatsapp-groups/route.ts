import { NextRequest, NextResponse } from "next/server";
import { n8nAuthCheck as authCheck } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getCampaignContext } from "@/lib/campaign-context";
import { validateCampaign } from "@/lib/validate-campaign";

/**
 * POST /api/n8n/seed-whatsapp-groups?campaign_id=andre-santos-2026
 *
 * One-shot: cria/atualiza os grupos WhatsApp regionais do André conforme
 * informado em 2026-06-04. Idempotente (upsert por inviteLink).
 *
 * Grupos:
 *  - OESTE       → D2iMZBsvJiY0A6j2mn16lp
 *  - LITORAL     → LTmMZkSolRd7FDZ9HNcSmi
 *  - SUDOESTE    → GlTGLwDCUcuDnpluzuqts5
 *  - GERAL       → GbrqkfHopOEDlgx0Rt0mCp (isFallback=true)
 *
 * Auth: Bearer N8N_API_KEY.
 */
export async function POST(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id") ?? "andre-santos-2026";
  const validated = await validateCampaign(campaignId);
  if (!validated) {
    return NextResponse.json({ error: `Campaign '${campaignId}' não encontrada` }, { status: 404 });
  }
  const dbUrl = validated.dbUrl ?? process.env.DATABASE_URL;
  const { db: tenantDb } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  const GROUPS: Array<{ name: string; link: string; region: string | null; isFallback: boolean }> = [
    { name: "Improváveis Oeste",     link: "https://chat.whatsapp.com/D2iMZBsvJiY0A6j2mn16lp", region: "OESTE",    isFallback: false },
    { name: "Improváveis Litoral",   link: "https://chat.whatsapp.com/LTmMZkSolRd7FDZ9HNcSmi", region: "LITORAL",  isFallback: false },
    { name: "Improváveis Sudoeste",  link: "https://chat.whatsapp.com/GlTGLwDCUcuDnpluzuqts5", region: "SUDOESTE", isFallback: false },
    { name: "Improváveis Geral",     link: "https://chat.whatsapp.com/GbrqkfHopOEDlgx0Rt0mCp", region: null,       isFallback: true  },
  ];

  // Se houver outros grupos marcados como fallback, desmarca antes (só 1 deve ter)
  await tenantDb.whatsAppGroup.updateMany({
    where: { campaignId, isFallback: true },
    data: { isFallback: false },
  });

  const results: Array<{ name: string; action: "created" | "updated"; id: string }> = [];
  for (const g of GROUPS) {
    const existing = await tenantDb.whatsAppGroup.findFirst({
      where: { campaignId, inviteLink: g.link },
      select: { id: true },
    });
    if (existing) {
      await tenantDb.whatsAppGroup.update({
        where: { id: existing.id },
        data: {
          name: g.name,
          region: g.region as never,
          isFallback: g.isFallback,
        },
      });
      results.push({ name: g.name, action: "updated", id: existing.id });
    } else {
      const created = await tenantDb.whatsAppGroup.create({
        data: {
          campaignId,
          name: g.name,
          inviteLink: g.link,
          region: g.region as never,
          isFallback: g.isFallback,
        },
      });
      results.push({ name: g.name, action: "created", id: created.id });
    }
  }

  return NextResponse.json({ ok: true, campaignId, results });
  void db; // unused, kept for IDE happiness
}
