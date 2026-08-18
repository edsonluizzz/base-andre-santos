import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const existing = await gate.db.paymentReceipt.findFirst({
      where: { id: params.id, collaborator: { campaignId: gate.cid } },
    });
    if (!existing) return NextResponse.json({ error: "Recibo não encontrado" }, { status: 404 });

    await gate.db.paymentReceipt.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/payment-receipts/:id DELETE] erro:", err);
    return NextResponse.json({ error: "Erro ao excluir recibo" }, { status: 500 });
  }
}
