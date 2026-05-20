import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


// Lista de usuários que têm pelo menos 1 colaborador cadastrado (para filtro)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);

    const leaders = await db.user.findMany({
      where: { registeredCollaborators: { some: { campaignId: CID } } },
      select: {
        id: true, name: true, email: true,
        _count: { select: { registeredCollaborators: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      leaders.map((l) => ({ id: l.id, name: l.name ?? l.email ?? l.id, count: l._count.registeredCollaborators }))
    );
  } catch (err) {
    console.error("[leaders GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
