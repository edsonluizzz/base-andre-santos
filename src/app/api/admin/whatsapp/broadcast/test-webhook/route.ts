import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Endpoint de diagnóstico temporário — testa se o webhook do n8n responde,
// sem expor a URL/segredo. Remover depois de confirmado o problema.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const webhookUrl = process.env.N8N_BROADCAST_WEBHOOK_URL ?? process.env.N8N_MANUAL_WEBHOOK_URL;
  const which = process.env.N8N_BROADCAST_WEBHOOK_URL ? "N8N_BROADCAST_WEBHOOK_URL" : "N8N_MANUAL_WEBHOOK_URL (fallback)";

  if (!webhookUrl) {
    return NextResponse.json({ configured: false });
  }

  try {
    const started = Date.now();
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broadcastId: "diagnostico-teste", campaignId: "andre-santos-2026", test: true }),
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text().catch(() => "");
    return NextResponse.json({
      configured: true,
      envVarUsed: which,
      urlHost: new URL(webhookUrl).host,
      urlPathLength: new URL(webhookUrl).pathname.length,
      httpStatus: res.status,
      ok: res.ok,
      responseBody: text.slice(0, 500),
      tookMs: Date.now() - started,
    });
  } catch (err) {
    return NextResponse.json({
      configured: true,
      envVarUsed: which,
      urlHost: new URL(webhookUrl).host,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
