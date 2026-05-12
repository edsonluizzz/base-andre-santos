import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMunicipioPR } from "@/lib/tse";

const CID = "andre-santos-2026";

// Roda toda segunda-feira às 3h UTC (vercel.json: "0 3 * * 1")
// Cria MunicipalityGoal para cidades com colaboradores que ainda não têm meta.
// NÃO sobrescreve metas já existentes — preserva ajustes manuais.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-vercel-cron-signature") ??
    req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Cidades distintas com pelo menos 1 colaborador
    const citiesInDB = await db.collaborator.findMany({
      where: { campaignId: CID, city: { not: null } },
      select: { city: true },
      distinct: ["city"],
    });

    // Metas já cadastradas
    const existing = await db.municipalityGoal.findMany({
      where: { campaignId: CID },
      select: { city: true },
    });
    const withGoal = new Set(existing.map((g) => g.city));

    let created = 0;
    const skipped: string[] = [];
    const noData: string[] = [];

    for (const { city } of citiesInDB) {
      if (!city) continue;
      if (withGoal.has(city)) { skipped.push(city); continue; }

      const suggestion = getMunicipioPR(city);
      if (!suggestion) { noData.push(city); continue; }

      await db.municipalityGoal.create({
        data: {
          campaignId: CID,
          city,
          targetVotes:   suggestion.metaSugerida,
          targetLeaders: suggestion.metaLideres,
        },
      });
      created++;
    }

    console.log(`[tse-sync] criadas=${created} | ja-tinham-meta=${skipped.length} | sem-dado-tse=${noData.length}`);
    if (noData.length > 0) console.log(`[tse-sync] cidades sem dado TSE:`, noData);

    return NextResponse.json({ created, skipped: skipped.length, noData });
  } catch (err) {
    console.error("[tse-sync]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
