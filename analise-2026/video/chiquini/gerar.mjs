#!/usr/bin/env node
// Monta os dados do Reels "votação histórica do Chiquini" (deputado federal PR 2026, nº 3000) e grava dados.js
// ao lado de reel.html. Fonte: public/dados/federal.json (TSE) e public/mapa.geo.json (IBGE).
// Uso: node analise-2026/video/chiquini/gerar.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url)), PUB = join(AQUI, "../../public");
const d = JSON.parse(readFileSync(join(PUB, "dados/federal.json"), "utf8"));
const geo = JSON.parse(readFileSync(join(PUB, "mapa.geo.json"), "utf8"));
const c = d.candidatos.find((x) => x.n === "3000");

// mais votado de cada cidade (entre todos os candidatos a federal)
const lider = new Map();
for (const x of d.candidatos) for (const [i, v] of x.mun) if (!lider.has(i) || lider.get(i)[1] < v) lider.set(i, [x.n, v]);
const votos = new Map(c.mun);
const cidades = d.municipios.map((m, i) => ({ ibge: m.ibge, nm: m.nm, pct: m.validos ? (votos.get(i) ?? 0) / m.validos : 0, venceu: lider.get(i)?.[0] === "3000" }));
const ord = [...c.mun].sort((a, b) => b[1] - a[1]);
const resumo = {
  votos: c.votos, validos: d.cargo.validos, qe: d.cargo.qe, receita: c.receita,
  cidadesComVoto: c.mun.length, totalCidades: d.municipios.length,
  venceuEm: cidades.filter((x) => x.venceu).map((x) => x.nm),
  capital: ord[0][1] / c.votos,
  medianaEleitos: (() => { const a = d.candidatos.filter((x) => x.eleito && x.receita > 0).map((x) => x.receita / x.votos).sort((p, q) => p - q); return a[Math.floor(a.length / 2)]; })(),
  eleitosNovo: d.candidatos.filter((x) => x.sg === "NOVO" && x.eleito).length,
};
writeFileSync(join(AQUI, "dados.js"), `// gerado por gerar.mjs em ${new Date().toISOString()}\nwindow.GEO = ${JSON.stringify(geo)};\nwindow.CIDADES = ${JSON.stringify(cidades)};\nwindow.RESUMO = ${JSON.stringify(resumo)};\n`);
console.log(resumo);
