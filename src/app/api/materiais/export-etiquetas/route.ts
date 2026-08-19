import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { materialItemLabel, type MaterialRequestItem } from "@/lib/material-catalog";
import type { MaterialRequestStatus } from "@prisma/client";

export const maxDuration = 60;

const VALID_STATUSES = new Set<MaterialRequestStatus>(["PENDENTE_APROVACAO", "APROVADO", "ENTREGUE", "RECUSADO"]);

/**
 * Planilha de etiquetas pra envio pelo Correios — uma linha por solicitação,
 * colunas separadas (não endereço já formatado numa string só) pra poder
 * importar direto na ferramenta Etiqueta Fácil dos Correios ou em qualquer
 * mala direta (Word/Google Docs).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { db, cid } = getCampaignContext(session);
    const statusParam = new URL(req.url).searchParams.get("status") ?? "APROVADO";
    const status = VALID_STATUSES.has(statusParam as MaterialRequestStatus) ? (statusParam as MaterialRequestStatus) : "APROVADO";

    const rows = await db.materialRequest.findMany({
      where: { campaignId: cid, status },
      select: {
        items: true, termSnapshotName: true,
        deliveryCep: true, deliveryLogradouro: true, deliveryNumero: true,
        deliveryComplemento: true, deliveryBairro: true, deliveryMunicipio: true, deliveryUf: true,
        collaborator: { select: { phone: true } },
      },
      orderBy: { deliveryCep: "asc" },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ovile Eleitoral";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Etiquetas", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
      { header: "Nome", key: "name", width: 28 },
      { header: "CEP", key: "cep", width: 12 },
      { header: "Endereço", key: "logradouro", width: 32 },
      { header: "Número", key: "numero", width: 10 },
      { header: "Complemento", key: "complemento", width: 18 },
      { header: "Bairro", key: "bairro", width: 20 },
      { header: "Cidade", key: "cidade", width: 20 },
      { header: "UF", key: "uf", width: 6 },
      { header: "Telefone", key: "phone", width: 16 },
      { header: "Itens (conferência)", key: "items", width: 35 },
    ];
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A5C" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    sheet.getRow(1).height = 22;

    rows.forEach((r, i) => {
      const items = (r.items as unknown as MaterialRequestItem[]).map((it) => `${it.qty}× ${materialItemLabel(it.item)}`).join(", ");
      const row = sheet.addRow({
        name: r.termSnapshotName,
        cep: r.deliveryCep ?? "",
        logradouro: r.deliveryLogradouro ?? "",
        numero: r.deliveryNumero ?? "",
        complemento: r.deliveryComplemento ?? "",
        bairro: r.deliveryBairro ?? "",
        cidade: r.deliveryMunicipio ?? "",
        uf: r.deliveryUf ?? "",
        phone: r.collaborator.phone ?? "",
        items,
      });
      if (i % 2 === 1) {
        row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } }; });
      }
    });

    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="etiquetas-correio-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/materiais/export-etiquetas GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
