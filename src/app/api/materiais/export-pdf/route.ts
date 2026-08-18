import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { buildSimpleTablePdf } from "@/lib/pdf-table";
import { formatDeliveryAddress } from "@/lib/termo-apoiador";
import { materialItemLabel, type MaterialRequestItem } from "@/lib/material-catalog";
import type { MaterialRequestStatus } from "@prisma/client";

export const maxDuration = 60;

const PDF_ROW_LIMIT = 3000;

const STATUS_LABEL: Record<string, string> = {
  PENDENTE_APROVACAO: "Pendente",
  APROVADO: "Aprovado",
  ENTREGUE: "Enviado",
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

    const total = await db.materialRequest.count({ where: { campaignId: cid, ...(status ? { status } : {}) } });
    const rows = await db.materialRequest.findMany({
      where: { campaignId: cid, ...(status ? { status } : {}) },
      select: {
        items: true, status: true, termSnapshotName: true, termSnapshotCpf: true, termAcceptedAt: true,
        deliveryCep: true, deliveryLogradouro: true, deliveryNumero: true,
        deliveryComplemento: true, deliveryBairro: true, deliveryMunicipio: true, deliveryUf: true,
        collaborator: { select: { phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PDF_ROW_LIMIT,
    });

    const tableRows = rows.map((r) => [
      r.termSnapshotName,
      r.termSnapshotCpf,
      r.collaborator.phone ?? "",
      formatDeliveryAddress(r) ?? "",
      (r.items as unknown as MaterialRequestItem[]).map((it) => `${it.qty}× ${materialItemLabel(it.item)}`).join(", "),
      STATUS_LABEL[r.status] ?? r.status,
      r.termAcceptedAt.toLocaleDateString("pt-BR"),
    ]);

    const pdfBuffer = await buildSimpleTablePdf({
      title: "Material de Campanha — Termos de Apoiador",
      subtitle: total > PDF_ROW_LIMIT
        ? `${total} solicitações no filtro — mostrando as ${PDF_ROW_LIMIT} mais recentes (ver export XLSX para a lista completa)`
        : `${total} solicitação(ões)`,
      columns: [
        { header: "Nome", width: 110 },
        { header: "CPF", width: 80 },
        { header: "Telefone", width: 80 },
        { header: "Endereço", width: 220 },
        { header: "Itens", width: 130 },
        { header: "Status", width: 60 },
        { header: "Aceito em", width: 65 },
      ],
      rows: tableRows,
    });

    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="material-campanha-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/materiais/export-pdf GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
