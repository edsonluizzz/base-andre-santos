import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * GET /api/n8n/debug-tenants
 *
 * Lista todas as Campaigns com info crítica de multi-tenancy.
 * Temporário — pra diagnóstico antes de implementar subdomínios.
 *
 * Auth: Bearer N8N_API_KEY
 */
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await db.campaign.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      domain: true,
      candidateName: true,
      active: true,
      dbUrl: true,
      metricoolToken: true,
      telegramBotToken: true,
      zApiInstance: true,
      userCampaigns: {
        select: {
          role: true,
          inviteStatus: true,
          user: { select: { id: true, email: true, name: true, role: true } },
          pendingEmail: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    ok: true,
    total: campaigns.length,
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      domain: c.domain,
      candidateName: c.candidateName,
      active: c.active,
      dbUrlSet: Boolean(c.dbUrl),
      dbUrlHost: c.dbUrl ? new URL(c.dbUrl.replace(/^postgresql:/, "https:")).hostname : null,
      sameAsMainDb: c.dbUrl === null || c.dbUrl === process.env.DATABASE_URL,
      integrations: {
        metricoolSet: Boolean(c.metricoolToken),
        telegramSet: Boolean(c.telegramBotToken),
        zApiSet: Boolean(c.zApiInstance),
      },
      users: c.userCampaigns.map((uc) => ({
        email: uc.user?.email ?? uc.pendingEmail ?? "?",
        name: uc.user?.name ?? "(pending)",
        role: uc.role,
        inviteStatus: uc.inviteStatus,
        globalRole: uc.user?.role,
      })),
    })),
  });
}
