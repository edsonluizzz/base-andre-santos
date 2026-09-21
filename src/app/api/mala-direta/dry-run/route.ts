import { NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { loadRecipients } from "@/lib/mala-direta/recipients";

export async function GET() {
  try {
    const gate = await requireFinanceAdmin();
    if (!gate.ok) return gate.response;
    const { db, cid } = gate;
    const { stats } = await loadRecipients(db, cid);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sentLast24h = await db.emailCampaignSend.count({
      where: { campaignId: cid, status: "SENT", sentAt: { gte: since } },
    });
    return NextResponse.json({
      stats, sentLast24h, dailyLimit: Number(process.env.MALA_DIRETA_DAILY_LIMIT ?? "100"),
    });
  } catch (err) {
    console.error("[mala-direta dry-run] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
