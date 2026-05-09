import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  sendTelegram, buildAgendaMessage, buildDailyDigestMessage, isTelegramConfigured,
} from "@/lib/telegram";

const CID = "andre-santos-2026";

function startOfDay(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function endOfDay(d: Date) {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x;
}
function addDaysTo(d: Date, n: number) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
// BRT = UTC-3
function nowBRT() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTelegramConfigured()) {
    return NextResponse.json({ ok: false, reason: "Telegram não configurado" });
  }

  const brt      = nowBRT();
  const utcHour  = new Date().getUTCHours();
  const isFirst  = utcHour === 10; // 7h BRT

  // Eventos de hoje (BRT)
  const todayStart = startOfDay(brt);
  const todayEnd   = endOfDay(brt);
  // Converter para UTC para a query
  const utcTodayStart = new Date(todayStart.getTime() + 3 * 60 * 60 * 1000);
  const utcTodayEnd   = new Date(todayEnd.getTime()   + 3 * 60 * 60 * 1000);

  const todayEvents = await db.event.findMany({
    where: { campaignId: CID, date: { gte: utcTodayStart, lte: utcTodayEnd } },
    include: { zone: { select: { name: true } } },
    orderBy: { date: "asc" },
  });

  if (!isFirst) {
    // Horários de atualização (11h, 15h, 19h BRT) — só envia se houver eventos hoje
    if (todayEvents.length === 0) {
      return NextResponse.json({ ok: true, sent: false, reason: "Sem eventos hoje" });
    }
    await sendTelegram(buildAgendaMessage(todayEvents, true));
    return NextResponse.json({ ok: true, sent: true, events: todayEvents.length });
  }

  // 7h BRT — digest com próximos 3 dias
  const nextDaysEvents: { date: Date; events: typeof todayEvents }[] = [];
  for (let i = 1; i <= 3; i++) {
    const d    = addDaysTo(brt, i);
    const s    = new Date(startOfDay(d).getTime() + 3 * 60 * 60 * 1000);
    const e    = new Date(endOfDay(d).getTime()   + 3 * 60 * 60 * 1000);
    const evs  = await db.event.findMany({
      where: { campaignId: CID, date: { gte: s, lte: e } },
      include: { zone: { select: { name: true } } },
      orderBy: { date: "asc" },
    });
    nextDaysEvents.push({ date: d, events: evs });
  }

  await sendTelegram(buildDailyDigestMessage(todayEvents, nextDaysEvents));
  return NextResponse.json({ ok: true, sent: true, events: todayEvents.length });
}
