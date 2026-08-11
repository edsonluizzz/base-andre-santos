import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceAdmin } from "@/lib/finance-auth";

const createSchema = z.object({
  type: z.enum(["DESPESA", "RECEITA"]),
  amount: z.number().positive(),
  description: z.string().min(1),
  category: z.string().optional(),
  date: z.string(), // ISO date
  paymentMethod: z.enum(["PIX", "DINHEIRO", "TRANSFERENCIA", "BOLETO", "CARTAO", "OUTRO"]).optional(),
  status: z.enum(["PAGO", "PENDENTE", "AGENDADO"]).optional(),
  supplierId: z.string().optional(),
  payingEntityId: z.string().nullable().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const payingEntityId = searchParams.get("payingEntityId"); // "DEFAULT" = fonte padrão (null)
    const supplierId = searchParams.get("supplierId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { campaignId: gate.cid };
    if (type) where.type = type;
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (payingEntityId === "DEFAULT") where.payingEntityId = null;
    else if (payingEntityId) where.payingEntityId = payingEntityId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const entries = await gate.db.financialEntry.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        payingEntity: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ data: entries });
  } catch (err) {
    console.error("[api/financeiro/entries GET] erro:", err);
    return NextResponse.json({ error: "Erro ao listar lançamentos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { date, ...rest } = parsed.data;
    const entry = await gate.db.financialEntry.create({
      data: {
        campaignId: gate.cid,
        createdById: gate.session.user.id,
        date: new Date(date),
        ...rest,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("[api/financeiro/entries POST] erro:", err);
    return NextResponse.json({ error: "Erro ao criar lançamento" }, { status: 500 });
  }
}
