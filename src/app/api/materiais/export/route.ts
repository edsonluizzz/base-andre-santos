import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { formatDeliveryAddress } from "@/lib/termo-apoiador";
import { materialItemLabel, type MaterialRequestItem } from "@/lib/material-catalog";
import type { MaterialRequestStatus } from "@prisma/client";

export const maxDuration = 60;

const STATUS_LABEL: Record<string, string> = {
  PENDENTE_APROVACAO: "Pendente de aprovação",
  APROVADO: "Aprovado",
  ENTREGUE: "Entregue",
  RECUSADO: "Recusado",
};
const VALID_STATUSES = new Set<MaterialRequestStatus>(["PENDENTE_APROVACAO", "APROVADO", "ENTREGUE", "RECUSADO"]);

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { db, cid } = getCampaignContext(session);
    const statusParam = new URL(req.url).searchParams.get("status") ?? "";
    const status = VALID_STATUSES.has(statusParam as MaterialRequestStatus) ? (statusParam as MaterialRequestStatus) : undefined;

    const rows = await db.materialRequest.findMany({
      where: { campaignId: cid, ...(status ? { status } : {}) },
      select: {
        items: true, status: true, pdfUrl: true,
        termSnapshotName: true, termSnapshotCpf: true, termAcceptedAt: true,
        deliveryCep: true, deliveryLogradouro: true, deliveryNumero: true,
        deliveryComplemento: true, deliveryBairro: true, deliveryMunicipio: true, deliveryUf: true,
        emailStatus: true, whatsappStatus: true,
        approvedAt: true, deliveredAt: true, notes: true, createdAt: true,
        collaborator: { select: { phone: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
        deliveredBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ovile Eleitoral";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Material de Campanha", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
      { header: "Nome", key: "name", width: 28 },
      { header: "CPF", key: "cpf", width: 16 },
      { header: "Telefone", key: "phone", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "CEP", key: "cep", width: 12 },
      { header: "Endereço", key: "address", width: 45 },
      { header: "Itens", key: "items", width: 40 },
      { header: "Status", key: "status", width: 22 },
      { header: "Aceito em", key: "acceptedAt", width: 18 },
      { header: "Aprovado por", key: "approvedBy", width: 22 },
      { header: "Aprovado em", key: "approvedAt", width: 18 },
      { header: "Enviado/Entregue por", key: "deliveredBy", width: 22 },
      { header: "Enviado/Entregue em", key: "deliveredAt", width: 18 },
      { header: "Email termo", key: "emailStatus", width: 14 },
      { header: "WhatsApp termo", key: "whatsappStatus", width: 14 },
      { header: "Termo (PDF)", key: "pdfUrl", width: 45 },
      { header: "Observações", key: "notes", width: 30 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A5C" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    sheet.getRow(1).height = 22;

    rows.forEach((r, i) => {
      const items = (r.items as unknown as MaterialRequestItem[])
        .map((it) => `${it.qty}× ${materialItemLabel(it.item)}`)
        .join(", ");
      const row = sheet.addRow({
        name: r.termSnapshotName,
        cpf: r.termSnapshotCpf,
        phone: r.collaborator.phone ?? "",
        email: r.collaborator.email ?? "",
        cep: r.deliveryCep ?? "",
        address: formatDeliveryAddress(r) ?? "",
        items,
        status: STATUS_LABEL[r.status] ?? r.status,
        acceptedAt: r.termAcceptedAt.toLocaleString("pt-BR"),
        approvedBy: r.approvedBy?.name ?? r.approvedBy?.email ?? "",
        approvedAt: r.approvedAt ? r.approvedAt.toLocaleString("pt-BR") : "",
        deliveredBy: r.deliveredBy?.name ?? r.deliveredBy?.email ?? "",
        deliveredAt: r.deliveredAt ? r.deliveredAt.toLocaleString("pt-BR") : "",
        emailStatus: r.emailStatus,
        whatsappStatus: r.whatsappStatus,
        pdfUrl: r.pdfUrl ?? "",
        notes: r.notes ?? "",
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
        "Content-Disposition": `attachment; filename="material-campanha-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/materiais/export GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
