import { NextRequest, NextResponse } from "next/server";
import { db as globalDb } from "@/lib/db";
import { sendTelegram, buildAgendaMessage, buildDailyDigestMessage, isTelegramConfigured } from "@/lib/telegram";
import { getCampaignContext } from "@/lib/campaign-context";
import { buildAgendaWhatsApp } from "@/lib/agenda-whatsapp";
import { zapiSendText } from "@/lib/zapi";

// Nome do grupo de WhatsApp que recebe a agenda diária (já sincronizado no painel).
const AGENDA_GROUP_NAME = "Agenda";

// Envia a agenda diária para o grupo de WhatsApp "Agendas", se existir e a Z-API
// estiver configurada. Best-effort: nunca derruba o envio do Telegram. Só agenda.
async function sendAgendaToWhatsApp(
  db: ReturnType<typeof getCampaignContext>["db"],
  cid: string,
  today: Parameters<typeof buildAgendaWhatsApp>[0],
  nextDays: Parameters<typeof buildAgendaWhatsApp>[1],
): Promise<boolean> {
  try {
    const group = await db.whatsAppGroup.findFirst({
      where: {
        campaignId: cid,
        name: { contains: AGENDA_GROUP_NAME, mode: "insensitive" },
        zapiGroupId: { not: null },
      },
      select: { zapiGroupId: true },
    });
    if (!group?.zapiGroupId) return false;
    await zapiSendText(cid, group.zapiGroupId, buildAgendaWhatsApp(today, nextDays));
    return true;
  } catch (err) {
    console.error(`[agenda-telegram] WhatsApp falhou (${cid}):`, err);
    return false;
  }
}

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
      const { db } = getCampaignContext({ user: { campaignId: camp.id, dbUrl: camp.dbUrl ?? undefined } });

      const todayEvents = await db.event.findMany({
        where: { campaignId: camp.id, date: { gte: utcTodayStart, lte: utcTodayEnd } },
        include: { zone: { select: { name: true } } },
        orderBy: { date: "asc" },
      });

      // Próximos 3 dias (para o digest da manhã, Telegram e WhatsApp).
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

      // Telegram — só se configurado.
      const telegramOn = await isTelegramConfigured(camp.id);
      if (telegramOn) {
        if (isFirst) {
          await sendTelegram(camp.id, buildDailyDigestMessage(todayEvents, nextDaysEvents));
        } else if (todayEvents.length > 0) {
          await sendTelegram(camp.id, buildAgendaMessage(todayEvents, true));
        }
      }

      // WhatsApp — grupo "Agendas", independente do Telegram. Só no digest da manhã.
      const waSent = isFirst
        ? await sendAgendaToWhatsApp(db, camp.id, todayEvents, nextDaysEvents)
        : false;

      summary.push({
        campaignId: camp.id,
        sent: telegramOn || waSent,
        events: todayEvents.length,
        reason: !telegramOn && !waSent ? "no-channel" : undefined,
      });
    } catch (err) {
      console.error(`[agenda-telegram] erro na campanha ${camp.id}:`, err);
      summary.push({ campaignId: camp.id, sent: false, events: 0, reason: "error" });
    }
  }

  return NextResponse.json({ ok: true, campaigns: summary });
}
