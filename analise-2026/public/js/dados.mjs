import { FOCO, PADRAO_B, PARTIDO, RIVAIS_IGREJA } from "./config.mjs";

export function indexar(dados) {
  return {
    ...dados,
    porNumero: new Map(dados.candidatos.map((c) => [c.n, c])),
    munPorIbge: new Map(dados.municipios.map((m, i) => [m.ibge, i])),
  };
}

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
