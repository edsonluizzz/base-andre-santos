import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { createPrismaSendStore } from "@/lib/mala-direta/prisma-store";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gate = await requireFinanceAdmin();
    if (!gate.ok) return gate.response;
    const campaign = await gate.db.emailCampaign.findFirst({
      where: { id: params.id, campaignId: gate.cid },
    });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const store = createPrismaSendStore(gate.db, gate.cid, campaign.id);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return NextResponse.json({
      campaign,
      stats: await store.stats(),
      sentLast24h: await store.countSentSince(since),
      dailyLimit: Number(process.env.MALA_DIRETA_DAILY_LIMIT ?? "100"),
    });
  } catch (err) {
    console.error("[mala-direta campaign GET] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
