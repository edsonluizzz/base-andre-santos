import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { CollaboratorProfile, SupportStatus } from "@prisma/client";


export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city") ?? "";
    const supportStatus = searchParams.get("supportStatus") ?? "";
    const profile = searchParams.get("profile") ?? "";

    // Default: mostra lideranças (não-APOIADOR) + qualquer um CONFIRMADO.
    // Quando o usuário filtra explicitamente por profile, respeita o filtro.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileFilter: any = profile
      ? { profile: profile as CollaboratorProfile }
      : {
          OR: [
            { profile: { not: CollaboratorProfile.APOIADOR } },
            { supportStatus: "CONFIRMADO" as SupportStatus },
          ],
        };

    const collaborators = await db.collaborator.findMany({
      where: {
        campaignId: CID,
        status: { not: "INACTIVE" },
        ...profileFilter,
        ...(city && { city: { contains: city, mode: "insensitive" } }),
        ...(supportStatus && { supportStatus: supportStatus as SupportStatus }),
      },
      select: {
        id: true,
        name: true,
        city: true,
        neighborhood: true,
        phone: true,
        profile: true,
        supportStatus: true,
        campaignRole: true,
        notes: true,
      },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });

    // Agrupa por cidade
    const byCity: Record<string, typeof collaborators> = {};
    for (const c of collaborators) {
      const key = c.city?.trim() || "Sem cidade";
      if (!byCity[key]) byCity[key] = [];
      byCity[key].push(c);
    }

    // Estatísticas gerais (sem filtro de cidade) — mesma regra do listing:
    // lideranças + qualquer um CONFIRMADO
    const allKeyPeople = await db.collaborator.findMany({
      where: {
        campaignId: CID,
        status: { not: "INACTIVE" },
        OR: [
          { profile: { not: "APOIADOR" } },
          { supportStatus: "CONFIRMADO" },
        ],
      },
      select: { supportStatus: true, city: true },
    });

    const stats = {
      total: allKeyPeople.length,
      confirmado: allKeyPeople.filter((c) => c.supportStatus === "CONFIRMADO").length,
      negociando: allKeyPeople.filter((c) => c.supportStatus === "NEGOCIANDO").length,
      neutro: allKeyPeople.filter((c) => c.supportStatus === "NEUTRO").length,
      adversario: allKeyPeople.filter((c) => c.supportStatus === "ADVERSARIO").length,
      cidades: new Set(allKeyPeople.map((c) => c.city).filter(Boolean)).size,
    };

    return NextResponse.json({ byCity, stats });
  } catch (err) {
    console.error("[mapa GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
