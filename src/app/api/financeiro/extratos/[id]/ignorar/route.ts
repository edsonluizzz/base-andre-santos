import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const tx = await gate.db.bankTransaction.findFirst({ where: { id: params.id, campaignId: gate.cid } });
    if (!tx) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });

    const updated = await gate.db.bankTransaction.update({
      where: { id: tx.id },
      data: { status: "IGNORED", matchedEntryId: null },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[api/financeiro/extratos/:id/ignorar POST] erro:", err);
    return NextResponse.json({ error: "Erro ao ignorar transação" }, { status: 500 });
  }
}
