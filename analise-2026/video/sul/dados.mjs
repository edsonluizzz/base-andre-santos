#!/usr/bin/env node
// Números e mapas do vídeo "Como o Sul ficou todo do PL" → dados.js: vencedor de governador (1º turno) em cada cidade de
// PR, SC e RS em 2022 e 2026, colorido pelo partido; contorno dos três estados (malha do IBGE).
import { readFileSync, writeFileSync } from "node:fs";
import { orientarParaD3 } from "../../coletar/malha.mjs";
const PUB = new URL("../../public/", import.meta.url), ler = (u) => JSON.parse(readFileSync(u, "utf8"));
const UFS = ["pr", "sc", "rs"];
const gov = (uf, ano) => ler(new URL(`dados/${uf === "pr" ? "" : `uf/${uf}/`}${ano === 2022 ? "2022/" : ""}governador.json`, PUB));
const malha = (uf) => ler(new URL(uf === "pr" ? "mapa.geo.json" : `dados/uf/${uf}/mapa.geo.json`, PUB));
export const CORES = { PL: "rgb(47,111,255)", PSD: "#f5a623", PT: "rgb(229,49,47)", PDT: "#d9467a", REPUBLICANOS: "#8b5cf6", PSDB: "#14b8a6" };
const OUTROS = "#6b7690";
const mapas = {}, contagem = {};
for (const ano of [2022, 2026]) {
  const m = {}, c = {};
  for (const uf of UFS) { const d = gov(uf, ano), melhor = new Map();
    for (const x of d.candidatos) for (const [i, v] of x.mun) if (!melhor.has(i) || melhor.get(i)[1] < v) melhor.set(i, [x.sg, v]);
    for (const [i, [sg]] of melhor) { m[d.municipios[i].ibge] = CORES[sg] ?? OUTROS; const k = CORES[sg] ? sg : "outros"; c[k] = (c[k] ?? 0) + 1; } }
  mapas[`m${ano}`] = m; contagem[ano] = c;
}
const geo = { type: "FeatureCollection", features: UFS.flatMap((uf) => malha(uf).features) };
const ufs = orientarParaD3(ler(new URL("../../coletar/cache/ibge/malha-BR-uf.json", import.meta.url)));
const contorno = { type: "FeatureCollection", features: ufs.features.filter((f) => ["41", "42", "43"].includes(String(f.properties.codarea))) };
writeFileSync(new URL("dados.js", import.meta.url), `// gerado por dados.mjs\nwindow.GEO = ${JSON.stringify(geo)};\nwindow.CONTORNO = ${JSON.stringify(contorno)};\nwindow.MAPAS = ${JSON.stringify(mapas)};\nwindow.CONTAGEM = ${JSON.stringify(contagem)};\n`);
console.log(JSON.stringify(contagem), geo.features.length, "cidades");
