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

// Sistema linear A·x = b (eliminação de Gauss com pivô parcial).
export function resolver(A, b) {
  const n = b.length, M = A.map((linha, i) => [...linha, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(M[i][c]) > Math.abs(M[p][c])) p = i;
    if (!M[p][c]) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let i = 0; i < n; i++) {
      if (i === c) continue;
      const f = M[i][c] / M[c][c];
      for (let k = c; k <= n; k++) M[i][k] -= f * M[c][k];
    }
  }
  return M.map((linha, i) => linha[n] / linha[i]);
}

// Variáveis do modelo: frações de cada categoria, menos a última de cada dimensão (é a referência).
const VARS = PERFIL_DIMENSOES.flatMap((d, i) => d.cats.slice(0, -1).map((_, k) => FAIXAS[i][0] - 1 + k));
export const MIN_LOCAIS_MODELO = 30;

// Voto ESPERADO em cada local pelo perfil do eleitorado, comparando só locais da MESMA unidade (município; nas
// municipais, bairro). Um modelo do estado inteiro confundiria demografia com geografia (a cidade onde o candidato
// não fez campanha pareceria "espaço para crescer"). Aqui: % do candidato no local − média da unidade ≈
// Σ b·(fração da categoria − média da unidade), mínimos quadrados ponderados pelos votos do local, só nas unidades
// onde o candidato teve pelo menos `minVotosUnidade` votos. Esperado = média da unidade + Σ b·(desvio do perfil).
// Devolve Map j → votos esperados (índice de D.locais), os coeficientes e o R² dentro das unidades.
export function ajustarModelo(D, c, PI, { minTotal = 30, minLocais = MIN_LOCAIS_MODELO, minVotosUnidade = 30 } = {}) {
  const votos = new Map(c.loc ?? []);
  const votosUn = new Map();
  for (const [j, v] of votos) { const i = D.locais[j].mun; votosUn.set(i, (votosUn.get(i) ?? 0) + v); }
  const grupos = new Map();
  D.locais.forEach((l, j) => {
    if (!((votosUn.get(l.mun) ?? 0) >= minVotosUnidade)) return;
    const p = PI.porLocal.get(l.id);
    if (!p || !(l.total >= minTotal)) return;
    const f = fracoes(p);
    if (VARS.some((k) => f[k] == null)) return;
    if (!grupos.has(l.mun)) grupos.set(l.mun, []);
    grupos.get(l.mun).push({ j, x: VARS.map((k) => f[k]), y: (votos.get(j) ?? 0) / l.total, w: l.total });
  });
  // tira a média ponderada de cada unidade (unidade com um local só não informa nada)
  const linhas = [];
  for (const g of grupos.values()) {
    if (g.length < 2) continue;
    const sw = g.reduce((s, r) => s + r.w, 0);
    const my = g.reduce((s, r) => s + r.w * r.y, 0) / sw;
    const mx = VARS.map((_, k) => g.reduce((s, r) => s + r.w * r.x[k], 0) / sw);
    for (const r of g) linhas.push({ ...r, my, dy: r.y - my, dx: r.x.map((v, k) => v - mx[k]) });
  }
  if (linhas.length < minLocais) return null;
  const p = VARS.length;
  const A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0);
  for (const { dx, dy, w } of linhas) {
    for (let r = 0; r < p; r++) {
      b[r] += w * dx[r] * dy;
      for (let s = 0; s < p; s++) A[r][s] += w * dx[r] * dx[s];
    }
  }
  // um pouco de "ridge": categoria que não varia entre os locais deixa o sistema singular
  const lambda = 1e-8 * (A.reduce((s, linha, i) => s + linha[i], 0) / p || 1);
  for (let r = 0; r < p; r++) A[r][r] += lambda;
  const coef = resolver(A, b);
  if (!coef) return null;
  let sqr = 0, sqt = 0;
  const esperado = new Map();
  for (const { j, dx, dy, my, w } of linhas) {
    const dh = dx.reduce((s, v, k) => s + v * coef[k], 0);
    sqr += w * (dy - dh) ** 2;
    sqt += w * dy ** 2;
    esperado.set(j, Math.max(0, my + dh) * D.locais[j].total);
  }
  return { coef, vars: VARS.map((k) => PERFIL_CATS[k].id), r2: sqt ? 1 - sqr / sqt : 0, n: linhas.length, unidades: new Set(linhas.map((r) => D.locais[r.j].mun)).size, esperado };
}

// Soma valores por local (Map j → valor) na unidade do local (município; nas municipais, bairro).
export function porUnidade(D, porLocal) {
  const out = new Map();
  for (const [j, v] of porLocal) { const i = D.locais[j].mun; out.set(i, (out.get(i) ?? 0) + v); }
  return out;
}

// Volatilidade eleitoral (índice de Pedersen) entre duas eleições do mesmo cargo: metade da soma, partido a
// partido, da variação da participação nos votos nominais. 0 = mesmo resultado; 1 = troca completa.
// Os municípios casam pelo código do TSE. Partidos que mudaram de nome/fundiram contam como troca.
export function volatilidade(D, O) {
  const partidos = (X) => {
    const mun = new Map(), uf = new Map();
    for (const c of X.candidatos) {
      for (const [i, v] of c.mun) {
        const cd = X.municipios[i].cd;
        if (!mun.has(cd)) mun.set(cd, new Map());
        mun.get(cd).set(c.sg, (mun.get(cd).get(c.sg) ?? 0) + v);
        uf.set(c.sg, (uf.get(c.sg) ?? 0) + v);
      }
    }
    return { mun, uf };
  };
  const pedersen = (a, b) => {
    if (!a || !b) return null;
    const ta = [...a.values()].reduce((s, x) => s + x, 0), tb = [...b.values()].reduce((s, x) => s + x, 0);
    if (!ta || !tb) return null;
    let s = 0;
    for (const k of new Set([...a.keys(), ...b.keys()])) s += Math.abs((a.get(k) ?? 0) / ta - (b.get(k) ?? 0) / tb);
    return s / 2;
  };
  const x = partidos(D), y = partidos(O);
  const porMun = new Map();
  D.municipios.forEach((m, i) => { const v = pedersen(x.mun.get(m.cd), y.mun.get(m.cd)); if (v != null) porMun.set(i, v); });
  return { porMun, estado: pedersen(x.uf, y.uf) };
}
