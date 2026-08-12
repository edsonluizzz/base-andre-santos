import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { getPaymentsReport } from "@/lib/church-payments";
import { formatCnpj } from "@/lib/cnpj";
import { buildSimpleTablePdf } from "@/lib/pdf-table";

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

    const rows = report.collaborators.map((c) => [
      c.name,
      String(c.deliveredCount),
      String(c.paidCount),
      String(c.pendingCount),
      fmtMoney(c.amountPending),
      fmtMoney(c.amountPaid),
    ]);

    const pdfBuffer = await buildSimpleTablePdf({
      title: "Pagamentos — Cabos Eleitorais",
      subtitle: `Fonte pagadora: ${payerLabel} — Total pago: ${fmtMoney(report.totals.amountPaid)} · Pendente: ${fmtMoney(report.totals.amountPending)}`,
      orientation: "portrait",
      columns: [
        { header: "Colaborador", width: 190 },
        { header: "Entregas", width: 60, align: "right" },
        { header: "Pagas", width: 60, align: "right" },
        { header: "Pendentes", width: 60, align: "right" },
        { header: "Valor pendente", width: 80, align: "right" },
        { header: "Valor pago", width: 80, align: "right" },
      ],
      rows,
      totalsRow: ["Total", "", "", "", fmtMoney(report.totals.amountPending), fmtMoney(report.totals.amountPaid)],
    });

    const date = new Date().toISOString().split("T")[0];
    const suffix = payingEntityId ? `-${payingEntityId.toLowerCase()}` : "";
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="financeiro-entregas${suffix}-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/church-assignments/payments/export-pdf] erro:", err);
    return NextResponse.json({ error: "Erro ao exportar financeiro" }, { status: 500 });
  }
}
