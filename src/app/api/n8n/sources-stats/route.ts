import { NextRequest, NextResponse } from "next/server";
import { n8nAuthCheck as authCheck } from "@/lib/api-auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { validateCampaign } from "@/lib/validate-campaign";

/**
 * GET /api/n8n/sources-stats?campaign_id=...
 *
 * Retorna distribuição de leads por `source` e por `status`, com counts.
 * Usado para popular o dropdown "Origem" do módulo de disparo manual.
 *
 * Resposta:
 * {
 *   ok: true,
 *   campaignId,
 *   total,
 *   bySource: [{ source, count }],
 *   byStatus: [{ status, count }],
 * }
 *
 * Autenticação: Authorization: Bearer <N8N_API_KEY>
 */
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id") ?? "andre-santos-2026";

  const validated = await validateCampaign(campaignId);
  if (!validated) {
    return NextResponse.json(
      { error: `Campaign '${campaignId}' não encontrada ou inativa` },
      { status: 404 }
    );
  }
  const dbUrl = validated.dbUrl ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  const [bySource, byStatus, total] = await Promise.all([
    db.collaborator.groupBy({
      by: ["source"],
      where: { campaignId },
      _count: { _all: true },
      orderBy: { _count: { source: "desc" } },
    }),
    db.collaborator.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { _all: true },
    }),
    db.collaborator.count({ where: { campaignId } }),
  ]);

  return NextResponse.json({
    ok: true,
    campaignId,
    total,
    bySource: bySource.map((b) => ({ source: b.source ?? "(sem source)", count: b._count._all })),
    byStatus: byStatus.map((b) => ({ status: b.status, count: b._count._all })),
  });
}
