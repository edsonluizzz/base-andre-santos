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

    const assignments = await db.churchAssignment.findMany({
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

    return NextResponse.json({ data: assignments });
  } catch (err) {
    console.error("[api/church-assignments/mine] erro:", err);
    return NextResponse.json({ error: "Erro ao listar suas igrejas" }, { status: 500 });
  }
}
