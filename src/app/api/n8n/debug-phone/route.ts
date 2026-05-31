import { NextRequest, NextResponse } from "next/server";
import { getCampaignContext } from "@/lib/campaign-context";
import { getCampaignDbUrl } from "@/lib/meta-db";

/**
 * POST /api/admin/debug-phone
 * Inspeciona como um conjunto de phones está armazenado no banco.
 * Retorna apenas IDs, status e últimos 4 dígitos mascarados — sem nomes.
 *
 * Auth: Bearer N8N_API_KEY (rota temporária para diagnóstico do WF2).
 *
 * Body: { phones: ["...", "..."], campaignId?: string }
 */
function authCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  return req.headers.get("authorization") === `Bearer ${key}`;
}

export async function POST(req: NextRequest) {
  if (!authCheck(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { phones?: string[]; campaignId?: string };
  const phones = body.phones ?? [];
  const campaignId = body.campaignId ?? "andre-santos-2026";

  const dbUrl = (await getCampaignDbUrl(campaignId)) ?? process.env.DATABASE_URL;
  const { db } = getCampaignContext({ user: { campaignId, dbUrl: dbUrl ?? undefined } });

  function mask(p: string | null): string {
    if (!p) return "";
    const d = p.replace(/\D/g, "");
    if (d.length <= 4) return d;
    return d.slice(0, -4).replace(/./g, "*") + d.slice(-4);
  }

  const results = [];
  for (const phone of phones) {
    const digits = phone.replace(/\D/g, "");
    const out: Record<string, unknown> = { input: phone };
    for (const n of [9, 8, 7, 6]) {
      const sufix = digits.slice(-n);
      if (sufix.length === n) {
        const matches = await db.collaborator.findMany({
          where: { campaignId, phone: { contains: sufix } },
          select: { id: true, phone: true, status: true, supportStatus: true, source: true, createdAt: true },
          take: 5,
        });
        out[`sufix${n}`] = {
          value: sufix,
          count: matches.length,
          samples: matches.map((m) => ({
            id: m.id,
            status: m.status,
            supportStatus: m.supportStatus,
            source: m.source,
            phoneMasked: mask(m.phone),
            phoneRawLen: (m.phone ?? "").replace(/\D/g, "").length,
            createdAt: m.createdAt,
          })),
        };
        if (matches.length > 0) break; // se já achou, para
      }
    }
    results.push(out);
  }

  // Stats gerais sobre phones na base
  const totalWithPhone = await db.collaborator.count({
    where: { campaignId, phone: { not: null } },
  });
  const totalLead = await db.collaborator.count({
    where: { campaignId, status: "LEAD" },
  });

  // Distribuição do comprimento de phone (raw digits)
  const sample20 = await db.collaborator.findMany({
    where: { campaignId, phone: { not: null } },
    select: { phone: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const lengthDist: Record<number, number> = {};
  for (const r of sample20) {
    const len = (r.phone ?? "").replace(/\D/g, "").length;
    lengthDist[len] = (lengthDist[len] ?? 0) + 1;
  }

  return NextResponse.json({
    results,
    stats: {
      totalWithPhone,
      totalLead,
      sample20LengthDistribution: lengthDist,
    },
  });
}
