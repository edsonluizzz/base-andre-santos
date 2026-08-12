import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { formatCnpj } from "@/lib/cnpj";
import { formatCpf } from "@/lib/cpf";
import { buildSimpleTablePdf } from "@/lib/pdf-table";

export const maxDuration = 60;

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

    let total = 0;
    const rows = receipts.map((r) => {
      total += r.amount;
      const cnpj = r.payingEntity?.cnpj ?? settings?.cnpj;
      return [
        r.createdAt.toLocaleDateString("pt-BR"),
        r.collaborator.name,
        r.collaborator.cpf ? formatCpf(r.collaborator.cpf) : "Não cadastrado",
        r.paymentMethod ? METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod : "Não informado",
        r.payingEntity?.name ?? r.payingEntity?.razaoSocial ?? settings?.razaoSocial ?? "Padrão (candidato da campanha)",
        cnpj ? formatCnpj(cnpj) : "",
        fmtMoney(r.amount),
      ];
    });

    const pdfBuffer = await buildSimpleTablePdf({
      title: "Cabos Eleitorais — Prestação de Contas TSE",
      subtitle: `${receipts.length} recibo(s) — Total: ${fmtMoney(total)}`,
      columns: [
        { header: "Data", width: 60 },
        { header: "Nome completo", width: 160 },
        { header: "CPF", width: 90 },
        { header: "Forma de pagamento", width: 90 },
        { header: "Fonte pagadora", width: 160 },
        { header: "CNPJ", width: 100 },
        { header: "Valor", width: 80, align: "right" },
      ],
      rows,
      totalsRow: ["", "Total", "", "", "", "", fmtMoney(total)],
    });

    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cabos-eleitorais-tse-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/financeiro/cabos-eleitorais/export-pdf] erro:", err);
    return NextResponse.json({ error: "Erro ao exportar" }, { status: 500 });
  }
}
