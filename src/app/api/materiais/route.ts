import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { parseMaterialFilters, buildMaterialWhere } from "@/lib/materiais-filters";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);

    const filters = parseMaterialFilters(req.url);
    const where = buildMaterialWhere(cid, filters);

    const [rows, cityRows] = await Promise.all([
      db.materialRequest.findMany({
        where,
        select: {
          id: true, items: true, status: true, pdfUrl: true,
          termSnapshotName: true, termSnapshotCpf: true, termAcceptedAt: true,
          emailStatus: true, whatsappStatus: true,
          deliveryCep: true, deliveryLogradouro: true, deliveryNumero: true,
          deliveryComplemento: true, deliveryBairro: true, deliveryMunicipio: true, deliveryUf: true,
          churchName: true,
          approvedAt: true, deliveredAt: true, notes: true, createdAt: true,
          collaborator: { select: { id: true, name: true, phone: true, email: true } },
          approvedBy: { select: { name: true, email: true } },
          deliveredBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      // Cidades distintas de todo o campanha (não só do filtro atual) — pra popular o dropdown de filtro.
      db.materialRequest.findMany({
        where: { campaignId: cid, deliveryMunicipio: { not: null } },
        select: { deliveryMunicipio: true },
        distinct: ["deliveryMunicipio"],
        orderBy: { deliveryMunicipio: "asc" },
      }),
    ]);

    const cities = cityRows.map((r) => r.deliveryMunicipio!).filter(Boolean);

    return NextResponse.json({ rows, cities });
  } catch (err) {
    console.error("[api/materiais] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
