import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { getPaymentsReport } from "@/lib/church-payments";
import ExcelJS from "exceljs";

export const maxDuration = 60;

function fmtMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem exportar o financeiro" }, { status: 403 });
    }

    const { db, cid: CID } = getCampaignContext(session);
    const report = await getPaymentsReport(db, CID);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ovile Eleitoral";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Financeiro de Entregas", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: "Colaborador", key: "name", width: 30 },
      { header: "Entregas", key: "deliveredCount", width: 12 },
      { header: "Pagas", key: "paidCount", width: 10 },
      { header: "Pendentes", key: "pendingCount", width: 12 },
      { header: "Valor pendente", key: "amountPending", width: 18 },
      { header: "Valor pago", key: "amountPaid", width: 18 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A5C" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "FF2563EB" } } };
    });
    sheet.getRow(1).height = 22;

    report.collaborators.forEach((c, i) => {
      const row = sheet.addRow({
        name: c.name,
        deliveredCount: c.deliveredCount,
        paidCount: c.paidCount,
        pendingCount: c.pendingCount,
        amountPending: fmtMoney(c.amountPending),
        amountPaid: fmtMoney(c.amountPaid),
      });
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } };
        });
      }
    });

    const totalsRow = sheet.addRow({
      name: "Total",
      deliveredCount: "",
      paidCount: "",
      pendingCount: "",
      amountPending: fmtMoney(report.totals.amountPending),
      amountPaid: fmtMoney(report.totals.amountPaid),
    });
    totalsRow.font = { bold: true };

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().split("T")[0];

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="financeiro-entregas-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/church-assignments/payments/export] erro:", err);
    return NextResponse.json({ error: "Erro ao exportar financeiro" }, { status: 500 });
  }
}
