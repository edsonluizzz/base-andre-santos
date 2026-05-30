/**
 * Webhook Telegram — LEGACY (campanha andre-santos-2026).
 * Para outras campanhas, use /api/telegram/webhook/[botToken].
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleTelegramUpdate, type TelegramUpdateBody } from "@/lib/telegram-handler";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCampaignDbUrl } from "@/lib/meta-db";

const LEGACY_CID = "andre-santos-2026";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as TelegramUpdateBody;
    const dbUrl = (await getCampaignDbUrl(LEGACY_CID)) ?? process.env.DATABASE_URL;
    const { db: tenantDb } = getCampaignContext({ user: { campaignId: LEGACY_CID, dbUrl: dbUrl ?? undefined } });

    const campaign = await db.campaign.findUnique({
      where: { id: LEGACY_CID },
      select: { name: true },
    });

    await handleTelegramUpdate(body, {
      db: tenantDb,
      cid: LEGACY_CID,
      campaignDisplayName: campaign?.name,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram/webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
