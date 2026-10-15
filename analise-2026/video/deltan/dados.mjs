#!/usr/bin/env node
// Números e mapa do vídeo do Deltan Dallagnol na eleição para o Senado de 2026 (PR) → dados.js.
// Fontes: public/dados/senador.json e governador.json (TSE); custo = receita ÷ votos (prestação de contas parcial).
import { readFileSync, writeFileSync } from "node:fs";
const PUB = new URL("../../public/", import.meta.url), ler = (p) => JSON.parse(readFileSync(new URL(p, PUB), "utf8"));
const s26 = ler("dados/senador.json"), g26 = ler("dados/governador.json"), geo = ler("mapa.geo.json");
const ranking = [...s26.candidatos].sort((x, y) => y.votos - x.votos), d = ranking.find((c) => /DALLAGNOL/.test(c.nm)), moro = g26.candidatos.find((c) => /SERGIO MORO/.test(c.nm));
const voto = (c, i) => c.mun.find((x) => x[0] === i)?.[1] ?? 0;
const valG = new Map(g26.municipios.map((m) => [m.ibge, m.validos])), vm = new Map(moro.mun.map(([i, v]) => [g26.municipios[i].ibge, v]));
const M = s26.municipios.map((m, i) => ({ i, ibge: m.ibge, nm: m.nm, reg: m.regiao, v: voto(d, i), p: voto(d, i) / m.validos, pm: (vm.get(m.ibge) ?? 0) / valG.get(m.ibge) }));
const reg = {}; for (const m of M) reg[m.reg] = (reg[m.reg] ?? 0) + m.v;
const comp = g26.cargo.validos + g26.cargo.brancos + g26.cargo.nulos; // eleitores que compareceram (um voto para governador)
const pos = { 1: 0, 2: 0, 3: 0, outros: 0 };
for (const m of M) { const p = s26.candidatos.map((c) => [c, voto(c, m.i)]).sort((x, y) => y[1] - x[1]).findIndex((x) => x[0] === d) + 1; pos[p <= 3 ? p : "outros"]++; }
const media = (a) => a.reduce((s, x) => s + x, 0) / a.length, X = M.map((m) => m.pm), Y = M.map((m) => m.p), mx = media(X), my = media(Y);
const corr = X.reduce((s, x, i) => s + (x - mx) * (Y[i] - my), 0) / Math.sqrt(X.reduce((s, x) => s + (x - mx) ** 2, 0) * Y.reduce((s, y) => s + (y - my) ** 2, 0));
const cw = M.find((m) => m.nm === "CURITIBA");
const D = {
  votos: d.votos, sg: d.sg, pct: 100 * d.votos / s26.cargo.validos, eleitores: d.votos / comp, custo: d.receita / d.votos,
  disputa: ranking.slice(0, 5).map((c) => ({ nm: c.nm, sg: c.sg, v: c.votos, eleito: c.eleito, custo: c.receita ? c.receita / c.votos : null })),
  regioes: Object.fromEntries(Object.entries(reg).map(([k, v]) => [k, v / d.votos])),
  fortes: [...M].sort((x, y) => y.p - x.p).slice(0, 5).map((m) => ({ nm: m.nm, p: 100 * m.p, v: m.v })),
  maiores: [...M].sort((x, y) => y.v - x.v).slice(0, 5).map((m) => ({ nm: m.nm, v: m.v })),
  curitiba: { deltan: cw.v, filipe: voto(ranking[0], cw.i) }, pos, corr, margem: d.votos - ranking[2].votos,
  bolhas: Object.fromEntries(M.map((m) => [m.ibge, [0, m.v]])),
  dispersao: M.map((m) => [+(100 * m.pm).toFixed(2), +(100 * m.p).toFixed(2), m.nm === "CURITIBA" ? 1 : 0]),
};
writeFileSync(new URL("dados.js", import.meta.url), `// gerado por dados.mjs\nwindow.GEO = ${JSON.stringify(geo)};\nwindow.MAPAS = ${JSON.stringify({ m2026: {} })};\nwindow.DADOS = ${JSON.stringify(D)};\n`);
const { dispersao, bolhas, ...resto } = D; console.log(JSON.stringify(resto));
