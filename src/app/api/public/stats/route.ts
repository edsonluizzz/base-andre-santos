import { NextRequest, NextResponse } from "next/server";
import { resolvePublicTenant } from "@/lib/tenant-resolver";
import { db as globalDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { db, cid: CID } = await resolvePublicTenant(req);

    const [apoiadores, cityRows, grupos, campaign, settings] = await Promise.all([
      db.collaborator.count({ where: { campaignId: CID, status: { not: "INACTIVE" } } }),
      db.collaborator.findMany({
        where: { campaignId: CID, status: { not: "INACTIVE" }, city: { not: null } },
        select: { city: true },
        distinct: ["city"],
      }),
      db.whatsAppGroup.count({ where: { campaignId: CID } }),
      // Campaign é sempre lida do meta-db global — dados de personalização por
      // tenant (nome, número, cor, grupo WA) nunca vivem no banco isolado.
      globalDb.campaign.findUnique({
        where: { id: CID },
        select: {
          candidateName: true, office: true, candidateNumber: true, party: true, district: true,
          primaryColor: true, secondaryColor: true, whatsappGroupLink: true, materialWhatsappGroupLink: true, youtubeVideoId: true,
          profileBadgeUrl: true,
          partnerCandidateName: true, partnerCandidateNumber: true, partnerOffice: true, partnerBadgeUrl: true,
        },
      }),
      // Settings é singleton legado (pré multi-tenant) — mantido só para não quebrar
      // /material, que ainda lê campaignName daqui.
      db.settings.findUnique({ where: { id: "singleton" }, select: { campaignName: true } }),
    ]);

    return NextResponse.json(
      {
        apoiadores,
        municipios: cityRows.length,
        grupos,
        campaignName: settings?.campaignName ?? null,
        candidateName: campaign?.candidateName ?? null,
        office: campaign?.office ?? null,
        candidateNumber: campaign?.candidateNumber ?? null,
        party: campaign?.party ?? null,
        district: campaign?.district ?? null,
        primaryColor: campaign?.primaryColor ?? "#ff6b04",
        secondaryColor: campaign?.secondaryColor ?? "#0a1220",
        whatsappGroupLink: campaign?.whatsappGroupLink ?? null,
        materialWhatsappGroupLink: campaign?.materialWhatsappGroupLink ?? null,
        youtubeVideoId: campaign?.youtubeVideoId ?? null,
        profileBadgeUrl: campaign?.profileBadgeUrl ?? null,
        partnerCandidateName: campaign?.partnerCandidateName ?? null,
        partnerCandidateNumber: campaign?.partnerCandidateNumber ?? null,
        partnerOffice: campaign?.partnerOffice ?? null,
        partnerBadgeUrl: campaign?.partnerBadgeUrl ?? null,
      },
      {
        // Contadores sociais toleram 5min de atraso — em burst de evento o CDN
        // responde e o banco recebe 1 query a cada 5min em vez de 1 por visitante.
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      }
    );
  } catch (err) {
    console.error("[public/stats]", err);
    return NextResponse.json({
      apoiadores: 0, municipios: 0, grupos: 0,
      campaignName: null, candidateName: null, office: null, candidateNumber: null, party: null, district: null,
      primaryColor: "#ff6b04", secondaryColor: "#0a1220",
      whatsappGroupLink: null, materialWhatsappGroupLink: null, youtubeVideoId: null, profileBadgeUrl: null,
      partnerCandidateName: null, partnerCandidateNumber: null, partnerOffice: null, partnerBadgeUrl: null,
    });
  }
}
