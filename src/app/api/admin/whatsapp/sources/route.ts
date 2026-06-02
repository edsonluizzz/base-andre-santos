import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

/**
 * GET /api/admin/whatsapp/sources
 *
 * Lista origens (source) distintas da base + counts por status, para
 * popular o dropdown "Origem" do form de disparo manual.
 *
 * Admin/Leader only.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { db, cid: CID } = getCampaignContext(session);

  const groups = await db.collaborator.groupBy({
    by: ["source", "status"],
    where: { campaignId: CID, phone: { not: null } },
    _count: { _all: true },
  });

  const bySource = new Map<string, { total: number; lead: number; active: number; inactive: number }>();
  for (const g of groups) {
    const src = g.source ?? "(sem origem)";
    const entry = bySource.get(src) ?? { total: 0, lead: 0, active: 0, inactive: 0 };
    entry.total += g._count._all;
    if (g.status === "LEAD") entry.lead += g._count._all;
    else if (g.status === "ACTIVE") entry.active += g._count._all;
    else if (g.status === "INACTIVE") entry.inactive += g._count._all;
    bySource.set(src, entry);
  }

  const sources = Array.from(bySource.entries())
    .map(([source, stats]) => ({ source, ...stats }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = sources.reduce((s, x) => s + x.total, 0);

  return NextResponse.json({
    ok: true,
    sources,
    grandTotal,
  });
}
