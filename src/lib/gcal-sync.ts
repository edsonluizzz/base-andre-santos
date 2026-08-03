import type { PrismaClient } from "@prisma/client";
import type { calendar_v3 } from "googleapis";

const GCAL_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

export interface GcalSyncResult {
  pushed: number;        // eventos nossos novos criados no Google
  pushedUpdates: number;  // eventos nossos existentes atualizados no Google
  pulled: number;        // eventos do Google novos criados aqui
  pulledUpdates: number;  // eventos do Google existentes atualizados aqui
}

/**
 * Sync bidirecional Event <-> Google Calendar para uma campanha.
 *
 * Antes só criava (nunca atualizava): um evento editado no Google, ou editado
 * aqui, depois de já vinculado (googleCalendarEventId setado), nunca refletia
 * do outro lado — só a criação inicial funcionava. Corrigido comparando
 * `updatedAt` (nosso) com `updated` (do Google) pra decidir quem está mais
 * novo antes de sobrescrever.
 *
 * Busca a lista do Google UMA vez e usa pro push e pro pull na mesma leitura
 * — evita ping-pong (empurrar de volta algo que acabou de ser puxado, e
 * vice-versa): ao aplicar uma atualização, o timestamp local é setado pro
 * `updated` retornado pelo Google (não pro "agora" do @updatedAt automático),
 * então a próxima rodada de sync já vê os dois lados como equivalentes.
 */
export async function syncGoogleCalendar(
  db: PrismaClient,
  calendar: calendar_v3.Calendar,
  campaignId: string,
): Promise<GcalSyncResult> {
  const result: GcalSyncResult = { pushed: 0, pushedUpdates: 0, pulled: 0, pulledUpdates: 0 };

  const gcalList = await calendar.events.list({
    calendarId: GCAL_ID,
    timeMin: new Date().toISOString(),
    maxResults: 100,
    singleEvents: true,
    orderBy: "startTime",
  });
  const gcalById = new Map<string, calendar_v3.Schema$Event>();
  for (const ev of gcalList.data.items ?? []) {
    if (ev.id) gcalById.set(ev.id, ev);
  }

  // ─── Push: nossos eventos futuros → Google ────────────────────────────
  const ourEvents = await db.event.findMany({
    where: { campaignId, date: { gte: new Date() } },
  });

  for (const ev of ourEvents) {
    const endDate = new Date(ev.date.getTime() + 60 * 60 * 1000); // +1h
    const requestBody: calendar_v3.Schema$Event = {
      summary: ev.title,
      description: ev.notes ?? undefined,
      location: ev.location ?? undefined,
      start: { dateTime: ev.date.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
    };

    try {
      if (!ev.googleCalendarEventId) {
        const created = await calendar.events.insert({ calendarId: GCAL_ID, requestBody });
        await db.event.update({
          where: { id: ev.id },
          data: {
            googleCalendarEventId: created.data.id ?? null,
            updatedAt: created.data.updated ? new Date(created.data.updated) : undefined,
          },
        });
        result.pushed++;
        continue;
      }

      const gcEv = gcalById.get(ev.googleCalendarEventId);
      if (!gcEv) continue; // apagado no Google ou fora da janela — não recria

      const gcUpdated = gcEv.updated ? new Date(gcEv.updated) : new Date(0);
      if (ev.updatedAt > gcUpdated) {
        const patched = await calendar.events.patch({
          calendarId: GCAL_ID,
          eventId: ev.googleCalendarEventId,
          requestBody,
        });
        await db.event.update({
          where: { id: ev.id },
          data: { updatedAt: patched.data.updated ? new Date(patched.data.updated) : undefined },
        });
        result.pushedUpdates++;
      }
    } catch (err) {
      console.error(`[gcal-sync] falha ao empurrar evento ${ev.id}:`, err);
    }
  }

  // ─── Pull: eventos do Google futuros → nós ────────────────────────────
  for (const gcEv of gcalById.values()) {
    if (!gcEv.id || !gcEv.start?.dateTime) continue; // ignora eventos de dia inteiro (sem horário)

    const local = await db.event.findFirst({ where: { campaignId, googleCalendarEventId: gcEv.id } });
    const gcUpdated = gcEv.updated ? new Date(gcEv.updated) : new Date();

    if (!local) {
      await db.event.create({
        data: {
          campaignId,
          title: gcEv.summary ?? "Evento do Google Calendar",
          date: new Date(gcEv.start.dateTime),
          location: gcEv.location ?? null,
          notes: gcEv.description ?? null,
          type: "OUTRO",
          googleCalendarEventId: gcEv.id,
          updatedAt: gcUpdated,
        },
      });
      result.pulled++;
      continue;
    }

    if (gcUpdated > local.updatedAt) {
      await db.event.update({
        where: { id: local.id },
        data: {
          title: gcEv.summary ?? local.title,
          date: new Date(gcEv.start.dateTime),
          location: gcEv.location ?? null,
          notes: gcEv.description ?? null,
          updatedAt: gcUpdated,
        },
      });
      result.pulledUpdates++;
    }
  }

  return result;
}
