// Reapresenta a apuração do 1º turno de 2022 com os resultados oficiais do TSE
// (Dados Abertos), no MESMO formato dos arquivos de resultado, para testar o
// painel com volume real: 860 candidatos a estadual, 399 municípios, 6 milhões de votos.
// Os totais finais são os oficiais; o ritmo em que os municípios "chegam" é inventado.

import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { prng } from "./simulador.mjs";

const CD_CARGO = { presBr: "1", presPr: "1", governador: "3", senador: "5", federal: "6", estadual: "7" };
const fmtPct = (x) => x.toFixed(2).replace(".", ",");

export function carregarDados2022(caminho) {
  return JSON.parse(gunzipSync(readFileSync(caminho)).toString("utf8"));
}

// Cada local começa a ser apurado num momento sorteado e leva mais tempo quanto maior for.
function curvas(locais, rand) {
  const maior = Math.max(1, ...locais.map((l) => l.secoes));
  return locais.map((l) => {
    const dur = 0.15 + 0.35 * Math.sqrt(l.secoes / maior);
    return { ini: rand() * (1 - dur), dur };
  });
}

const fracao = (c, t) => (t >= 1 ? 1 : Math.max(0, Math.min(1, (t - c.ini) / c.dur)));

function montar(chave, cargo, locais, fracoes, final) {
  const votos = new Array(cargo.candidatos.length).fill(0);
  const legenda = new Array(cargo.partidos.length).fill(0);
  let validos = 0;
  let secoes = 0;
  let secoesTotal = 0;
  let comparecimento = 0;
  let aptos = 0;
  locais.forEach((local, i) => {
    const f = fracoes[i];
    secoesTotal += local.secoes;
    aptos += local.aptos;
    secoes += local.secoes * f;
    comparecimento += local.comparecimento * f;
    validos += Math.floor(cargo.validos[i] * f);
    const v = cargo.votos[i];
    for (let j = 0; j < v.length; j += 2) votos[v[j]] += Math.floor(v[j + 1] * f);
    const l = cargo.legenda[i];
    for (let j = 0; j < l.length; j += 2) legenda[l[j]] += Math.floor(l[j + 1] * f);
  });

  const porPartido = new Map(cargo.partidos.map((sg, i) => [sg, { sg, tvtn: 0, tvtl: String(legenda[i]), cand: [] }]));
  cargo.candidatos.forEach((c, i) => {
    const par = porPartido.get(c.partido);
    par.tvtn += votos[i];
    par.cand.push({
      n: c.n, nmu: c.nome, vap: String(votos[i]),
      pvap: fmtPct(validos ? (100 * votos[i]) / validos : 0),
      // A situação oficial só existe quando a totalização termina.
      st: final ? c.st : "", e: final ? c.e : "n",
    });
  });
  // Partidos de uma federação ficam no mesmo agrupamento (agr), como no arquivo real do TSE.
  const federacaoDe = new Map(cargo.candidatos.filter((c) => c.federacao).map((c) => [c.partido, c.federacao]));
  const agrs = new Map();
  for (const p of porPartido.values()) {
    const chave = federacaoDe.get(p.sg) ?? p.sg;
    if (!agrs.has(chave)) agrs.set(chave, { n: chave, tp: federacaoDe.has(p.sg) ? "f" : "i", par: [] });
    agrs.get(chave).par.push({ ...p, tvtn: String(p.tvtn) });
  }
  const agora = new Date();
  return {
    dg: agora.toLocaleDateString("pt-BR"),
    hg: agora.toTimeString().slice(0, 8),
    s: { pst: fmtPct(secoesTotal ? (100 * secoes) / secoesTotal : 0) },
    e: { pc: fmtPct(aptos ? (100 * comparecimento) / aptos : 0) },
    v: { vv: String(validos) },
    carg: [{
      cd: CD_CARGO[chave], nv: String(cargo.vagas), qe: "0",
      agr: [...agrs.values()],
    }],
  };
}

export function criarSimulador2022(dados, { passos = 60, seed = 2022, foco } = {}) {
  const rand = prng(seed);
  const curvaMun = curvas(dados.municipios, rand);
  const curvaUf = curvas(dados.ufs, rand);
  const idxFoco = dados.cargos.estadual.candidatos.findIndex((c) => c.n === foco);
  let passo = 0;
  const fracoesMun = () => curvaMun.map((c) => fracao(c, passo / passos));

  return {
    get terminou() {
      return passo >= passos;
    },
    proximo() {
      passo = Math.min(passos, passo + 1);
      const final = passo >= passos;
      const fm = fracoesMun();
      const saida = { presBr: montar("presBr", dados.presBr, dados.ufs, curvaUf.map((c) => fracao(c, passo / passos)), final) };
      for (const [chave, cargo] of Object.entries(dados.cargos)) saida[chave] = montar(chave, cargo, dados.municipios, fm, final);
      return saida;
    },
    municipios(_lista, agora) {
      const est = dados.cargos.estadual;
      const fm = fracoesMun();
      const lista = dados.municipios.map((m, i) => {
        const v = est.votos[i];
        let votos = 0;
        for (let j = 0; j < v.length; j += 2) if (v[j] === idxFoco) votos = Math.floor(v[j + 1] * fm[i]);
        const validos = Math.floor(est.validos[i] * fm[i]);
        return { cd: m.cd, nome: m.nome, votos, validos, pctValidos: validos ? (100 * votos) / validos : 0, secoesPct: 100 * fm[i] };
      });
      lista.sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"));
      return { atualizadoEm: agora, comVotos: lista.filter((m) => m.votos > 0).length, total: lista.length, falhas: 0, lista };
    },
  };
}
