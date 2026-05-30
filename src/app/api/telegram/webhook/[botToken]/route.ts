/**
 * Webhook Telegram tenant-aware.
 * URL: /api/telegram/webhook/<BOT_TOKEN>
 * O bot token na URL identifica a campanha via Campaign.telegramBotToken.
 * Cada campanha deve registrar seu próprio webhook nessa URL no BotFather.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleTelegramUpdate, type TelegramUpdateBody } from "@/lib/telegram-handler";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCampaignDbUrl } from "@/lib/meta-db";

export async function POST(req: NextRequest, { params }: { params: { botToken: string } }) {
  try {
    const botToken = params.botToken;
    if (!botToken) return NextResponse.json({ ok: false }, { status: 400 });

    // Identifica a campanha pelo bot token (constante em URL → match exato)
    const campaign = await db.campaign.findFirst({
      where: { telegramBotToken: botToken, active: true },
      select: { id: true, name: true, dbUrl: true },
    });

    if (!campaign) {
      // Não vaza informação se token é inválido — apenas 404
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const body = await req.json() as TelegramUpdateBody;
    const dbUrl = campaign.dbUrl ?? (await getCampaignDbUrl(campaign.id)) ?? process.env.DATABASE_URL;
    const { db: tenantDb } = getCampaignContext({ user: { campaignId: campaign.id, dbUrl: dbUrl ?? undefined } });

    await handleTelegramUpdate(body, {
      db: tenantDb,
      cid: campaign.id,
      campaignDisplayName: campaign.name,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram/webhook/[botToken]]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
