import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceAdmin } from "@/lib/finance-auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  document: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
  logradouro: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  complemento: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  municipio: z.string().nullable().optional(),
  uf: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const existing = await gate.db.supplier.findFirst({ where: { id: params.id, campaignId: gate.cid } });
    if (!existing) return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 });

    const supplier = await gate.db.supplier.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json(supplier);
  } catch (err) {
    console.error("[api/financeiro/suppliers/:id PATCH] erro:", err);
    return NextResponse.json({ error: "Erro ao atualizar fornecedor" }, { status: 500 });
  }
}
