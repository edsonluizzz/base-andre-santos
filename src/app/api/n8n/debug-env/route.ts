import { NextRequest, NextResponse } from "next/server";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * GET /api/n8n/debug-env
 *
 * Mostra metadata das envs n8n (length, prefix, suffix) — sem revelar valor.
 * Auth: Bearer N8N_API_KEY. Endpoint temporário para diagnóstico.
 */
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const keys = [
    "N8N_LEAD_WEBHOOK_URL",
    "N8N_MANUAL_WEBHOOK_URL",
    "N8N_BROADCAST_WEBHOOK_URL",
    "N8N_IMPORT_WEBHOOK_URL",
    "N8N_API_KEY",
    "LEAD_DAILY_LIMIT",
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = process.env[k];
    if (v === undefined) {
      out[k] = { set: false };
    } else {
      out[k] = {
        set: true,
        length: v.length,
        prefix: v.slice(0, 20),
        suffix: v.slice(-20),
        hasAngleBrackets: v.includes("<") || v.includes(">"),
        hasQuotes: v.includes('"') || v.includes("'"),
        hasSpaceEdges: v !== v.trim(),
      };
    }
  }
  return NextResponse.json({ ok: true, envs: out });
}
