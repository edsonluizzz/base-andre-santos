import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem ver a lista de igrejas" }, { status: 403 });
    }

    const { db, cid: CID } = getCampaignContext(session);
    const { searchParams } = new URL(req.url);
    const regional = searchParams.get("regional") ?? "";
    const denominacao = searchParams.get("denominacao") ?? "";

    const churches = await db.church.findMany({
      where: {
        campaignId: CID,
        ...(regional && { regional }),
        ...(denominacao && { denominacao }),
      },
      include: {
        pastor: { select: { id: true, name: true, phone: true } },
        assignments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            member1: { select: { id: true, name: true } },
            member2: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const data = churches.map((c) => ({
      id: c.id,
      name: c.name,
      regional: c.regional,
      denominacao: c.denominacao,
      pastor: c.pastor,
      latestAssignment: c.assignments[0] ?? null,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[api/churches GET] erro:", err);
    return NextResponse.json({ error: "Erro ao listar igrejas" }, { status: 500 });
  }
}
