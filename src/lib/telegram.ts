import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID   ?? "";

export function isTelegramConfigured() {
  return Boolean(BOT_TOKEN && CHAT_ID);
}

export async function sendTelegram(text: string): Promise<void> {
  if (!isTelegramConfigured()) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error("[telegram] erro ao enviar mensagem:", err);
  }
}

// ─── Formatadores ─────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  REUNIAO: "🤝", CULTO: "⛪", PANFLETAGEM: "📋",
  TREINAMENTO: "📚", VISITA: "🚗", OUTRO: "📌",
};

interface EventLike {
  title: string;
  type: string;
  date: string | Date;
  location?: string | null;
  zone?: { name: string } | null;
}

export function buildAgendaMessage(events: EventLike[], isUpdate = false): string {
  const now     = new Date();
  const dateStr = format(now, "dd/MM (EEEE)", { locale: ptBR });
  const timeStr = format(now, "HH:mm");

  const header = isUpdate
    ? `🔔 <b>Agenda atualizada — ${dateStr}</b>`
    : `📅 <b>Agenda de hoje — ${dateStr}</b>`;

  if (events.length === 0) {
    return `${header}\n\nNenhum evento agendado para hoje.\n\n<i>Enviado às ${timeStr}</i>`;
  }

  const lines = events.map((ev) => {
    const time  = format(new Date(ev.date), "HH:mm");
    const emoji = TYPE_EMOJI[ev.type] ?? "📌";
    let line    = `${emoji} <b>${time}</b> · ${ev.title}`;
    if (ev.location) line += `\n📍 ${ev.location}`;
    if (ev.zone?.name) line += `\n🗺️ ${ev.zone.name}`;
    return line;
  });

  return `${header}\n\n${lines.join("\n\n")}\n\n<i>Enviado às ${timeStr}</i>`;
}

export function buildDailyDigestMessage(
  todayEvents: EventLike[],
  nextDaysEvents: { date: Date; events: EventLike[] }[],
): string {
  const now     = new Date();
  const timeStr = format(now, "HH:mm");

  let msg = `🌅 <b>Bom dia! Agenda — ${format(now, "dd/MM (EEEE)", { locale: ptBR })}</b>\n\n`;

  // Hoje
  if (todayEvents.length === 0) {
    msg += `📭 Nenhum evento hoje.\n`;
  } else {
    msg += todayEvents.map((ev) => {
      const time  = format(new Date(ev.date), "HH:mm");
      const emoji = TYPE_EMOJI[ev.type] ?? "📌";
      let line    = `${emoji} <b>${time}</b> · ${ev.title}`;
      if (ev.location) line += `\n   📍 ${ev.location}`;
      return line;
    }).join("\n");
  }

  // Próximos dias
  const diasComEventos = nextDaysEvents.filter((d) => d.events.length > 0);
  if (diasComEventos.length > 0) {
    msg += `\n\n<b>📆 Próximos dias</b>`;
    for (const { date, events } of diasComEventos) {
      const dayLabel = format(date, "EEEE, dd/MM", { locale: ptBR });
      msg += `\n\n<i>${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}</i>`;
      for (const ev of events) {
        const time  = format(new Date(ev.date), "HH:mm");
        const emoji = TYPE_EMOJI[ev.type] ?? "📌";
        msg += `\n${emoji} ${time} · ${ev.title}`;
        if (ev.location) msg += ` · 📍 ${ev.location}`;
      }
    }
  }

  msg += `\n\n<i>Enviado às ${timeStr}</i>`;
  return msg;
}

export function buildBroadcastMessage(title: string, message: string): string {
  const now     = new Date();
  const timeStr = format(now, "dd/MM 'às' HH:mm");
  return `📢 <b>${title}</b>\n\n${message}\n\n<i>${timeStr}</i>`;
}

export function buildEventNotification(
  action: "criado" | "atualizado" | "removido",
  event: EventLike,
): string {
  const emoji   = action === "criado" ? "✅" : action === "atualizado" ? "✏️" : "❌";
  const time    = format(new Date(event.date), "HH:mm");
  const dateStr = format(new Date(event.date), "dd/MM", { locale: ptBR });

  let text = `${emoji} <b>Evento ${action}:</b> ${event.title}`;
  text += `\n🗓️ ${dateStr} às ${time}`;
  if (event.location) text += `\n📍 ${event.location}`;
  if (event.zone?.name) text += `\n🗺️ ${event.zone.name}`;
  return text;
}
