import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const CAMPAIGN_ID = "andre-santos-2026";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * GET /api/n8n/leads
 *
 * Retorna fila de leads para disparo no WhatsApp.
 * Critérios: status LEAD, tem telefone, não foi contactado nos últimos `cooldown_days` dias (padrão 7).
 *
 * Query params:
 *   limit        (int, 1–100, padrão 20) — máx leads por lote
 *   cooldown_days (int, padrão 7)         — dias desde o último contato
 *
 * Autenticação: Authorization: Bearer <N8N_API_KEY>
 */
export async function GET(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const cooldownDays = parseInt(searchParams.get("cooldown_days") ?? "7");

  const cutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);

  const leads = await db.collaborator.findMany({
    where: {
      campaignId: CAMPAIGN_ID,
      status: "LEAD",
      phone: { not: null },
      OR: [
        { lastContactedAt: null },
        { lastContactedAt: { lt: cutoff } },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      city: true,
      source: true,
      lastContactedAt: true,
      createdAt: true,
    },
    orderBy: [
      { lastContactedAt: "asc" }, // nunca contactados primeiro
      { createdAt: "asc" },
    ],
    take: limit,
  });

  return NextResponse.json({
    data: leads,
    count: leads.length,
    cooldown_days: cooldownDays,
  });
}
