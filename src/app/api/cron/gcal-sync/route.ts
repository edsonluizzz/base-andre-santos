import { NextRequest, NextResponse } from "next/server";
import { db as globalDb } from "@/lib/db";
import { getCalendarClient } from "@/lib/google-calendar";
import { getCampaignContext } from "@/lib/campaign-context";
import { decrypt } from "@/lib/crypto";

const GCAL_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

// Itera todas as campanhas ativas. Apenas processa as que têm Google Calendar conectado.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const campaigns = await globalDb.campaign.findMany({
      where: { active: true },
      select: { id: true, dbUrl: true },
    });

    const summary: Array<{ campaignId: string; pushed: number; pulled: number; skipped?: string }> = [];

    for (const camp of campaigns) {
      try {
        const { db } = getCampaignContext({ user: { campaignId: camp.id, dbUrl: camp.dbUrl ?? undefined } });

        const settings = await db.settings.findUnique({ where: { id: "singleton" }, select: { googleRefreshToken: true } });
        const refreshToken = decrypt(settings?.googleRefreshToken ?? null);
        if (!refreshToken) {
          summary.push({ campaignId: camp.id, pushed: 0, pulled: 0, skipped: "no-token" });
          continue;
        }

        const calendar = await getCalendarClient(refreshToken);
        let pushed = 0;
        let pulled = 0;

        // Push: nossos eventos futuros sem googleCalendarEventId → criar no Google
        const ourEvents = await db.event.findMany({
          where: { campaignId: camp.id, googleCalendarEventId: null, date: { gte: new Date() } },
        });

        for (const ev of ourEvents) {
          try {
            const endDate = new Date(ev.date.getTime() + 60 * 60 * 1000);
            const gcalEvent = await calendar.events.insert({
              calendarId: GCAL_ID,
              requestBody: {
                summary: ev.title,
                description: ev.notes ?? undefined,
                location: ev.location ?? undefined,
                start: { dateTime: ev.date.toISOString(), timeZone: "America/Sao_Paulo" },
                end:   { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
              },
            });
            await db.event.update({ where: { id: ev.id }, data: { googleCalendarEventId: gcalEvent.data.id ?? null } });
            pushed++;
          } catch { /* ignora falhas individuais */ }
        }

        // Pull: eventos novos do Google não existentes no banco
        const gcalList = await calendar.events.list({
          calendarId: GCAL_ID,
          timeMin: new Date().toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: "startTime",
        });

        for (const gcEv of gcalList.data.items ?? []) {
          if (!gcEv.id || !gcEv.start?.dateTime) continue;
          const exists = await db.event.findFirst({ where: { campaignId: camp.id, googleCalendarEventId: gcEv.id } });
          if (!exists) {
            await db.event.create({
              data: {
                campaignId: camp.id,
                title:    gcEv.summary ?? "Evento do Google Calendar",
                date:     new Date(gcEv.start.dateTime),
                location: gcEv.location ?? null,
                notes:    gcEv.description ?? null,
                type:     "OUTRO",
                googleCalendarEventId: gcEv.id,
              },
            });
            pulled++;
          }
        }

        summary.push({ campaignId: camp.id, pushed, pulled });
      } catch (err) {
        console.error(`[gcal-sync] erro na campanha ${camp.id}:`, err);
        summary.push({ campaignId: camp.id, pushed: 0, pulled: 0, skipped: "error" });
      }
    }

    console.log(`[cron/gcal-sync] campanhas=${summary.length}`, summary);
    return NextResponse.json({ ok: true, campaigns: summary });
  } catch (err) {
    console.error("[cron/gcal-sync]", err);
    return NextResponse.json({ error: "Erro ao sincronizar" }, { status: 500 });
  }
}
