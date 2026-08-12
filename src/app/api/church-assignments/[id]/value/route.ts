import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

const bodySchema = z.object({ paymentValue: z.number().positive().nullable() });

/**
 * Sobrescreve o valor por membro pago nesta entrega (null = volta a usar o
 * padrão global de Settings.deliveryPaymentValue). Só antes de pagar —
 * depois de pago o valor já virou PaymentReceipt.amount, imutável.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem definir o valor do pagamento" }, { status: 403 });
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
      return NextResponse.json({ error: "Não é possível alterar o valor de uma entrega já paga" }, { status: 400 });
    }

    await db.churchAssignment.update({ where: { id: params.id }, data: { paymentValue: parsed.data.paymentValue } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/church-assignments/:id/value] erro:", err);
    return NextResponse.json({ error: "Erro ao definir valor do pagamento" }, { status: 500 });
  }
}
