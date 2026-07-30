import { NextResponse } from "next/server";

export async function GET() {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.APP_URL;

  if (!token || !appUrl) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN ou APP_URL não configurados" }, { status: 400 });
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secretToken) {
    return NextResponse.json(
      { error: "TELEGRAM_WEBHOOK_SECRET não configurado — defina antes de registrar o webhook (protege a rota contra POSTs forjados)." },
      { status: 400 },
    );
  }

  // Usa POST com JSON — correto para Telegram API
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message", "channel_post"],
      drop_pending_updates: true,
      secret_token: secretToken,
    }),
  });

  const data = await res.json();
  return NextResponse.json({ ...data, webhookUrl });
}
