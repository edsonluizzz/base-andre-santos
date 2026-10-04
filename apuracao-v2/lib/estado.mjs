import { calcularQuociente, vagasPartido } from "./quociente.mjs";
import { projetarMajoritario, projetarProporcional } from "./projecao.mjs";

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

// Projeção de eleitos com o que já foi apurado, só enquanto o TSE não declarar ninguém no cargo.
// tipo: "prop" (deputados), "maj2" (com 2º turno), "maj1" (senador). Devolve n → via.
function projetar(bloco, tipo) {
  if (!bloco || !tipo || bloco.candidatos.some((c) => c.eleito)) return new Map();
  const lista = tipo === "prop"
    ? projetarProporcional(bloco)
    : projetarMajoritario({ candidatos: bloco.candidatos, vagas: bloco.vagas, validos: bloco.validos, segundoTurno: tipo === "maj2" });
  return new Map(lista.map((x) => [x.n, x.via]));
}

function chapa(bloco) {
  if (!bloco) return null;
  const proj = projetar(bloco, "prop");
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
      eleitos: proj.size ? cands.filter((c) => proj.has(c.n)).length : cands.filter((c) => c.eleito).length,
      eleitosProjecao: proj.size > 0,
    },
    candidatos: cands.map((c) => ({ ...c, pos: posicao(cands, c.votos), projecao: proj.get(c.n) ?? null })),
  };
}

const majoritario = (bloco, tipo = null) => {
  const proj = projetar(bloco, tipo);
  return bloco
    ? {
      vagas: bloco.vagas, secoesPct: bloco.secoesPct,
      candidatos: bloco.candidatos.map((c) => ({ ...c, projecao: proj.get(c.n) ?? null })),
      comparecimentoPct: bloco.comparecimentoPct, validos: bloco.validos, brancos: bloco.brancos, nulos: bloco.nulos,
    }
    : null;
};

// O resultado no Paraná não elege presidente: só o Brasil recebe projeção.
export const montarPresidente = (blocos) => ({ br: majoritario(blocos.presBr, "maj2"), pr: majoritario(blocos.presPr) });

// Eleitos do cargo, de todos os partidos, por votos: os oficiais do TSE ou, enquanto não houver, a projeção.
function eleitosDe(bloco) {
  const enxuto = ({ n, nome, partido, votos, situacao }) => ({ n, nome, partido, votos, situacao });
  const oficiais = (bloco?.candidatos ?? []).filter((c) => c.eleito).map(enxuto);
  if (oficiais.length) return { lista: oficiais, projecao: false };
  const proj = projetar(bloco, "prop");
  const lista = (bloco?.candidatos ?? [])
    .filter((c) => proj.has(c.n))
    .map((c) => ({ ...enxuto(c), situacao: `Projeção ${proj.get(c.n)}` }));
  return { lista, projecao: lista.length > 0 };
}

function eleitosGerais(est, fed) {
  const e = eleitosDe(est);
  const f = eleitosDe(fed);
  return { estadual: e.lista, federal: f.lista, projecao: e.projecao || f.projecao };
}

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
    governador: majoritario(blocos.governador, "maj2"),
    senador: majoritario(blocos.senador, "maj1"),
    presidente: montarPresidente(blocos),
    eleitos: eleitosGerais(est, blocos.federal),
    municipios,
  };
}
