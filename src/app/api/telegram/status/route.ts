import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.APP_URL;

  if (!token) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN não configurado" }, { status: 400 });

  const [webhookRes, meRes] = await Promise.all([
    fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`),
    fetch(`https://api.telegram.org/bot${token}/getMe`),
  ]);

  const webhook = await webhookRes.json();
  const me      = await meRes.json();

  return NextResponse.json({
    bot: me.result ?? me,
    webhook: webhook.result ?? webhook,
    expectedUrl: appUrl ? `${appUrl.replace(/\/$/, "")}/api/telegram/webhook` : "(APP_URL não configurado)",
    urlMatch: webhook.result?.url === `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`,
  });
}
