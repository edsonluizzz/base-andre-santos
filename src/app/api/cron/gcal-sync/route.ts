import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCalendarClient } from "@/lib/google-calendar";

const CID = "andre-santos-2026";
const GCAL_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await db.settings.findUnique({ where: { id: "singleton" }, select: { googleRefreshToken: true } });
    if (!settings?.googleRefreshToken) {
      return NextResponse.json({ ok: false, reason: "Google Calendar não conectado" });
    }

    const calendar = await getCalendarClient(settings.googleRefreshToken);
    let pushed = 0;
    let pulled = 0;

    // Push: nossos eventos futuros sem googleCalendarEventId → criar no Google
    const ourEvents = await db.event.findMany({
      where: { campaignId: CID, googleCalendarEventId: null, date: { gte: new Date() } },
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
      const exists = await db.event.findFirst({ where: { campaignId: CID, googleCalendarEventId: gcEv.id } });
      if (!exists) {
        await db.event.create({
          data: {
            campaignId: CID,
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

    console.log(`[cron/gcal-sync] pushed=${pushed} pulled=${pulled}`);
    return NextResponse.json({ ok: true, pushed, pulled });
  } catch (err) {
    console.error("[cron/gcal-sync]", err);
    return NextResponse.json({ error: "Erro ao sincronizar" }, { status: 500 });
  }
}
