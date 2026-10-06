import { FOCO, PADRAO_B, PARTIDO, RIVAIS_IGREJA } from "./config.mjs";

const normal = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

export function indexar(dados) {
  const locaisPorMun = new Map();
  dados.locais.forEach((l, j) => {
    if (!locaisPorMun.has(l.mun)) locaisPorMun.set(l.mun, []);
    locaisPorMun.get(l.mun).push(j);
  });
  return {
    ...dados,
    porNumero: new Map(dados.candidatos.map((c) => [c.n, c])),
    munPorIbge: new Map(dados.municipios.map((m, i) => [m.ibge, i])),
    munPorCd: new Map(dados.municipios.map((m, i) => [m.cd, i])),
    locaisPorMun,
  };
}

// Município digitado no seletor: nome exato (sem acento/caixa) ou prefixo que só um município tem.
export function acharMunicipio(D, texto) {
  const t = normal(texto);
  if (!t) return null;
  const nomes = D.municipios.map((m) => normal(m.nm));
  const exato = nomes.indexOf(t);
  if (exato >= 0) return exato;
  const pref = nomes.flatMap((n, i) => (n.startsWith(t) ? [i] : []));
  return pref.length === 1 ? pref[0] : null;
}

export const idxMunicipio = (D, cd) => D.munPorCd.get(cd) ?? null;
export const locaisDoMunicipio = (D, i) => D.locaisPorMun.get(i) ?? [];

export function rankingNoMunicipio(D, i) {
  return D.candidatos
    .map((c) => ({ c, v: c.mun.find(([k]) => k === i)?.[1] ?? 0 }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
}

// Seleção de candidatos vinda da URL ("10456,30777"); nada válido = todos.
export function lerSelecao(param, opcoes) {
  const pedidos = String(param ?? "").split(",");
  const ok = opcoes.filter((n) => pedidos.includes(n));
  return ok.length ? ok : [...opcoes];
}

export const restringir = (mapa, chaves) => (chaves ? new Map([...mapa].filter(([k]) => chaves.has(k))) : mapa);

// Índice (município ou local) → votos. "loc" só existe para NOVO + rivais; para os outros vem vazio.
export const serie = (c, nivel) => new Map((nivel === "loc" ? c.loc : c.mun) ?? []);

export function percentuais(D, c, nivel) {
  const out = new Map();
  for (const [i, v] of serie(c, nivel)) {
    const den = nivel === "loc" ? D.locais[i].total : D.municipios[i].validos;
    out.set(i, den ? v / den : 0);
  }
  return out;
}

export const chapa = (D, sg) => D.candidatos.filter((c) => c.sg === sg).sort((a, b) => b.votos - a.votos);

export function posicaoGeral(D, n) {
  return [...D.candidatos].sort((a, b) => b.votos - a.votos).findIndex((c) => c.n === n) + 1;
}

export const comparaveis = (D) =>
  D.candidatos.filter((c) => c.n !== FOCO && (c.sg === PARTIDO || RIVAIS_IGREJA.includes(c.n))).sort((a, b) => b.votos - a.votos);

export function escolherB(D, n) {
  const ops = comparaveis(D);
  return ops.find((c) => c.n === n) ?? ops.find((c) => c.n === PADRAO_B) ?? ops[0];
}

export function porRegiao(D, c) {
  const r = { Curitiba: 0, RMC: 0, Litoral: 0, Interior: 0 };
  for (const [i, v] of c.mun) r[D.municipios[i].regiao] += v;
  return r;
}

export function porBairro(D, c, municipio = "CURITIBA") {
  const daCidade = (l) => D.municipios[l.mun].nm === municipio;
  const acc = new Map();
  for (const [j, v] of c.loc ?? []) {
    const l = D.locais[j];
    if (!daCidade(l)) continue;
    const k = l.bairro ?? "(sem bairro)";
    const x = acc.get(k) ?? { bairro: k, votos: 0, total: 0 };
    x.votos += v;
    acc.set(k, x);
  }
  // denominador: votos nominais de todos os locais do bairro, não só onde o candidato teve voto
  for (const l of D.locais) {
    if (!daCidade(l)) continue;
    const x = acc.get(l.bairro ?? "(sem bairro)");
    if (x) x.total += l.total;
  }
  return [...acc.values()].sort((a, b) => b.votos - a.votos);
}
