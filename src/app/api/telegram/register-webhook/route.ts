import { NextResponse } from "next/server";

export async function GET() {
  const token   = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl  = process.env.APP_URL;

  if (!token || !appUrl) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN ou APP_URL não configurados" }, { status: 400 });
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`;
  const res = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&allowed_updates=["channel_post","message"]`
  );
  const data = await res.json();
  return NextResponse.json(data);
}
