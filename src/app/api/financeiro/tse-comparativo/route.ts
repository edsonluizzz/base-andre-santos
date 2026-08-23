import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { listarCandidatos, consultarContas, CARGO } from "@/lib/tse-contas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Comparativo de receitas declaradas ao TSE — candidatos de um cargo/partido/UF,
 * consultado ao vivo no DivulgaCandContas (sem cache local, dados "ao vivo" na
 * medida em que o próprio TSE atualiza, que costuma ser diário durante a campanha).
 */
export async function GET(req: NextRequest) {
  const gate = await requireFinanceAdmin();
  if (!gate.ok) return gate.response;
  try {
    const { searchParams } = new URL(req.url);
    const uf = (searchParams.get("uf") ?? "PR").toUpperCase();
    const cargo = Number(searchParams.get("cargo") ?? CARGO.DEPUTADO_ESTADUAL);
    const partido = Number(searchParams.get("partido") ?? 30); // 30 = NOVO
    const destaqueNumero = searchParams.get("destaque") ? Number(searchParams.get("destaque")) : undefined;

    const candidatos = await listarCandidatos(uf, cargo, partido);

    const comContas = await Promise.all(
      candidatos.map(async (c) => {
        const contas = await consultarContas(uf, cargo, partido, c.numero, c.id);
        return {
          numero: c.numero,
          nome: c.nomeUrna,
          situacao: c.descricaoTotalizacao ?? c.descricaoSituacao,
          destaque: destaqueNumero != null && c.numero === destaqueNumero,
          contas,
        };
      }),
    );

    comContas.sort((a, b) => (b.contas?.totalRecebido ?? 0) - (a.contas?.totalRecebido ?? 0));

    return NextResponse.json({
      uf,
      cargo,
      partido,
      atualizadoEm: new Date().toISOString(),
      data: comContas,
    });
  } catch (err) {
    console.error("[api/financeiro/tse-comparativo GET] erro:", err);
    return NextResponse.json({ error: "Erro ao consultar TSE — o site pode estar temporariamente indisponível" }, { status: 502 });
  }
}
