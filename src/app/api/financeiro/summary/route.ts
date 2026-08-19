import { NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";

export async function GET() {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const entries = await gate.db.financialEntry.findMany({
      where: { campaignId: gate.cid },
      select: {
        id: true, type: true, amount: true, status: true, category: true, date: true,
        payingEntityId: true, payingEntity: { select: { name: true } },
      },
    });

    let totalReceitasPago = 0, totalDespesasPago = 0;
    let totalPendente = 0, totalAgendado = 0;
    const byPayingEntity = new Map<string, { name: string; despesas: number; receitas: number }>();
    const byCategory = new Map<string, { despesas: number; receitas: number }>();
    const byMonth = new Map<string, { despesas: number; receitas: number }>();

    for (const e of entries) {
      if (e.status === "PAGO") {
        if (e.type === "RECEITA") totalReceitasPago += e.amount;
        else totalDespesasPago += e.amount;
      } else if (e.status === "PENDENTE") {
        totalPendente += e.amount;
      } else if (e.status === "AGENDADO") {
        totalAgendado += e.amount;
      }

      const peKey = e.payingEntityId ?? "DEFAULT";
      const peRow = byPayingEntity.get(peKey) ?? { name: e.payingEntity?.name ?? "Padrão (candidato da campanha)", despesas: 0, receitas: 0 };
      if (e.type === "DESPESA") peRow.despesas += e.amount; else peRow.receitas += e.amount;
      byPayingEntity.set(peKey, peRow);

      const catKey = e.category ?? "Sem categoria";
      const catRow = byCategory.get(catKey) ?? { despesas: 0, receitas: 0 };
      if (e.type === "DESPESA") catRow.despesas += e.amount; else catRow.receitas += e.amount;
      byCategory.set(catKey, catRow);

      const monthKey = e.date.toISOString().slice(0, 7); // YYYY-MM
      const monthRow = byMonth.get(monthKey) ?? { despesas: 0, receitas: 0 };
      if (e.type === "DESPESA") monthRow.despesas += e.amount; else monthRow.receitas += e.amount;
      byMonth.set(monthKey, monthRow);
    }

    const [bankAccounts, unmatchedCount] = await Promise.all([
      gate.db.bankAccountBalance.findMany({ where: { campaignId: gate.cid }, orderBy: { acctId: "asc" } }),
      gate.db.bankTransaction.count({ where: { campaignId: gate.cid, status: "UNMATCHED" } }),
    ]);

    return NextResponse.json({
      saldo: totalReceitasPago - totalDespesasPago,
      totalReceitasPago,
      totalDespesasPago,
      totalPendente,
      totalAgendado,
      totalLancamentos: entries.length,
      byPayingEntity: Array.from(byPayingEntity.entries()).map(([id, v]) => ({ payingEntityId: id === "DEFAULT" ? null : id, ...v })),
      byCategory: Array.from(byCategory.entries()).map(([category, v]) => ({ category, ...v })),
      byMonth: Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v })),
      bankAccounts: bankAccounts.map((b) => ({ acctId: b.acctId, balance: b.balance, asOf: b.asOf })),
      saldoContas: bankAccounts.reduce((sum, b) => sum + b.balance, 0),
      extratoNaoConciliado: unmatchedCount,
    });
  } catch (err) {
    console.error("[api/financeiro/summary] erro:", err);
    return NextResponse.json({ error: "Erro ao gerar resumo financeiro" }, { status: 500 });
  }
}
