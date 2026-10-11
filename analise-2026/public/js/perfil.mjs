// Perfil do eleitor: cruza os votos por local com o perfil do eleitorado de cada local (dados/perfil/<ano>.json).
// Tudo é ecológico (perfil do LUGAR onde o voto saiu, não de quem votou): os textos da tela dizem isso.
import { PERFIL_CATS, PERFIL_DIMENSOES } from "./config.mjs";

const TAM = 1 + PERFIL_CATS.length;
const somarVet = (acc, v, peso = 1) => { for (let k = 0; k < TAM; k++) acc[k] += v[k] * peso; return acc; };
const zero = () => new Array(TAM).fill(0);
// posições das categorias de cada dimensão no vetor (0 = aptos)
const FAIXAS = (() => {
  let p = 1;
  return PERFIL_DIMENSOES.map((d) => { const ini = p; p += d.cats.length; return [ini, p]; });
})();

export function indexarPerfil(P) {
  const porLocal = new Map(Object.entries(P.locais));
  const porMun = new Map();
  const total = zero();
  for (const [id, v] of porLocal) {
    const cd = id.split("-")[0];
    if (!porMun.has(cd)) porMun.set(cd, zero());
    somarVet(porMun.get(cd), v);
    somarVet(total, v);
  }
  return { ...P, porLocal, porMun, total };
}

// Fração de cada categoria dentro da sua dimensão (quem não informou fica fora); dimensão vazia = null.
export function fracoes(v) {
  const out = [];
  for (const [a, b] of FAIXAS) {
    let s = 0;
    for (let k = a; k < b; k++) s += v[k];
    for (let k = a; k < b; k++) out.push(s ? v[k] / s : null);
  }
  return out;
}

export function somarLocais(PI, ids) {
  const acc = zero();
  for (const id of ids) { const v = PI.porLocal.get(id); if (v) somarVet(acc, v); }
  return acc;
}

// Perfil médio dos locais de onde vieram os votos do candidato (cada local pesa pelos votos dele ali).
export function perfilDosVotos(D, c, PI) {
  const acc = new Array(PERFIL_CATS.length).fill(0);
  let votos = 0, semPerfil = 0;
  for (const [j, v] of c.loc ?? []) {
    const p = PI.porLocal.get(D.locais[j].id);
    if (!p) { semPerfil += v; continue; }
    fracoes(p).forEach((f, k) => { acc[k] += (f ?? 0) * v; });
    votos += v;
  }
  return { fr: acc.map((x) => (votos ? x / votos : null)), votos, semPerfil };
}

// "Lugares parecidos": os melhores locais do candidato (maior % dos votos nominais) definem o perfil de onde ele vai
// bem; depois, entre os locais onde ele ficou ABAIXO da própria média, os de perfil mais parecido com esse.
// Distância = diferença de cada fração em desvios-padrão do estado (gênero, idade e escolaridade pesam igual por categoria).
export function desvioPadrao(PI) {
  const fs = [...PI.porLocal.values()].map(fracoes);
  return PERFIL_CATS.map((_, k) => {
    const xs = fs.map((f) => f[k]).filter((x) => x != null);
    const m = xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length || 1)) || 1;
  });
}

export function distancia(a, b, dp) {
  let s = 0;
  for (let k = 0; k < a.length; k++) if (a[k] != null && b[k] != null) s += ((a[k] - b[k]) / dp[k]) ** 2;
  return Math.sqrt(s / a.length);
}

export function lugaresParecidos(D, c, PI, { fortes: nFortes = 20, parecidos: nParecidos = 50, minTotal = 100, dp = desvioPadrao(PI) } = {}) {
  const votos = new Map(c.loc ?? []);
  const locais = [];
  D.locais.forEach((l, j) => {
    const p = PI.porLocal.get(l.id);
    if (!p || !(l.total >= minTotal)) return;
    const v = votos.get(j) ?? 0;
    locais.push({ j, l, votos: v, pct: v / l.total, fr: fracoes(p) });
  });
  const somaV = locais.reduce((s, x) => s + x.votos, 0), somaT = locais.reduce((s, x) => s + x.l.total, 0);
  if (!somaV || locais.length < 3) return null;
  const media = somaV / somaT;
  const fortes = locais.filter((x) => x.votos > 0).sort((a, b) => b.pct - a.pct).slice(0, nFortes);
  // perfil dos melhores locais (cada um pesa pelos votos do candidato ali)
  const pf = PERFIL_CATS.map((_, k) => {
    let s = 0, w = 0;
    for (const x of fortes) if (x.fr[k] != null) { s += x.fr[k] * x.votos; w += x.votos; }
    return w ? s / w : null;
  });
  const parecidos = locais.filter((x) => x.pct < media)
    .map((x) => ({ ...x, dist: distancia(x.fr, pf, dp) }))
    .sort((a, b) => a.dist - b.dist).slice(0, nParecidos);
  return { media, fortes, perfil: pf, parecidos };
}

// As categorias em que o perfil mais se afasta da média do estado (índice 100 = igual), da maior diferença à menor.
export function destaques(fr, base, n = 3) {
  return PERFIL_CATS.map((c, k) => ({ ...c, indice: fr[k] != null && base[k] ? (100 * fr[k]) / base[k] : null }))
    .filter((x) => x.indice != null && Math.abs(x.indice - 100) >= 5)
    .sort((a, b) => Math.abs(b.indice - 100) - Math.abs(a.indice - 100)).slice(0, n);
}
