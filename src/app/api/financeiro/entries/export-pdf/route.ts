import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { buildSimpleTablePdf } from "@/lib/pdf-table";

export const maxDuration = 60;

const TYPE_LABEL: Record<string, string> = { DESPESA: "Despesa", RECEITA: "Receita" };
const STATUS_LABEL: Record<string, string> = { PAGO: "Pago", PENDENTE: "Pendente", AGENDADO: "Agendado" };
const METHOD_LABEL: Record<string, string> = {
  PIX: "PIX", DINHEIRO: "Dinheiro", TRANSFERENCIA: "Transferência",
  BOLETO: "Boleto", CARTAO: "Cartão", OUTRO: "Outro",
};

function fmtMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function GET(req: NextRequest) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const payingEntityId = searchParams.get("payingEntityId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { campaignId: gate.cid };
    if (type) where.type = type;
    if (status) where.status = status;
    if (payingEntityId === "DEFAULT") where.payingEntityId = null;
    else if (payingEntityId) where.payingEntityId = payingEntityId;

    const entries = await gate.db.financialEntry.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        supplier: { select: { name: true } },
        payingEntity: { select: { name: true } },
      },
    });

    let totalDespesas = 0, totalReceitas = 0;
    const rows = entries.map((e) => {
      if (e.type === "DESPESA") totalDespesas += e.amount; else totalReceitas += e.amount;
      return [
        e.date.toLocaleDateString("pt-BR"),
        TYPE_LABEL[e.type] ?? e.type,
        e.description,
        e.category ?? "",
        e.payingEntity?.name ?? "Padrão",
        e.supplier?.name ?? "",
        STATUS_LABEL[e.status] ?? e.status,
        e.paymentMethod ? METHOD_LABEL[e.paymentMethod] ?? e.paymentMethod : "",
        `${e.type === "RECEITA" ? "+" : "-"}${fmtMoney(e.amount)}`,
      ];
    });

    const pdfBuffer = await buildSimpleTablePdf({
      title: "Financeiro — Lançamentos",
      subtitle: `${entries.length} lançamento(s) — Despesas: ${fmtMoney(totalDespesas)} · Receitas: ${fmtMoney(totalReceitas)}`,
      columns: [
        { header: "Data", width: 55 },
        { header: "Tipo", width: 50 },
        { header: "Descrição", width: 150 },
        { header: "Categoria", width: 90 },
        { header: "Fonte pagadora", width: 110 },
        { header: "Fornecedor", width: 100 },
        { header: "Status", width: 55 },
        { header: "Forma pgto.", width: 70 },
        { header: "Valor", width: 70, align: "right" },
      ],
      rows,
      totalsRow: ["", "", "Total", "", "", "", "", "", `${fmtMoney(totalReceitas - totalDespesas)}`],
    });

    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="financeiro-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/financeiro/entries/export-pdf] erro:", err);
    return NextResponse.json({ error: "Erro ao exportar" }, { status: 500 });
  }
}
