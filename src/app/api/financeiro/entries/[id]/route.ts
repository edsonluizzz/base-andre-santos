import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceAdmin } from "@/lib/finance-auth";

const updateSchema = z.object({
  type: z.enum(["DESPESA", "RECEITA"]).optional(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  date: z.string().optional(),
  paymentMethod: z.enum(["PIX", "DINHEIRO", "TRANSFERENCIA", "BOLETO", "CARTAO", "OUTRO"]).nullable().optional(),
  status: z.enum(["PAGO", "PENDENTE", "AGENDADO"]).optional(),
  supplierId: z.string().nullable().optional(),
  payingEntityId: z.string().nullable().optional(),
  contractId: z.string().nullable().optional(),
  receiptUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const existing = await gate.db.financialEntry.findFirst({ where: { id: params.id, campaignId: gate.cid } });
    if (!existing) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });

    const { date, ...rest } = parsed.data;
    const entry = await gate.db.financialEntry.update({
      where: { id: params.id },
      data: { ...rest, ...(date !== undefined && { date: new Date(date) }) },
    });
    return NextResponse.json(entry);
  } catch (err) {
    console.error("[api/financeiro/entries/:id PATCH] erro:", err);
    return NextResponse.json({ error: "Erro ao atualizar lançamento" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const existing = await gate.db.financialEntry.findFirst({ where: { id: params.id, campaignId: gate.cid } });
    if (!existing) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });

    await gate.db.financialEntry.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/financeiro/entries/:id DELETE] erro:", err);
    return NextResponse.json({ error: "Erro ao excluir lançamento" }, { status: 500 });
  }
}
