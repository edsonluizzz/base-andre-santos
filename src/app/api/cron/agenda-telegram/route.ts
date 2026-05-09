import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTelegram, buildAgendaMessage, isTelegramConfigured } from "@/lib/telegram";

const CID = "andre-santos-2026";

export async function GET(req: NextRequest) {
  // Vercel assina chamadas de cron com Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json({ ok: false, reason: "Telegram não configurado" });
  }

  // Hoje em BRT (UTC-3)
  const now   = new Date();
  const brt   = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const start = new Date(brt); start.setUTCHours(0, 0, 0, 0);
  const end   = new Date(brt); end.setUTCHours(23, 59, 59, 999);
  // Converter de volta para UTC para a query
  const utcStart = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const utcEnd   = new Date(end.getTime()   + 3 * 60 * 60 * 1000);

  const events = await db.event.findMany({
    where: { campaignId: CID, date: { gte: utcStart, lte: utcEnd } },
    include: { zone: { select: { name: true } } },
    orderBy: { date: "asc" },
  });

  // Primeira chamada do dia (7h BRT = 10h UTC) → sempre envia
  // Demais (11h, 15h, 19h BRT) → só envia se houver eventos
  const utcHour  = now.getUTCHours();
  const isFirst  = utcHour === 10;
  if (!isFirst && events.length === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: "Sem eventos hoje" });
  }

  const message = buildAgendaMessage(events, !isFirst);
  await sendTelegram(message);

  return NextResponse.json({ ok: true, sent: true, events: events.length });
}
