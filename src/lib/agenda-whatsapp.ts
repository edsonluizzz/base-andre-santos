import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Agenda diária formatada para WhatsApp (negrito com *asteriscos*, itálico com _).
// Espelha o digest do Telegram (buildDailyDigestMessage), mas sem HTML.
// Só agenda — nunca leads.

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
