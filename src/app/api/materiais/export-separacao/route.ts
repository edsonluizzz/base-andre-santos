import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { buildSimpleTablePdf } from "@/lib/pdf-table";
import { materialItemLabel, MATERIAL_CATALOG_MAP, type MaterialRequestItem } from "@/lib/material-catalog";
import type { MaterialRequestStatus } from "@prisma/client";

export const maxDuration = 60;

const VALID_STATUSES = new Set<MaterialRequestStatus>(["PENDENTE_APROVACAO", "APROVADO", "ENTREGUE", "RECUSADO"]);

/**
 * Relatório de separação: soma a quantidade de cada item across todas as
 * solicitações do status filtrado (padrão APROVADO — o que está de fato
 * aguardando ser separado/embalado pra envio), pra saber quanto pegar de
 * cada material no estoque de uma vez, em vez de abrir pedido por pedido.
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
      select: { items: true },
    });

    const totals = new Map<string, number>();
    for (const r of rows) {
      for (const it of r.items as unknown as MaterialRequestItem[]) {
        totals.set(it.item, (totals.get(it.item) ?? 0) + it.qty);
      }
    }

    const itemIds = Array.from(totals.keys()).sort((a, b) => materialItemLabel(a).localeCompare(materialItemLabel(b), "pt-BR"));
    const tableRows = itemIds.map((id) => [
      materialItemLabel(id),
      String(totals.get(id) ?? 0),
      MATERIAL_CATALOG_MAP[id]?.unidade ?? "unidades",
    ]);
    const grandTotal = itemIds.reduce((sum, id) => sum + (totals.get(id) ?? 0), 0);

    const pdfBuffer = await buildSimpleTablePdf({
      title: "Separação de Material de Campanha",
      subtitle: `${rows.length} solicitação(ões) — status: ${status}`,
      orientation: "portrait",
      columns: [
        { header: "Item", width: 260 },
        { header: "Quantidade total", width: 130, align: "right" },
        { header: "Unidade", width: 130 },
      ],
      rows: tableRows,
      totalsRow: ["TOTAL GERAL", String(grandTotal), ""],
    });

    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="separacao-material-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/materiais/export-separacao GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
