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
    // lideranças + qualquer um CONFIRMADO. Agregado no banco (groupBy) em vez de
    // puxar todas as lideranças e contar em JS.
    const keyPeopleWhere = {
      campaignId: CID,
      status: { not: "INACTIVE" as const },
      OR: [
        { profile: { not: "APOIADOR" as CollaboratorProfile } },
        { supportStatus: "CONFIRMADO" as SupportStatus },
      ],
    };
    const [statsByStatus, citiesGrouped] = await Promise.all([
      db.collaborator.groupBy({ by: ["supportStatus"], where: keyPeopleWhere, _count: { _all: true } }),
      db.collaborator.groupBy({ by: ["city"], where: { ...keyPeopleWhere, city: { not: null } }, _count: { _all: true } }),
    ]);
    const countSS = (s: string) => statsByStatus.find((g) => g.supportStatus === s)?._count._all ?? 0;
    const stats = {
      total: statsByStatus.reduce((a, g) => a + g._count._all, 0),
      confirmado: countSS("CONFIRMADO"),
      negociando: countSS("NEGOCIANDO"),
      neutro: countSS("NEUTRO"),
      adversario: countSS("ADVERSARIO"),
      cidades: citiesGrouped.filter((g) => g.city && g.city.trim()).length,
    };

    return NextResponse.json({ byCity, stats });
  } catch (err) {
    console.error("[mapa GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
