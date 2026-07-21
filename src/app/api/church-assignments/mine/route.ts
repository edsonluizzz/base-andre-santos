import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { db } = getCampaignContext(session);

    const collaborator = await db.collaborator.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!collaborator) {
      return NextResponse.json({ data: [] });
    }

    const candidates = await db.churchAssignment.findMany({
      where: {
        status: { not: "ENTREGUE" },
        OR: [{ member1Id: collaborator.id }, { member2Id: collaborator.id }],
      },
      include: {
        church: { select: { id: true, name: true, regional: true } },
        member1: { select: { id: true, name: true } },
        member2: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const churchIds = candidates.map((c) => c.churchId);
    const latestPerChurch = await db.churchAssignment.findMany({
      where: { churchId: { in: churchIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["churchId"],
      select: { id: true, churchId: true },
    });
    const latestIdByChurch = new Map(latestPerChurch.map((a) => [a.churchId, a.id]));
    const assignments = candidates.filter((a) => latestIdByChurch.get(a.churchId) === a.id);

    return NextResponse.json({ data: assignments });
  } catch (err) {
    console.error("[api/church-assignments/mine] erro:", err);
    return NextResponse.json({ error: "Erro ao listar suas igrejas" }, { status: 500 });
  }
}
