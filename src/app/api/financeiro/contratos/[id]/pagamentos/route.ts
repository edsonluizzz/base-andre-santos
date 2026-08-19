import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceAdmin } from "@/lib/finance-auth";

const createSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(["PIX", "DINHEIRO", "TRANSFERENCIA", "BOLETO", "CARTAO", "OUTRO"]).optional(),
  status: z.enum(["PAGO", "PENDENTE", "AGENDADO"]).default("PAGO"),
  date: z.string(),
  label: z.string().optional(), // ex: "Entrada", "Saldo" — vira parte da descrição do lançamento
});

/** Lançamentos de pagamento vinculados a um contrato (suporta múltiplos — ex.: entrada + saldo). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const contract = await gate.db.contract.findFirst({ where: { id: params.id, campaignId: gate.cid } });
    if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });

    const entries = await gate.db.financialEntry.findMany({
      where: { contractId: contract.id },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ data: entries });
  } catch (err) {
    console.error("[api/financeiro/contratos/:id/pagamentos GET] erro:", err);
    return NextResponse.json({ error: "Erro ao listar pagamentos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const body = parsed.data;

    const contract = await gate.db.contract.findFirst({ where: { id: params.id, campaignId: gate.cid } });
    if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });

    const description = `${contract.code} — ${body.label?.trim() || "Pagamento"}: ${contract.objectDescription.slice(0, 80)}`;

    const entry = await gate.db.financialEntry.create({
      data: {
        campaignId: gate.cid,
        type: "DESPESA",
        amount: body.amount,
        description,
        category: "Contratos",
        date: new Date(body.date),
        paymentMethod: body.paymentMethod,
        status: body.status,
        supplierId: contract.supplierId,
        payingEntityId: contract.payingEntityId,
        contractId: contract.id,
        createdById: gate.session.user.id,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("[api/financeiro/contratos/:id/pagamentos POST] erro:", err);
    return NextResponse.json({ error: "Erro ao registrar pagamento" }, { status: 500 });
  }
}
