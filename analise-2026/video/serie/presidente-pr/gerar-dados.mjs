#!/usr/bin/env node
// pr.json (agregar.mjs) → dados.js do reel: malha do PR e as cores de cada cidade nos dois mapas.
import { readFileSync, writeFileSync } from "node:fs";
const d = JSON.parse(readFileSync(new URL("pr.json", import.meta.url))), geo = readFileSync(new URL("../../../public/mapa.geo.json", import.meta.url), "utf8");
const AZUL = [47, 111, 255], VERMELHO = [229, 49, 47], FUNDO = [27, 34, 50];
const mistura = (c, t) => `rgb(${c.map((v, i) => Math.round(FUNDO[i] + (v - FUNDO[i]) * t)).join(",")})`;
const forca = (p) => Math.min(1, Math.max(.35, (p - .40) / .40)); // 40% → fraco, 80% → cor cheia
const vencedor = {}, lula = {};
for (const m of d.municipios) {
  const val = Object.entries(m.votos).filter(([n]) => d.candidatos[n]).reduce((s, [, q]) => s + q, 0);
  const f = (m.votos["22"] ?? 0) / val, l = (m.votos["13"] ?? 0) / val;
  vencedor[m.ibge] = f > l ? mistura(AZUL, forca(f)) : mistura(VERMELHO, forca(l));
  lula[m.ibge] = l > f ? mistura(VERMELHO, forca(l)) : "#1f2636";
}
writeFileSync(new URL("dados.js", import.meta.url), `// gerado por gerar-dados.mjs\nwindow.GEO = ${geo};\nwindow.MAPAS = ${JSON.stringify({ vencedor, lula })};\n`);
console.log("ok");
