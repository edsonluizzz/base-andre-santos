import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceAdmin } from "@/lib/finance-auth";

export const dynamic = "force-dynamic";

/**
 * Comparativo de receitas declaradas ao TSE (DivulgaCandContas) — a API pública
 * deles bloqueia chamadas de servidor/datacenter (confirmado: Vercel também toma
 * 403), então não dá pra consultar ao vivo daqui. Em vez disso, essa rota só lê o
 * último snapshot salvo em TseComparativoSnapshot (POST abaixo grava um novo,
 * buscado navegando de verdade no site da TSE).
 */
export async function GET(req: NextRequest) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const { searchParams } = new URL(req.url);
    const uf = (searchParams.get("uf") ?? "PR").toUpperCase();
    const cargo = Number(searchParams.get("cargo") ?? 7);
    const partido = Number(searchParams.get("partido") ?? 30);

    const snapshot = await gate.db.tseComparativoSnapshot.findUnique({
      where: { campaignId_uf_cargo_partido: { campaignId: gate.cid, uf, cargo, partido } },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Nenhum snapshot salvo ainda para esse cargo/partido/UF." }, { status: 404 });
    }

    return NextResponse.json({ uf, cargo, partido, fetchedAt: snapshot.fetchedAt, data: snapshot.data });
  } catch (err) {
    console.error("[api/financeiro/tse-comparativo GET] erro:", err);
    return NextResponse.json({ error: "Erro ao consultar snapshot" }, { status: 500 });
  }
}

const rowSchema = z.object({
  numero: z.number(),
  nome: z.string(),
  situacao: z.string().nullable().optional(),
  totalRecebido: z.number(),
  qtdRecebido: z.number().optional(),
  totalReceitaPF: z.number().optional(),
  totalReceitaPJ: z.number().optional(),
  totalPartidos: z.number().optional(),
  dataUltimaAtualizacaoContas: z.string().nullable().optional(),
});

const postSchema = z.object({
  uf: z.string().min(2).max(2),
  cargo: z.number(),
  partido: z.number(),
  data: z.array(rowSchema).min(1),
});

/** Grava um snapshot buscado manualmente (navegando de verdade no site da TSE). */
export async function POST(req: NextRequest) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { uf, cargo, partido, data } = parsed.data;
    const upperUf = uf.toUpperCase();

    const snapshot = await gate.db.tseComparativoSnapshot.upsert({
      where: { campaignId_uf_cargo_partido: { campaignId: gate.cid, uf: upperUf, cargo, partido } },
      create: { campaignId: gate.cid, uf: upperUf, cargo, partido, data },
      update: { data, fetchedAt: new Date() },
    });

    return NextResponse.json({ ok: true, fetchedAt: snapshot.fetchedAt });
  } catch (err) {
    console.error("[api/financeiro/tse-comparativo POST] erro:", err);
    return NextResponse.json({ error: "Erro ao salvar snapshot" }, { status: 500 });
  }
}
