/**
 * Cliente para a API (não oficial, mas pública) do DivulgaCandContas do TSE —
 * mesmos endpoints REST usados pelo site divulgacandcontas.tse.jus.br.
 * Descoberta capturando as chamadas de rede reais do site em 2026-08-23
 * (a documentação oficial não existe; ver github.com/augusto-herrmann/divulgacandcontas-doc
 * para o levantamento não-oficial da comunidade).
 */

const BASE = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1";

// Eleição Geral 2026 — código fixo usado pelo próprio site do TSE.
export const ELEICAO_2026 = "20322002026";
export const ANO_2026 = 2026;

export const CARGO = {
  GOVERNADOR: 3,
  VICE_GOVERNADOR: 4,
  SENADOR: 5,
  DEPUTADO_FEDERAL: 6,
  DEPUTADO_ESTADUAL: 7,
} as const;

export type TseCandidato = {
  id: number;
  nomeUrna: string;
  numero: number;
  descricaoSituacao: string | null;
  descricaoTotalizacao: string | null;
};

export type TseContas = {
  dataUltimaAtualizacaoContas: string | null;
  totalRecebido: number;
  qtdRecebido: number;
  totalReceitaPF: number;
  qtdReceitaPF: number;
  totalReceitaPJ: number;
  qtdReceitaPJ: number;
  totalPartidos: number;
  totalProprios: number;
} | null;

async function tseFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OvileEleitoral/1.0)" },
  });
  if (!res.ok) throw new Error(`TSE respondeu ${res.status} em ${path}`);
  return res.json() as Promise<T>;
}

/** Lista candidatos de um cargo/partido numa UF, na eleição de 2026. */
export async function listarCandidatos(uf: string, cargo: number, partido: number): Promise<TseCandidato[]> {
  const data = await tseFetch<{ candidatos: TseCandidato[] }>(
    `/candidatura/listar/${ANO_2026}/${uf}/${ELEICAO_2026}/${cargo}/candidatos?partido=${partido}`,
  );
  return data.candidatos ?? [];
}

/** Resumo consolidado de receitas/despesas de um candidato — o mesmo card que aparece na página dele. */
export async function consultarContas(
  uf: string,
  cargo: number,
  partido: number,
  numero: number,
  idCandidato: number,
): Promise<TseContas> {
  try {
    const data = await tseFetch<{ dataUltimaAtualizacaoContas: string | null; dadosConsolidados: Record<string, number> | null }>(
      `/prestador/consulta/${ELEICAO_2026}/${ANO_2026}/${uf}/${cargo}/${partido}/${numero}/${idCandidato}`,
    );
    if (!data.dadosConsolidados) return null;
    const d = data.dadosConsolidados;
    return {
      dataUltimaAtualizacaoContas: data.dataUltimaAtualizacaoContas ?? null,
      totalRecebido: d.totalRecebido ?? 0,
      qtdRecebido: d.qtdRecebido ?? 0,
      totalReceitaPF: d.totalReceitaPF ?? 0,
      qtdReceitaPF: d.qtdReceitaPF ?? 0,
      totalReceitaPJ: d.totalReceitaPJ ?? 0,
      qtdReceitaPJ: d.qtdReceitaPJ ?? 0,
      totalPartidos: d.totalPartidos ?? 0,
      totalProprios: d.totalProprios ?? 0,
    };
  } catch {
    // Candidato sem prestação de contas entregue ainda — não é erro, é normal no início da campanha.
    return null;
  }
}
