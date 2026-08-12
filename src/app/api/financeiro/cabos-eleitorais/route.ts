import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { formatCnpj } from "@/lib/cnpj";
import { formatCpf } from "@/lib/cpf";

/**
 * Lista de pagamentos a cabos eleitorais (um recibo = uma linha), no formato
 * usado pra prestação de contas TSE (SPCE): data, nome, CPF, valor, forma de
 * pagamento, fonte pagadora. Reaproveita PaymentReceipt (já é o documento
 * legal "recibo eleitoral" gerado por src/lib/receipts.ts).
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

    const data = receipts.map((r) => ({
      id: r.id,
      date: r.createdAt.toISOString(),
      collaboratorName: r.collaborator.name,
      collaboratorCpf: r.collaborator.cpf ? formatCpf(r.collaborator.cpf) : null,
      amount: r.amount,
      deliveryCount: r.assignmentIds.length,
      paymentMethod: r.paymentMethod,
      payingEntityName: r.payingEntity?.name ?? r.payingEntity?.razaoSocial ?? settings?.razaoSocial ?? "Padrão (candidato da campanha)",
      payingEntityCnpj: (r.payingEntity?.cnpj ?? settings?.cnpj) ? formatCnpj((r.payingEntity?.cnpj ?? settings?.cnpj)!) : null,
      pdfUrl: r.pdfUrl,
    }));

    const totals = data.reduce((acc, r) => acc + r.amount, 0);

    return NextResponse.json({ data, totals: { amount: totals, count: data.length } });
  } catch (err) {
    console.error("[api/financeiro/cabos-eleitorais] erro:", err);
    return NextResponse.json({ error: "Erro ao listar pagamentos" }, { status: 500 });
  }
}
