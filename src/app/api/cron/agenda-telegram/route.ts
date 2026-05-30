import { NextRequest, NextResponse } from "next/server";
import { db as globalDb } from "@/lib/db";
import { sendTelegram, buildAgendaMessage, buildDailyDigestMessage, isTelegramConfigured } from "@/lib/telegram";
import { getCampaignContext } from "@/lib/campaign-context";

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

// Itera todas as campanhas ativas que tenham Telegram configurado.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brt      = nowBRT();
  const utcHour  = new Date().getUTCHours();
  const isFirst  = utcHour === 10; // 7h BRT

  const todayStart = startOfDay(brt);
  const todayEnd   = endOfDay(brt);
  const utcTodayStart = new Date(todayStart.getTime() + 3 * 60 * 60 * 1000);
  const utcTodayEnd   = new Date(todayEnd.getTime()   + 3 * 60 * 60 * 1000);

  const campaigns = await globalDb.campaign.findMany({
    where: { active: true },
    select: { id: true, dbUrl: true },
  });

  const summary: Array<{ campaignId: string; sent: boolean; events: number; reason?: string }> = [];

  for (const camp of campaigns) {
    try {
      if (!(await isTelegramConfigured(camp.id))) {
        summary.push({ campaignId: camp.id, sent: false, events: 0, reason: "telegram-not-configured" });
        continue;
      }

      const { db } = getCampaignContext({ user: { campaignId: camp.id, dbUrl: camp.dbUrl ?? undefined } });

      const todayEvents = await db.event.findMany({
        where: { campaignId: camp.id, date: { gte: utcTodayStart, lte: utcTodayEnd } },
        include: { zone: { select: { name: true } } },
        orderBy: { date: "asc" },
      });

      if (!isFirst) {
        if (todayEvents.length === 0) {
          summary.push({ campaignId: camp.id, sent: false, events: 0, reason: "no-events" });
          continue;
        }
        await sendTelegram(camp.id, buildAgendaMessage(todayEvents, true));
        summary.push({ campaignId: camp.id, sent: true, events: todayEvents.length });
        continue;
      }

      // 7h BRT — digest com próximos 3 dias
      const nextDaysEvents: { date: Date; events: typeof todayEvents }[] = [];
      for (let i = 1; i <= 3; i++) {
        const d    = addDaysTo(brt, i);
        const s    = new Date(startOfDay(d).getTime() + 3 * 60 * 60 * 1000);
        const e    = new Date(endOfDay(d).getTime()   + 3 * 60 * 60 * 1000);
        const evs  = await db.event.findMany({
          where: { campaignId: camp.id, date: { gte: s, lte: e } },
          include: { zone: { select: { name: true } } },
          orderBy: { date: "asc" },
        });
        nextDaysEvents.push({ date: d, events: evs });
      }

      await sendTelegram(camp.id, buildDailyDigestMessage(todayEvents, nextDaysEvents));
      summary.push({ campaignId: camp.id, sent: true, events: todayEvents.length });
    } catch (err) {
      console.error(`[agenda-telegram] erro na campanha ${camp.id}:`, err);
      summary.push({ campaignId: camp.id, sent: false, events: 0, reason: "error" });
    }
  }

  return NextResponse.json({ ok: true, campaigns: summary });
}
