import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PrismaClient } from "@prisma/client";
import { zapiSendText } from "./zapi";

// Agenda diária formatada para WhatsApp (negrito com *asteriscos*, itálico com _).
// Espelha o digest do Telegram (buildDailyDigestMessage), mas sem HTML.
// Só agenda — nunca leads.

// Nome do grupo de WhatsApp que recebe a agenda (já sincronizado no painel).
// Match por "contém" insensível a maiúsculas → pega "Agenda", "Agendas".
const AGENDA_GROUP_NAME = "Agenda";

// Envia uma mensagem ao grupo "Agendas" via Z-API. Best-effort: nunca lança
// (retorna false em qualquer falha — Z-API não configurada, grupo inexistente etc).
export async function sendToAgendaGroup(db: PrismaClient, cid: string, message: string): Promise<boolean> {
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
    await zapiSendText(cid, group.zapiGroupId, message);
    return true;
  } catch (err) {
    console.error(`[agenda-whatsapp] envio ao grupo falhou (${cid}):`, err);
    return false;
  }
}

const TYPE_EMOJI: Record<string, string> = {
  REUNIAO: "🤝", CULTO: "⛪", PANFLETAGEM: "📋",
  TREINAMENTO: "📚", VISITA: "🚗",
  PODCAST: "🎙️", GRAVACAO: "🎬", OUTRO: "📌",
};

interface EventLike {
  title: string;
  type: string;
  date: string | Date;
  location?: string | null;
  zone?: { name: string } | null;
}

// Vercel roda em UTC; subtrai 3h antes de format() para exibir horário de Brasília.
function toBRT(d: Date | string | number): Date {
  return new Date(new Date(d).getTime() - 3 * 60 * 60 * 1000);
}
function nowBRT(): Date { return toBRT(Date.now()); }

export function buildAgendaWhatsApp(
  todayEvents: EventLike[],
  nextDaysEvents: { date: Date; events: EventLike[] }[],
): string {
  const now     = nowBRT();
  const timeStr = format(now, "HH:mm");

  let msg = `🌅 *Bom dia! Agenda — ${format(now, "dd/MM (EEEE)", { locale: ptBR })}*\n\n`;

  // Hoje
  if (todayEvents.length === 0) {
    msg += `📭 Nenhum evento hoje.`;
  } else {
    msg += todayEvents.map((ev) => {
      const time  = format(toBRT(ev.date), "HH:mm");
      const emoji = TYPE_EMOJI[ev.type] ?? "📌";
      let line    = `${emoji} *${time}* · ${ev.title}`;
      if (ev.location) line += `\n   📍 ${ev.location}`;
      if (ev.zone?.name) line += `\n   🗺️ ${ev.zone.name}`;
      return line;
    }).join("\n\n");
  }

  // Próximos dias
  const diasComEventos = nextDaysEvents.filter((d) => d.events.length > 0);
  if (diasComEventos.length > 0) {
    msg += `\n\n*📆 Próximos dias*`;
    for (const { date, events } of diasComEventos) {
      const dayLabel = format(date, "EEEE, dd/MM", { locale: ptBR });
      msg += `\n\n_${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}_`;
      for (const ev of events) {
        const time  = format(toBRT(ev.date), "HH:mm");
        const emoji = TYPE_EMOJI[ev.type] ?? "📌";
        msg += `\n${emoji} ${time} · ${ev.title}`;
        if (ev.location) msg += ` · 📍 ${ev.location}`;
      }
    }
  }

  msg += `\n\n_Enviado às ${timeStr} (BRT)_`;
  return msg;
}

// Notificação em tempo real quando um evento é criado/editado/removido.
export function buildEventNotificationWhatsApp(
  action: "criado" | "atualizado" | "removido",
  event: EventLike,
): string {
  const emoji   = action === "criado" ? "✅" : action === "atualizado" ? "✏️" : "❌";
  const brtDate = toBRT(event.date);
  const time    = format(brtDate, "HH:mm");
  const dateStr = format(brtDate, "dd/MM", { locale: ptBR });
  const typeEmoji = TYPE_EMOJI[event.type] ?? "📌";

  let text = `${emoji} *Evento ${action}:* ${typeEmoji} ${event.title}`;
  text += `\n🗓️ ${dateStr} às ${time}`;
  if (event.location) text += `\n📍 ${event.location}`;
  if (event.zone?.name) text += `\n🗺️ ${event.zone.name}`;
  return text;
}
