/**
 * Webhook do Telegram — recebe mensagens enviadas ao bot.
 *
 * Comandos suportados (enviar no canal):
 *   /novo <título> | <data dd/mm> | <hora HH:MM> | <local (opcional)>
 *   Exemplo: /novo Reunião de líderes | 15/05 | 19:00 | Sede do partido
 *
 * Para registrar o webhook no Telegram, acesse uma vez:
 *   GET /api/telegram/register-webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTelegram } from "@/lib/telegram";

const CID = "andre-santos-2026";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = body?.channel_post?.text ?? body?.message?.text ?? "";
    if (!text.startsWith("/novo")) {
      return NextResponse.json({ ok: true });
    }

    // Formato: /novo Título | dd/mm | HH:MM | Local (opcional)
    const content = text.replace(/^\/novo\s*/i, "").trim();
    const parts   = content.split("|").map((p) => p.trim());

    const title    = parts[0] ?? "";
    const dateStr  = parts[1] ?? ""; // dd/mm
    const timeStr  = parts[2] ?? "09:00"; // HH:MM
    const location = parts[3] ?? null;

    if (!title || !dateStr) {
      await sendTelegram(
        `❌ Formato inválido.\n\nUse:\n<code>/novo Título | dd/mm | HH:MM | Local</code>\n\nExemplo:\n<code>/novo Reunião de líderes | 15/05 | 19:00 | Sede do partido</code>`
      );
      return NextResponse.json({ ok: true });
    }

    // Parsear data
    const [day, month] = dateStr.split("/").map(Number);
    const [hour, min]  = timeStr.split(":").map(Number);
    const year         = new Date().getFullYear();
    const eventDate    = new Date(year, month - 1, day, hour ?? 9, min ?? 0);

    if (isNaN(eventDate.getTime())) {
      await sendTelegram(`❌ Data inválida: <code>${dateStr}</code>. Use o formato dd/mm.`);
      return NextResponse.json({ ok: true });
    }

    await db.event.create({
      data: {
        campaignId: CID,
        title,
        type: "OUTRO",
        date: eventDate,
        location: location || null,
        notes: "Criado via Telegram",
      },
    });

    const formattedDate = eventDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
    await sendTelegram(
      `✅ <b>Evento criado!</b>\n\n📌 ${title}\n🗓️ ${formattedDate} às ${timeStr}${location ? `\n📍 ${location}` : ""}\n\n<i>Acesse /agenda para editar detalhes.</i>`
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram/webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
