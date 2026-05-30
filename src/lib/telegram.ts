import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCampaignIntegrations } from "./meta-db";

// Fallback global mantido APENAS para a campanha original (andre-santos-2026)
// enquanto não migra para Campaign.telegramBotToken/telegramChatId.
const FALLBACK_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const FALLBACK_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   ?? "";
const FALLBACK_CID = "andre-santos-2026";

/**
 * Converte qualquer Date/string/number para horário de Brasília (BRT = UTC-3).
 * Vercel serverless roda em UTC; subtract 3h antes de usar format() para exibir BRT.
 */
function toBRT(d: Date | string | number): Date {
  return new Date(new Date(d).getTime() - 3 * 60 * 60 * 1000);
}
/** Retorna "agora" no fuso de Brasília */
function nowBRT(): Date { return toBRT(Date.now()); }

interface TelegramCreds { botToken: string; chatId: string }

async function resolveCreds(campaignId: string): Promise<TelegramCreds | null> {
  // 1) Tenta credenciais por campanha (Campaign.telegram*)
  const integ = await getCampaignIntegrations(campaignId);
  if (integ.telegramBotToken && integ.telegramChatId) {
    return { botToken: integ.telegramBotToken, chatId: integ.telegramChatId };
  }
  // 2) Fallback global apenas para a campanha do André
  if (campaignId === FALLBACK_CID && FALLBACK_BOT_TOKEN && FALLBACK_CHAT_ID) {
    return { botToken: FALLBACK_BOT_TOKEN, chatId: FALLBACK_CHAT_ID };
  }
  return null;
}

/**
 * Checa configuração Telegram da campanha. Aceita campaignId opcional —
 * sem ele, checa só o fallback global (André).
 */
export async function isTelegramConfigured(campaignId?: string): Promise<boolean> {
  const cid = campaignId ?? FALLBACK_CID;
  return Boolean(await resolveCreds(cid));
}

/**
 * Envia mensagem Telegram para a campanha. Sempre passe campaignId — sem ele,
 * cai no fallback global do André (legado).
 */
export async function sendTelegram(campaignId: string, text: string): Promise<void> {
  const creds = await resolveCreds(campaignId);
  if (!creds) return;
  try {
    await fetch(`https://api.telegram.org/bot${creds.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: creds.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error("[telegram] erro ao enviar mensagem:", err);
  }
}

/**
 * Envia para a campanha André — atalho legado para callers que ainda não passam campaignId.
 * Em produção, prefira sendTelegram(campaignId, text).
 */
export async function sendTelegramLegacy(text: string): Promise<void> {
  return sendTelegram(FALLBACK_CID, text);
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
  const now     = nowBRT();
  const dateStr = format(now, "dd/MM (EEEE)", { locale: ptBR });
  const timeStr = format(now, "HH:mm");

  const header = isUpdate
    ? `🔔 <b>Agenda atualizada — ${dateStr}</b>`
    : `📅 <b>Agenda de hoje — ${dateStr}</b>`;

  if (events.length === 0) {
    return `${header}\n\nNenhum evento agendado para hoje.\n\n<i>Enviado às ${timeStr} (BRT)</i>`;
  }

  const lines = events.map((ev) => {
    const time  = format(toBRT(ev.date), "HH:mm");
    const emoji = TYPE_EMOJI[ev.type] ?? "📌";
    let line    = `${emoji} <b>${time}</b> · ${ev.title}`;
    if (ev.location) line += `\n📍 ${ev.location}`;
    if (ev.zone?.name) line += `\n🗺️ ${ev.zone.name}`;
    return line;
  });

  return `${header}\n\n${lines.join("\n\n")}\n\n<i>Enviado às ${timeStr} (BRT)</i>`;
}

export function buildDailyDigestMessage(
  todayEvents: EventLike[],
  nextDaysEvents: { date: Date; events: EventLike[] }[],
): string {
  const now     = nowBRT();
  const timeStr = format(now, "HH:mm");

  let msg = `🌅 <b>Bom dia! Agenda — ${format(now, "dd/MM (EEEE)", { locale: ptBR })}</b>\n\n`;

  // Hoje
  if (todayEvents.length === 0) {
    msg += `📭 Nenhum evento hoje.\n`;
  } else {
    msg += todayEvents.map((ev) => {
      const time  = format(toBRT(ev.date), "HH:mm");
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
      // date já vem calculado em BRT (agenda-telegram/route.ts usa nowBRT())
      const dayLabel = format(date, "EEEE, dd/MM", { locale: ptBR });
      msg += `\n\n<i>${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}</i>`;
      for (const ev of events) {
        const time  = format(toBRT(ev.date), "HH:mm");
        const emoji = TYPE_EMOJI[ev.type] ?? "📌";
        msg += `\n${emoji} ${time} · ${ev.title}`;
        if (ev.location) msg += ` · 📍 ${ev.location}`;
      }
    }
  }

  msg += `\n\n<i>Enviado às ${timeStr} (BRT)</i>`;
  return msg;
}

export function buildBroadcastMessage(title: string, message: string): string {
  const timeStr = format(nowBRT(), "dd/MM 'às' HH:mm");
  return `📢 <b>${title}</b>\n\n${message}\n\n<i>${timeStr} (BRT)</i>`;
}

export function buildEventNotification(
  action: "criado" | "atualizado" | "removido",
  event: EventLike,
): string {
  const emoji   = action === "criado" ? "✅" : action === "atualizado" ? "✏️" : "❌";
  const brtDate = toBRT(event.date);
  const time    = format(brtDate, "HH:mm");
  const dateStr = format(brtDate, "dd/MM", { locale: ptBR });

  let text = `${emoji} <b>Evento ${action}:</b> ${event.title}`;
  text += `\n🗓️ ${dateStr} às ${time}`;
  if (event.location) text += `\n📍 ${event.location}`;
  if (event.zone?.name) text += `\n🗺️ ${event.zone.name}`;
  return text;
}
