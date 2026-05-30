import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

/**
 * GET /api/collaborators/[id]/contacts
 *
 * Retorna timeline de contatos do colaborador (ContactLog) em ordem cronológica reversa.
 * Limit 100.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { db, cid: campaignId } = getCampaignContext(session);

    // Valida ownership (colab pertence à campanha ativa)
    const collab = await db.collaborator.findFirst({
      where: { id: params.id, campaignId },
      select: { id: true },
    });
    if (!collab) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const logs = await db.contactLog.findMany({
      where: { collaboratorId: params.id, campaignId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        kind: true,
        channel: true,
        source: true,
        actorId: true,
        notes: true,
        createdAt: true,
      },
    });

    return NextResponse.json(logs);
  } catch (err) {
    console.error("[collaborators/contacts GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
