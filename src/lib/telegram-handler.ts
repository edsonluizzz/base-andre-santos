/**
 * Handler tenant-aware do webhook Telegram.
 * Comandos suportados (enviar no canal/grupo):
 *   /novo   <título> | <dd/mm> | <HH:MM> | <local>  — cria evento
 *   /lista                                           — agenda dos próximos 7 dias
 *   /stats                                           — resumo da base
 *   /municipio <cidade>                              — cobertura de um município
 *   /ajuda                                           — lista de comandos
 */

import { sendTelegram } from "./telegram";
import type { PrismaClient } from "@prisma/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// BRT = UTC-3
const BRT_OFFSET = 3 * 60 * 60 * 1000;
function nowBRT(): Date { return new Date(Date.now() - BRT_OFFSET); }
function toBRT(d: Date): Date { return new Date(d.getTime() - BRT_OFFSET); }
function startOfDayBRT(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDayBRT(d: Date): Date   { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function brtToUTC(d: Date): Date { return new Date(d.getTime() + BRT_OFFSET); }

const TYPE_EMOJI: Record<string, string> = {
  REUNIAO: "🤝", CULTO: "⛪", PANFLETAGEM: "📋",
  TREINAMENTO: "📚", VISITA: "🚗", OUTRO: "📌",
};

export interface TelegramUpdateBody {
  channel_post?: { text?: string };
  message?: { text?: string };
}

export async function handleTelegramUpdate(
  body: TelegramUpdateBody,
  ctx: { db: PrismaClient; cid: string; campaignDisplayName?: string }
): Promise<void> {
  const text: string = (body?.channel_post?.text ?? body?.message?.text ?? "").trim();
  if (!text.startsWith("/")) return;

  const cmd = text.split(/\s+/)[0].toLowerCase();
  if (cmd === "/novo")       await handleNovo(text, ctx);
  else if (cmd === "/lista") await handleLista(ctx);
  else if (cmd === "/stats") await handleStats(ctx);
  else if (cmd === "/municipio" || cmd === "/município") await handleMunicipio(text, ctx);
  else if (cmd === "/ajuda" || cmd === "/help" || cmd === "/start") await handleAjuda(ctx.cid);
}

async function handleNovo(text: string, { db, cid }: { db: PrismaClient; cid: string }) {
  const content = text.replace(/^\/novo\s*/i, "").trim();
  const parts   = content.split("|").map((p) => p.trim());
  const title    = parts[0] ?? "";
  const dateStr  = parts[1] ?? "";
  const timeStr  = parts[2] ?? "09:00";
  const location = parts[3] ?? null;

  if (!title || !dateStr) {
    await sendTelegram(cid, `❌ Formato inválido.\n\nUse:\n<code>/novo Título | dd/mm | HH:MM | Local</code>\n\nExemplo:\n<code>/novo Reunião de líderes | 15/05 | 19:00 | Sede</code>`);
    return;
  }

  const [day, month] = dateStr.split("/").map(Number);
  const [hour, min]  = timeStr.split(":").map(Number);
  const year = nowBRT().getFullYear();
  const eventDateBRT = new Date(year, month - 1, day, hour ?? 9, min ?? 0);
  const eventDateUTC = brtToUTC(eventDateBRT);

  if (isNaN(eventDateUTC.getTime())) {
    await sendTelegram(cid, `❌ Data inválida: <code>${dateStr}</code>. Use o formato dd/mm.`);
    return;
  }

  await db.event.create({
    data: { campaignId: cid, title, type: "OUTRO", date: eventDateUTC, location: location || null, notes: "Criado via Telegram" },
  });

  const formattedDate = format(eventDateBRT, "EEEE, dd/MM 'às' HH:mm", { locale: ptBR });
  await sendTelegram(cid, `✅ <b>Evento criado!</b>\n\n📌 ${title}\n🗓️ ${formattedDate}${location ? `\n📍 ${location}` : ""}\n\n<i>Acesse a agenda para editar detalhes.</i>`);
}

async function handleLista({ db, cid }: { db: PrismaClient; cid: string }) {
  const brt = nowBRT();
  const startBRT = startOfDayBRT(brt);
  const endBRT7  = endOfDayBRT(new Date(brt.getTime() + 7 * 24 * 60 * 60 * 1000));
  const start = brtToUTC(startBRT);
  const end   = brtToUTC(endBRT7);

  const events = await db.event.findMany({
    where: { campaignId: cid, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
    take: 15,
    include: { zone: { select: { name: true } } },
  });

  if (events.length === 0) {
    await sendTelegram(cid, `📅 <b>Agenda — próximos 7 dias</b>\n\nNenhum evento agendado para esta semana.`);
    return;
  }

  const byDay = new Map<string, typeof events>();
  for (const ev of events) {
    const dayKey = format(toBRT(ev.date), "yyyy-MM-dd");
    const group  = byDay.get(dayKey) ?? [];
    group.push(ev);
    byDay.set(dayKey, group);
  }

  let msg = `📅 <b>Agenda — próximos 7 dias</b>\n`;
  for (const [, dayEvents] of byDay) {
    const dayLabel = format(toBRT(dayEvents[0].date), "EEE, dd/MM", { locale: ptBR });
    msg += `\n<b>${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}</b>\n`;
    for (const ev of dayEvents) {
      const time  = format(toBRT(ev.date), "HH:mm");
      const emoji = TYPE_EMOJI[ev.type] ?? "📌";
      msg += `${emoji} <b>${time}</b> · ${ev.title}`;
      if (ev.location) msg += `\n   📍 ${ev.location}`;
      if (ev.zone?.name) msg += `\n   🗺️ ${ev.zone.name}`;
      msg += "\n";
    }
  }
  msg += `\n<i>${events.length} evento${events.length !== 1 ? "s" : ""} esta semana</i>`;
  await sendTelegram(cid, msg);
}

async function handleStats({ db, cid, campaignDisplayName }: { db: PrismaClient; cid: string; campaignDisplayName?: string }) {
  const brt = nowBRT();
  const todayStart = brtToUTC(startOfDayBRT(brt));
  const weekAgo    = new Date(brt.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStart  = brtToUTC(startOfDayBRT(weekAgo));

  const [ativos, leads, confirmados, novosHoje, novaSemana, cidades] = await Promise.all([
    db.collaborator.count({ where: { campaignId: cid, status: "ACTIVE" } }),
    db.collaborator.count({ where: { campaignId: cid, status: "LEAD" } }),
    db.collaborator.count({ where: { campaignId: cid, status: "ACTIVE", supportStatus: "CONFIRMADO" } }),
    db.collaborator.count({ where: { campaignId: cid, createdAt: { gte: todayStart } } }),
    db.collaborator.count({ where: { campaignId: cid, createdAt: { gte: weekStart } } }),
    db.collaborator.findMany({
      where: { campaignId: cid, city: { not: null } },
      select: { city: true },
      distinct: ["city"],
    }),
  ]);

  const timeStr = format(brt, "HH:mm");
  const titulo = campaignDisplayName ?? "Resumo";
  const msg = [
    `📊 <b>${titulo} — Resumo</b>`,
    ``,
    `👥 <b>${ativos.toLocaleString("pt-BR")}</b> colaboradores ativos`,
    `🎯 <b>${leads.toLocaleString("pt-BR")}</b> leads aguardando conversão`,
    `✅ <b>${confirmados.toLocaleString("pt-BR")}</b> confirmados`,
    `🏙️ <b>${cidades.length}</b> municípios com presença`,
    ``,
    `📥 <b>${novosHoje}</b> cadastros hoje · <b>${novaSemana}</b> esta semana`,
    ``,
    `<i>Atualizado às ${timeStr}</i>`,
  ].join("\n");

  await sendTelegram(cid, msg);
}

async function handleMunicipio(text: string, { db, cid }: { db: PrismaClient; cid: string }) {
  const city = text.replace(/^\/munic[íi]pio\s*/i, "").trim();
  if (!city) {
    await sendTelegram(cid, `❌ Informe o nome do município.\n\nExemplo: <code>/municipio Curitiba</code>`);
    return;
  }

  const colabs = await db.collaborator.findMany({
    where: { campaignId: cid, city: { contains: city, mode: "insensitive" } },
    select: { campaignRole: true, status: true, supportStatus: true },
  });

  if (colabs.length === 0) {
    await sendTelegram(cid, `🗺️ <b>${city}</b>\n\nNenhum colaborador encontrado neste município.`);
    return;
  }

  const ativos      = colabs.filter((c) => c.status === "ACTIVE").length;
  const leads       = colabs.filter((c) => c.status === "LEAD").length;
  const confirmados = colabs.filter((c) => c.supportStatus === "CONFIRMADO" && c.status === "ACTIVE").length;
  const negociando  = colabs.filter((c) => c.supportStatus === "NEGOCIANDO").length;
  const adversarios = colabs.filter((c) => c.supportStatus === "ADVERSARIO").length;

  const ROLE_LABEL: Record<string, string> = {
    COORD_GERAL: "Coord. Geral", COORD_REGIONAL: "Coord. Regional",
    LIDER_MUNICIPAL: "Líder Municipal", LIDER_BAIRRO: "Líder de Bairro", VOLUNTARIO: "Voluntário",
  };
  const byCargo = new Map<string, number>();
  for (const c of colabs) {
    if (c.campaignRole !== "VOLUNTARIO") {
      byCargo.set(c.campaignRole, (byCargo.get(c.campaignRole) ?? 0) + 1);
    }
  }
  const voluntarios = colabs.filter((c) => c.campaignRole === "VOLUNTARIO").length;

  let msg = `🗺️ <b>${city}</b>\n\n`;
  msg += `👥 Total: <b>${colabs.length}</b> (${ativos} ativo${ativos !== 1 ? "s" : ""}, ${leads} lead${leads !== 1 ? "s" : ""})\n`;
  msg += `✅ Confirmados: <b>${confirmados}</b>\n`;
  if (negociando > 0) msg += `🤝 Negociando: <b>${negociando}</b>\n`;
  if (adversarios > 0) msg += `❌ Adversários: <b>${adversarios}</b>\n`;

  if (byCargo.size > 0 || voluntarios > 0) {
    msg += `\n<b>Cargos:</b>\n`;
    for (const [role, count] of byCargo) {
      msg += `• ${count} ${ROLE_LABEL[role] ?? role}\n`;
    }
    if (voluntarios > 0) msg += `• ${voluntarios} Voluntário${voluntarios !== 1 ? "s" : ""}\n`;
  }

  await sendTelegram(cid, msg.trimEnd());
}

async function handleAjuda(cid: string) {
  await sendTelegram(cid, [
    `🤖 <b>Comandos disponíveis:</b>`,
    ``,
    `📅 <b>/lista</b>`,
    `   Agenda dos próximos 7 dias`,
    ``,
    `📊 <b>/stats</b>`,
    `   Resumo da base (ativos, leads, confirmados)`,
    ``,
    `🗺️ <b>/municipio &lt;cidade&gt;</b>`,
    `   Cobertura de um município`,
    `   Ex: <code>/municipio Curitiba</code>`,
    ``,
    `📌 <b>/novo</b> Título | dd/mm | HH:MM | Local`,
    `   Cria um evento na agenda`,
    `   Ex: <code>/novo Reunião | 20/05 | 19:00 | Sede</code>`,
  ].join("\n"));
}
