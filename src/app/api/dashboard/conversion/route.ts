import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

/**
 * GET /api/dashboard/conversion?period=7|30|90
 *
 * Funil de conversão a partir do ContactLog:
 *   - sent          = SENT_INVITE + SENT_REACTIVATION
 *   - converted     = CONVERT
 *   - optedOut      = OPT_OUT
 *   - noResponse    = sent - converted - optedOut (estimativa simples)
 *   - conversionRate = converted / sent
 *
 * Compara com o período anterior de mesma duração.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { db, cid: campaignId } = getCampaignContext(session);

    const period = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get("period") ?? "7")));
    const now = new Date();
    const start = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);
    const prevStart = new Date(start.getTime() - period * 24 * 60 * 60 * 1000);

    const [currLogs, prevLogs] = await Promise.all([
      db.contactLog.groupBy({
        by: ["kind"],
        where: { campaignId, createdAt: { gte: start } },
        _count: { id: true },
      }),
      db.contactLog.groupBy({
        by: ["kind"],
        where: { campaignId, createdAt: { gte: prevStart, lt: start } },
        _count: { id: true },
      }),
    ]);

    function summarize(rows: { kind: string; _count: { id: number } }[]) {
      const map = Object.fromEntries(rows.map((r) => [r.kind, r._count.id])) as Record<string, number>;
      const sent = (map.SENT_INVITE ?? 0) + (map.SENT_REACTIVATION ?? 0);
      const converted = map.CONVERT ?? 0;
      const optedOut = map.OPT_OUT ?? 0;
      const noResponse = Math.max(0, sent - converted - optedOut);
      const conversionRate = sent > 0 ? +(converted / sent * 100).toFixed(1) : 0;
      return { sent, converted, optedOut, noResponse, conversionRate };
    }

    const curr = summarize(currLogs);
    const prev = summarize(prevLogs);

    return NextResponse.json({
      period,
      curr,
      prev,
      delta: {
        sent: curr.sent - prev.sent,
        converted: curr.converted - prev.converted,
        conversionRate: +(curr.conversionRate - prev.conversionRate).toFixed(1),
      },
    });
  } catch (err) {
    console.error("[dashboard/conversion]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
