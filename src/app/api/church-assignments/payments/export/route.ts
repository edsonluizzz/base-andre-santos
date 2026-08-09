import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { getPaymentsReport } from "@/lib/church-payments";
import { formatCnpj } from "@/lib/cnpj";
import ExcelJS from "exceljs";

export const maxDuration = 60;

function fmtMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem exportar o financeiro" }, { status: 403 });
    }

    const { db, cid: CID } = getCampaignContext(session);
    const payingEntityId = new URL(req.url).searchParams.get("payingEntityId") ?? undefined;
    const report = await getPaymentsReport(db, CID, payingEntityId);

    let payerLabel = "Todas as fontes (consolidado)";
    if (payingEntityId === "DEFAULT") {
      const settings = await db.settings.findUnique({ where: { id: "singleton" }, select: { razaoSocial: true, cnpj: true } });
      payerLabel = [settings?.razaoSocial, settings?.cnpj ? `CNPJ ${formatCnpj(settings.cnpj)}` : null].filter(Boolean).join(" — ") || "Padrão (candidato da campanha)";
    } else if (payingEntityId) {
      const entity = await db.payingEntity.findUnique({ where: { id: payingEntityId }, select: { name: true, razaoSocial: true, cnpj: true } });
      payerLabel = [entity?.name, entity?.razaoSocial, entity?.cnpj ? `CNPJ ${formatCnpj(entity.cnpj)}` : null].filter(Boolean).join(" — ") || "Fonte não encontrada";
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ovile Eleitoral";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Financeiro de Entregas", {
      views: [{ state: "frozen", ySplit: 4 }],
    });

    sheet.columns = [
      { key: "name", width: 30 },
      { key: "deliveredCount", width: 12 },
      { key: "paidCount", width: 10 },
      { key: "pendingCount", width: 12 },
      { key: "amountPending", width: 18 },
      { key: "amountPaid", width: 18 },
    ];

    sheet.addRow(["Relatório de Pagamentos — Cabos Eleitorais"]).font = { bold: true, size: 12 };
    sheet.addRow([`Fonte pagadora: ${payerLabel}`]).font = { italic: true, size: 10, color: { argb: "FF666666" } };
    sheet.addRow([]);

    const headerRow = sheet.addRow(["Colaborador", "Entregas", "Pagas", "Pendentes", "Valor pendente", "Valor pago"]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A5C" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "FF2563EB" } } };
    });
    headerRow.height = 22;
    const headerRowNumber = headerRow.number;

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
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: sheet.columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().split("T")[0];
    const suffix = payingEntityId ? `-${payingEntityId.toLowerCase()}` : "";

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="financeiro-entregas${suffix}-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/church-assignments/payments/export] erro:", err);
    return NextResponse.json({ error: "Erro ao exportar financeiro" }, { status: 500 });
  }
}
