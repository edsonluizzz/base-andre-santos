import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

/**
 * POST /api/n8n/backfill-toledo
 *
 * One-shot solicitado pelo Edson em 2026-06-03:
 * "os leads que vieram pelo Quem Sou Eu ebook, do dia 31/05 até hoje,
 *  pode colocar todos com CEP de Toledo".
 *
 * Aplica city='Toledo' nos Collaborators com:
 *   - campaignId = andre-santos-2026
 *   - source = EBOOK_QUEM_SOU_EU
 *   - createdAt entre 2026-05-31 00:00 BRT (= 2026-05-31 03:00 UTC)
 *                 e 2026-06-04 02:59 BRT (cobre o dia 03/06 BRT inteiro)
 *   - city IS NULL
 *
 * Auth: Bearer N8N_API_KEY.
 * Idempotente — re-rodar não duplica nem sobrescreve quem já tem city.
 *
 * Será removido após uso.
 */
export async function POST(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const FROM = new Date("2026-05-31T03:00:00Z"); // 00:00 BRT 31/05
  const TO   = new Date("2026-06-04T02:59:59Z"); // 23:59 BRT 03/06

  const candidates = await db.collaborator.findMany({
    where: {
      campaignId: "andre-santos-2026",
      source: "EBOOK_QUEM_SOU_EU",
      city: null,
      createdAt: { gte: FROM, lte: TO },
    },
    select: { id: true, name: true, phone: true, createdAt: true },
  });

  if (candidates.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "Nenhum lead matched",
      updated: 0,
      window: { from: FROM.toISOString(), to: TO.toISOString() },
    });
  }

  const result = await db.collaborator.updateMany({
    where: {
      campaignId: "andre-santos-2026",
      source: "EBOOK_QUEM_SOU_EU",
      city: null,
      createdAt: { gte: FROM, lte: TO },
    },
    data: { city: "Toledo" },
  });

  return NextResponse.json({
    ok: true,
    matched: candidates.length,
    updated: result.count,
    window: { from: FROM.toISOString(), to: TO.toISOString() },
    sampleIds: candidates.slice(0, 5).map((c) => ({ id: c.id, name: c.name, createdAt: c.createdAt })),
  });
}
