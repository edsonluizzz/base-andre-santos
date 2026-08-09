import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { normalizeCnpj } from "@/lib/cnpj";

const createSchema = z.object({
  name: z.string().min(1),
  candidateName: z.string().optional(),
  office: z.string().optional(),
  party: z.string().optional(),
  electionYear: z.number().int().optional(),
  cnpj: z.string().optional(),
  razaoSocial: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cep: z.string().optional(),
  municipio: z.string().optional(),
  uf: z.string().max(2).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { db, cid: CID } = getCampaignContext(session);
    const entities = await db.payingEntity.findMany({
      where: { campaignId: CID },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: entities });
  } catch (err) {
    console.error("[api/paying-entities GET] erro:", err);
    return NextResponse.json({ error: "Erro ao listar fontes pagadoras" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem cadastrar fontes pagadoras" }, { status: 403 });
    }

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { db, cid: CID } = getCampaignContext(session);
    const { cnpj, ...rest } = parsed.data;

    const entity = await db.payingEntity.create({
      data: {
        campaignId: CID,
        ...rest,
        cnpj: cnpj ? normalizeCnpj(cnpj) : undefined,
      },
    });
    return NextResponse.json(entity, { status: 201 });
  } catch (err) {
    console.error("[api/paying-entities POST] erro:", err);
    return NextResponse.json({ error: "Erro ao criar fonte pagadora" }, { status: 500 });
  }
}
