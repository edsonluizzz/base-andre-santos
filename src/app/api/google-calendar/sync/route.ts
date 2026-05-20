import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCalendarClient } from "@/lib/google-calendar";

const GCAL_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const settings = await db.settings.findUnique({ where: { id: "singleton" }, select: { googleRefreshToken: true } });
    if (!settings?.googleRefreshToken) {
      return NextResponse.json({ error: "Google Calendar não conectado" }, { status: 400 });
    }

    const calendar = await getCalendarClient(settings.googleRefreshToken);
    let pushed = 0;
    let pulled = 0;

    // Push: nossos eventos sem googleCalendarEventId → criar no Google
    const ourEvents = await db.event.findMany({
      where: { campaignId: CID, googleCalendarEventId: null, date: { gte: new Date() } },
    });

    for (const ev of ourEvents) {
      try {
        const endDate = new Date(ev.date.getTime() + 60 * 60 * 1000); // +1h
        const gcalEvent = await calendar.events.insert({
          calendarId: GCAL_ID,
          requestBody: {
            summary: ev.title,
            description: ev.notes ?? undefined,
            location: ev.location ?? undefined,
            start: { dateTime: ev.date.toISOString(), timeZone: "America/Sao_Paulo" },
            end: { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
          },
        });
        await db.event.update({ where: { id: ev.id }, data: { googleCalendarEventId: gcalEvent.data.id ?? null } });
        pushed++;
      } catch { /* ignora eventos com erro */ }
    }

    // Pull: eventos do Google não existentes no nosso banco
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
            title: gcEv.summary ?? "Evento do Google Calendar",
            date: new Date(gcEv.start.dateTime),
            location: gcEv.location ?? null,
            notes: gcEv.description ?? null,
            type: "OUTRO",
            googleCalendarEventId: gcEv.id,
          },
        });
        pulled++;
      }
    }

    return NextResponse.json({ ok: true, pushed, pulled });
  } catch (err) {
    console.error("[gcal/sync]", err);
    return NextResponse.json({ error: "Erro ao sincronizar" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await db.settings.update({ where: { id: "singleton" }, data: { googleRefreshToken: null } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[gcal/sync DELETE]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
