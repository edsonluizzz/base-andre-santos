#!/usr/bin/env node
// br.json (agregar.mjs) → dados.js: malha dos estados (IBGE) e, por ano, quem elegeu mais deputados estaduais (PL, PT ou empate).
import { readFileSync, writeFileSync } from "node:fs";
import { orientarParaD3 } from "../../../coletar/malha.mjs";
const d = JSON.parse(readFileSync(new URL("br.json", import.meta.url)));
const geo = orientarParaD3(JSON.parse(readFileSync(new URL("../../../coletar/cache/ibge/malha-BR-uf.json", import.meta.url))));
const COD = { ro: 11, ac: 12, am: 13, rr: 14, pa: 15, ap: 16, to: 17, ma: 21, pi: 22, ce: 23, rn: 24, pb: 25, pe: 26, al: 27, se: 28, ba: 29,
  mg: 31, es: 32, rj: 33, sp: 35, pr: 41, sc: 42, rs: 43, ms: 50, mt: 51, go: 52, df: 53 };
const cor = (x) => { const l = x.partidos.PL?.eleitos ?? 0, t = x.partidos.PT?.eleitos ?? 0; return l > t ? "rgb(47,111,255)" : t > l ? "rgb(229,49,47)" : "#4a5570"; };
const MAPAS = {};
for (const ano of [2022, 2026]) MAPAS[`e${ano}`] = Object.fromEntries(Object.entries(d.estadual[ano]).map(([uf, x]) => [String(COD[uf]), cor(x)]));
writeFileSync(new URL("dados.js", import.meta.url), `// gerado por gerar-dados.mjs\nwindow.GEO = ${JSON.stringify(geo)};\nwindow.MAPAS = ${JSON.stringify(MAPAS)};\n`);
console.log("ok", Object.keys(MAPAS.e2026).length);
