import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";

export async function GET(req: NextRequest) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const { searchParams } = new URL(req.url);
    const acctId = searchParams.get("acctId");
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { campaignId: gate.cid };
    if (acctId) where.acctId = acctId;
    if (status) where.status = status;

    const transactions = await gate.db.bankTransaction.findMany({
      where,
      orderBy: { postedAt: "desc" },
      include: {
        matchedEntry: {
          select: { id: true, description: true, amount: true, status: true, contract: { select: { code: true } } },
        },
      },
    });
    return NextResponse.json({ data: transactions });
  } catch (err) {
    console.error("[api/financeiro/extratos GET] erro:", err);
    return NextResponse.json({ error: "Erro ao listar extrato" }, { status: 500 });
  }
}
