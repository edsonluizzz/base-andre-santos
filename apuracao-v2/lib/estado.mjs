import { calcularQuociente, vagasPartido } from "./quociente.mjs";

export const ANDRE = "30777";
export const PARTIDO = "NOVO";
export const CHAVES = ["estadual", "federal", "senador", "governador", "presBr", "presPr"];

// Bloco que falhou neste ciclo mantém o anterior (ou null se nunca foi lido).
export function mesclarBlocos(anteriores, novos) {
  const blocos = {};
  const falhas = [];
  for (const k of CHAVES) {
    if (novos[k]) blocos[k] = novos[k];
    else {
      blocos[k] = anteriores?.[k] ?? null;
      falhas.push(k);
    }
  }
  return { blocos, falhas };
}

const posicao = (lista, votos) => 1 + lista.filter((c) => c.votos > votos).length;

function chapa(bloco) {
  if (!bloco) return null;
  const { quociente, oficial } = calcularQuociente(bloco);
  const p = bloco.partidos.find((x) => x.sg === PARTIDO) ?? { nominais: 0, legenda: 0, total: 0 };
  const cands = bloco.candidatos.filter((c) => c.partido === PARTIDO);
  return {
    vagas: bloco.vagas,
    validos: bloco.validos,
    secoesPct: bloco.secoesPct,
    quociente,
    quocienteOficial: oficial,
    novo: {
      nominais: p.nominais, legenda: p.legenda, total: p.total, ...vagasPartido(p.total, quociente),
      eleitos: cands.filter((c) => c.eleito).length,
    },
    candidatos: cands.map((c) => ({ ...c, pos: posicao(cands, c.votos) })),
  };
}

const majoritario = (bloco) =>
  bloco
    ? {
      vagas: bloco.vagas, secoesPct: bloco.secoesPct, candidatos: bloco.candidatos,
      comparecimentoPct: bloco.comparecimentoPct, validos: bloco.validos, brancos: bloco.brancos, nulos: bloco.nulos,
    }
    : null;

export const montarPresidente = (blocos) => ({ br: majoritario(blocos.presBr), pr: majoritario(blocos.presPr) });

// Todos os eleitos do cargo, de todos os partidos, por votos.
const eleitosDe = (bloco) =>
  (bloco?.candidatos ?? [])
    .filter((c) => c.eleito)
    .map(({ n, nome, partido, votos, situacao }) => ({ n, nome, partido, votos, situacao }));

function andreDe(est, anterior, foco) {
  const c = est?.candidatos.find((x) => x.n === foco);
  if (!c) return null;
  const ant = anterior?.andre;
  const delta = !ant ? 0 : c.votos === ant.votos ? ant.delta : c.votos - ant.votos;
  return {
    n: c.n,
    nome: c.nome,
    votos: c.votos,
    delta,
    posChapa: posicao(est.candidatos.filter((x) => x.partido === PARTIDO), c.votos),
    posGeral: posicao(est.candidatos, c.votos),
    totalCandidatos: est.candidatos.length,
    situacao: c.situacao,
    eleito: c.eleito,
    historico: ant?.historico ?? [],
  };
}

export function montarEstado({
  blocos, falhas = [], erros = [], anterior = null,
  agora, proximaBuscaEm, simulacao = false, municipios = null, foco = ANDRE,
}) {
  const est = blocos.estadual;
  const ok = falhas.length === 0;
  return {
    geradoEm: agora,
    proximaBuscaEm,
    simulacao,
    fonte: {
      ok,
      ultimaLeituraOk: ok ? agora : anterior?.fonte.ultimaLeituraOk ?? null,
      erro: ok ? undefined : erros[0] ?? `falha em: ${falhas.join(", ")}`,
    },
    pr: est
      ? { secoesPct: est.secoesPct, comparecimentoPct: est.comparecimentoPct, tseGeradoEm: est.tseGeradoEm }
      : null,
    andre: andreDe(est, anterior, foco),
    estadual: chapa(est),
    federal: chapa(blocos.federal),
    governador: majoritario(blocos.governador),
    senador: majoritario(blocos.senador),
    presidente: montarPresidente(blocos),
    eleitos: { estadual: eleitosDe(est), federal: eleitosDe(blocos.federal) },
    municipios,
  };
}
