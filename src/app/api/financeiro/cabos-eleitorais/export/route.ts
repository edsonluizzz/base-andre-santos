import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { formatCnpj } from "@/lib/cnpj";
import { formatCpf } from "@/lib/cpf";

const METHOD_LABEL: Record<string, string> = {
  PIX: "PIX", DINHEIRO: "Dinheiro", TRANSFERENCIA: "Transferência",
  BOLETO: "Boleto", CARTAO: "Cartão", OUTRO: "Outro",
};

function fmtMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Export padrão pra prestação de contas TSE (SPCE) — uma linha por recibo
 * eleitoral pago a cabo eleitoral: data, nome, CPF, valor, forma de
 * pagamento, fonte pagadora (CNPJ), nº do recibo.
 */
export async function GET(req: NextRequest) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const payingEntityId = new URL(req.url).searchParams.get("payingEntityId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { collaborator: { campaignId: gate.cid } };
    if (payingEntityId === "DEFAULT") where.payingEntityId = null;
    else if (payingEntityId) where.payingEntityId = payingEntityId;

    const [receipts, settings] = await Promise.all([
      gate.db.paymentReceipt.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          collaborator: { select: { name: true, cpf: true } },
          payingEntity: { select: { name: true, razaoSocial: true, cnpj: true } },
        },
      }),
      gate.db.settings.findUnique({ where: { id: "singleton" }, select: { razaoSocial: true, cnpj: true } }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ovile Eleitoral";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Cabos Eleitorais (TSE)", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
      { header: "Data", key: "date", width: 12 },
      { header: "Nome completo", key: "name", width: 32 },
      { header: "CPF", key: "cpf", width: 16 },
      { header: "Valor", key: "amount", width: 15 },
      { header: "Forma de pagamento", key: "paymentMethod", width: 18 },
      { header: "Fonte pagadora", key: "payingEntity", width: 30 },
      { header: "CNPJ da fonte pagadora", key: "payingEntityCnpj", width: 22 },
      { header: "Nº do recibo", key: "receiptId", width: 16 },
      { header: "Entregas", key: "deliveryCount", width: 10 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A5C" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "FF2563EB" } } };
    });
    sheet.getRow(1).height = 22;

    let total = 0;
    receipts.forEach((r, i) => {
      total += r.amount;
      const cnpj = r.payingEntity?.cnpj ?? settings?.cnpj;
      const row = sheet.addRow({
        date: r.createdAt.toLocaleDateString("pt-BR"),
        name: r.collaborator.name,
        cpf: r.collaborator.cpf ? formatCpf(r.collaborator.cpf) : "Não cadastrado",
        amount: fmtMoney(r.amount),
        paymentMethod: r.paymentMethod ? METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod : "Não informado",
        payingEntity: r.payingEntity?.name ?? r.payingEntity?.razaoSocial ?? settings?.razaoSocial ?? "Padrão (candidato da campanha)",
        payingEntityCnpj: cnpj ? formatCnpj(cnpj) : "",
        receiptId: r.id.slice(-8).toUpperCase(),
        deliveryCount: r.assignmentIds.length,
      });
      if (i % 2 === 1) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } }; });
    });

    const totalsRow = sheet.addRow({
      date: "", name: "Total", cpf: "", amount: fmtMoney(total), paymentMethod: "",
      payingEntity: "", payingEntityCnpj: "", receiptId: "", deliveryCount: "",
    });
    totalsRow.font = { bold: true };

    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().split("T")[0];

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="cabos-eleitorais-tse-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/financeiro/cabos-eleitorais/export] erro:", err);
    return NextResponse.json({ error: "Erro ao exportar" }, { status: 500 });
  }
}
