import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceAdmin } from "@/lib/finance-auth";

const createSchema = z.object({
  name: z.string().min(1),
  document: z.string().optional(),
  category: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const suppliers = await gate.db.supplier.findMany({
      where: { campaignId: gate.cid },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: suppliers });
  } catch (err) {
    console.error("[api/financeiro/suppliers GET] erro:", err);
    return NextResponse.json({ error: "Erro ao listar fornecedores" }, { status: 500 });
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
    const supplier = await gate.db.supplier.create({
      data: { campaignId: gate.cid, ...parsed.data },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (err) {
    console.error("[api/financeiro/suppliers POST] erro:", err);
    return NextResponse.json({ error: "Erro ao criar fornecedor" }, { status: 500 });
  }
}
