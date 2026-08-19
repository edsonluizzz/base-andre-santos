import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { inferPaymentMethod } from "@/lib/ofx";

const bodySchema = z.object({
  financialEntryId: z.string().optional(), // se omitido, confirma a sugestão já calculada no import
});

/** Confirma (ou define manualmente) o vínculo entre uma transação do extrato e um lançamento pendente. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }

    const tx = await gate.db.bankTransaction.findFirst({ where: { id: params.id, campaignId: gate.cid } });
    if (!tx) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });

    const entryId = parsed.data.financialEntryId || tx.matchedEntryId;
    if (!entryId) return NextResponse.json({ error: "Nenhum lançamento informado nem sugerido" }, { status: 400 });

    const entry = await gate.db.financialEntry.findFirst({ where: { id: entryId, campaignId: gate.cid } });
    if (!entry) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });

    await gate.db.$transaction(async (t) => {
      await t.bankTransaction.update({
        where: { id: tx.id },
        data: { status: "MATCHED", matchedEntryId: entryId },
      });
      await t.financialEntry.update({
        where: { id: entryId },
        data: {
          status: "PAGO",
          date: tx.postedAt,
          paymentMethod: entry.paymentMethod ?? inferPaymentMethod(tx.name),
        },
      });
    }, { timeout: 30000 });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const isUniqueConflict = typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
    if (isUniqueConflict) {
      return NextResponse.json({ error: "Esse lançamento já está vinculado a outra transação do extrato" }, { status: 409 });
    }
    console.error("[api/financeiro/extratos/:id/vincular POST] erro:", err);
    return NextResponse.json({ error: "Erro ao vincular transação" }, { status: 500 });
  }
}
