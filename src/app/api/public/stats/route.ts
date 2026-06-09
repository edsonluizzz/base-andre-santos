import { NextRequest, NextResponse } from "next/server";
import { resolvePublicTenant } from "@/lib/tenant-resolver";

export async function GET(req: NextRequest) {
  try {
    const { db, cid: CID } = await resolvePublicTenant(req);

    const [apoiadores, cityRows, grupos, settings] = await Promise.all([
      db.collaborator.count({ where: { campaignId: CID, status: { not: "INACTIVE" } } }),
      db.collaborator.findMany({
        where: { campaignId: CID, status: { not: "INACTIVE" }, city: { not: null } },
        select: { city: true },
        distinct: ["city"],
      }),
      db.whatsAppGroup.count({ where: { campaignId: CID } }),
      db.settings.findUnique({ where: { id: "singleton" }, select: { whatsappGroupLink: true, campaignName: true } }),
    ]);

    return NextResponse.json(
      {
        apoiadores,
        municipios: cityRows.length,
        grupos,
        whatsappGroupLink: settings?.whatsappGroupLink ?? null,
        campaignName: settings?.campaignName ?? null,
      },
      {
        // Contadores sociais toleram 5min de atraso — em burst de evento o CDN
        // responde e o banco recebe 1 query a cada 5min em vez de 1 por visitante.
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      }
    );
  } catch (err) {
    console.error("[public/stats]", err);
    return NextResponse.json({ apoiadores: 0, municipios: 0, grupos: 0, whatsappGroupLink: null, campaignName: null });
  }
}
