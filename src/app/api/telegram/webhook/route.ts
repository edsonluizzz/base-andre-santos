/**
 * Webhook Telegram — LEGACY (campanha andre-santos-2026).
 * Para outras campanhas, use /api/telegram/webhook/[botToken].
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleTelegramUpdate, type TelegramUpdateBody } from "@/lib/telegram-handler";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCampaignDbUrl } from "@/lib/meta-db";
import { safeEqual } from "@/lib/api-auth";

const LEGACY_CID = "andre-santos-2026";

// Valida o secret_token que o Telegram ecoa em todo update (configurado via
// setWebhook em /api/telegram/register-webhook). Sem TELEGRAM_WEBHOOK_SECRET
// configurado, rejeita tudo (fail-closed) — antes esta rota não tinha
// nenhuma autenticação (achado de auditoria 2026-07-30).
function isValidTelegramSecret(req: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const provided = req.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || !provided) return false;
  return safeEqual(provided, expected);
}

export async function POST(req: NextRequest) {
  try {
    if (!isValidTelegramSecret(req)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
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
