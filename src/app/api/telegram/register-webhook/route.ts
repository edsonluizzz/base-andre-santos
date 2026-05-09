import { NextResponse } from "next/server";

export async function GET() {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.APP_URL;

  if (!token || !appUrl) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN ou APP_URL não configurados" }, { status: 400 });
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;

  // Usa POST com JSON — correto para Telegram API
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message", "channel_post"],
      drop_pending_updates: true,
    }),
  });

  const data = await res.json();
  return NextResponse.json({ ...data, webhookUrl });
}
