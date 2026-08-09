import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

const bodySchema = z.object({ payingEntityId: z.string().min(1).nullable() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem definir a fonte pagadora" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const { db, cid: CID } = getCampaignContext(session);

    const assignment = await db.churchAssignment.findUnique({
      where: { id: params.id },
      select: { member1PaidAt: true, member2PaidAt: true, church: { select: { campaignId: true } } },
    });
    if (!assignment || assignment.church.campaignId !== CID) {
      return NextResponse.json({ error: "Atribuição não encontrada" }, { status: 404 });
    }
    if (assignment.member1PaidAt || assignment.member2PaidAt) {
      return NextResponse.json({ error: "Não é possível trocar a fonte pagadora de uma entrega já paga" }, { status: 400 });
    }

    const { payingEntityId } = parsed.data;
    if (payingEntityId) {
      const entity = await db.payingEntity.findFirst({ where: { id: payingEntityId, campaignId: CID } });
      if (!entity) return NextResponse.json({ error: "Fonte pagadora não encontrada" }, { status: 404 });
    }

    await db.churchAssignment.update({ where: { id: params.id }, data: { payingEntityId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/church-assignments/:id/paying-entity] erro:", err);
    return NextResponse.json({ error: "Erro ao definir fonte pagadora" }, { status: 500 });
  }
}
