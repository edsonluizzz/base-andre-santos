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
  REUNIAO: "🤝", COMICIO: "📣", PANFLETAGEM: "📋",
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
