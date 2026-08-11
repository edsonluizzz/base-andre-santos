import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { markAssignmentMemberPaid } from "@/lib/church-payments";
import { generateAndSendReceipt } from "@/lib/receipts";

const bodySchema = z.object({
  deliveredAt: z.string().min(1), // ISO date
  payingEntityId: z.string().min(1).nullable().optional(),
  markPaid: z.boolean().optional(),
});

/**
 * Registro manual de entrega pelo admin — pra quando a confirmação com foto
 * pelo colaborador não é prática (ex: lançamento retroativo de várias entregas
 * de uma vez). Marca ENTREGUE com data escolhida e, opcionalmente, já paga.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem registrar entrega manualmente" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { deliveredAt, payingEntityId, markPaid } = parsed.data;

    const { db, cid: CID } = getCampaignContext(session);

    const assignment = await db.churchAssignment.findFirst({
      where: { id: params.id, church: { campaignId: CID } },
      select: { id: true, member1Id: true, member2Id: true },
    });
    if (!assignment) return NextResponse.json({ error: "Atribuição não encontrada" }, { status: 404 });

    if (payingEntityId) {
      const entity = await db.payingEntity.findFirst({ where: { id: payingEntityId, campaignId: CID } });
      if (!entity) return NextResponse.json({ error: "Fonte pagadora não encontrada" }, { status: 404 });
    }

    await db.churchAssignment.update({
      where: { id: assignment.id },
      data: {
        status: "ENTREGUE",
        deliveredAt: new Date(deliveredAt),
        payingEntityId: payingEntityId ?? null,
        notes: null,
      },
    });

    if (markPaid) {
      const r1 = await markAssignmentMemberPaid(db, assignment.id, "member1", CID);
      if (r1.ok && !r1.alreadyPaid) {
        await generateAndSendReceipt(db, assignment.member1Id, [assignment.id], CID, payingEntityId ?? null, session.user.id);
      }
      if (assignment.member2Id) {
        const r2 = await markAssignmentMemberPaid(db, assignment.id, "member2", CID);
        if (r2.ok && !r2.alreadyPaid) {
          await generateAndSendReceipt(db, assignment.member2Id, [assignment.id], CID, payingEntityId ?? null, session.user.id);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/church-assignments/:id/register] erro:", err);
    return NextResponse.json({ error: "Erro ao registrar entrega" }, { status: 500 });
  }
}
