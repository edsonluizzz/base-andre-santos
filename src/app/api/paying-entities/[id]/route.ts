import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { normalizeCnpj } from "@/lib/cnpj";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  candidateName: z.string().nullable().optional(),
  office: z.string().nullable().optional(),
  party: z.string().nullable().optional(),
  electionYear: z.number().int().nullable().optional(),
  cnpj: z.string().nullable().optional(),
  razaoSocial: z.string().nullable().optional(),
  logradouro: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  complemento: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
  municipio: z.string().nullable().optional(),
  uf: z.string().max(2).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem editar fontes pagadoras" }, { status: 403 });
    }

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { db, cid: CID } = getCampaignContext(session);

    const existing = await db.payingEntity.findFirst({ where: { id: params.id, campaignId: CID } });
    if (!existing) return NextResponse.json({ error: "Fonte pagadora não encontrada" }, { status: 404 });

    const { cnpj, ...rest } = parsed.data;
    const entity = await db.payingEntity.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(cnpj !== undefined && { cnpj: cnpj ? normalizeCnpj(cnpj) : null }),
      },
    });
    return NextResponse.json(entity);
  } catch (err) {
    console.error("[api/paying-entities/:id PATCH] erro:", err);
    return NextResponse.json({ error: "Erro ao atualizar fonte pagadora" }, { status: 500 });
  }
}
