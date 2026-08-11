import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireFinanceAdmin } from "@/lib/finance-auth";

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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ovile Eleitoral";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Financeiro", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
      { header: "Data", key: "date", width: 12 },
      { header: "Tipo", key: "type", width: 10 },
      { header: "Descrição", key: "description", width: 35 },
      { header: "Categoria", key: "category", width: 20 },
      { header: "Fonte Pagadora", key: "payingEntity", width: 25 },
      { header: "Fornecedor", key: "supplier", width: 25 },
      { header: "Status", key: "status", width: 12 },
      { header: "Forma de Pagamento", key: "paymentMethod", width: 18 },
      { header: "Valor", key: "amount", width: 15 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A5C" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "FF2563EB" } } };
    });
    sheet.getRow(1).height = 22;

    let totalDespesas = 0, totalReceitas = 0;
    entries.forEach((e, i) => {
      if (e.type === "DESPESA") totalDespesas += e.amount; else totalReceitas += e.amount;
      const row = sheet.addRow({
        date: e.date.toLocaleDateString("pt-BR"),
        type: TYPE_LABEL[e.type] ?? e.type,
        description: e.description,
        category: e.category ?? "",
        payingEntity: e.payingEntity?.name ?? "Padrão (candidato da campanha)",
        supplier: e.supplier?.name ?? "",
        status: STATUS_LABEL[e.status] ?? e.status,
        paymentMethod: e.paymentMethod ? METHOD_LABEL[e.paymentMethod] ?? e.paymentMethod : "",
        amount: fmtMoney(e.amount),
      });
      if (i % 2 === 1) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } }; });
    });

    const totalsRow = sheet.addRow({
      date: "", type: "", description: "Total", category: "", payingEntity: "", supplier: "", status: "",
      paymentMethod: `Despesas: ${fmtMoney(totalDespesas)}`, amount: `Receitas: ${fmtMoney(totalReceitas)}`,
    });
    totalsRow.font = { bold: true };

    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().split("T")[0];

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="financeiro-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/financeiro/entries/export] erro:", err);
    return NextResponse.json({ error: "Erro ao exportar financeiro" }, { status: 500 });
  }
}
