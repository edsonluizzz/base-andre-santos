#!/usr/bin/env node
// PL × PT no Brasil, 2022 × 2026: deputados federais e estaduais (distritais no DF) eleitos e votos nominais, por UF → br.json
import { readFileSync, writeFileSync } from "node:fs";
const PUB = new URL("../../../public/dados/", import.meta.url);
const UFS = ["ac","al","am","ap","ba","ce","df","es","go","ma","mg","ms","mt","pa","pb","pe","pi","pr","rj","rn","ro","rr","rs","sc","se","sp","to"];
const arq = (uf, ano, cargo) => new URL(uf === "pr" ? `${ano === 2022 ? "2022/" : ""}${cargo}.json` : `uf/${uf}/${ano === 2022 ? "2022/" : ""}${cargo}.json`, PUB);
const out = {};
for (const cargo of ["federal", "estadual"]) for (const ano of [2022, 2026]) for (const uf of UFS) {
  const d = JSON.parse(readFileSync(arq(uf, ano, cargo), "utf8")), r = {};
  for (const c of d.candidatos) { const p = (r[c.sg] ??= { eleitos: 0, votos: 0 }); p.votos += c.votos; if (c.eleito) p.eleitos++; }
  (out[cargo] ??= {})[ano] ??= {}; out[cargo][ano][uf] = { vagas: d.cargo.vagas, nominais: d.cargo.nominais, partidos: r };
}
writeFileSync(new URL("br.json", import.meta.url), JSON.stringify(out));
for (const cargo of ["federal", "estadual"]) for (const ano of [2022, 2026]) {
  const t = { vagas: 0, nominais: 0 }, s = {};
  for (const [uf, x] of Object.entries(out[cargo][ano])) { t.vagas += x.vagas; t.nominais += x.nominais;
    for (const [sg, p] of Object.entries(x.partidos)) { (s[sg] ??= { eleitos: 0, votos: 0 }); s[sg].eleitos += p.eleitos; s[sg].votos += p.votos; } }
  const top = Object.entries(s).sort((a, b) => b[1].eleitos - a[1].eleitos).slice(0, 6).map(([sg, p]) => `${sg} ${p.eleitos} (${(100 * p.votos / t.nominais).toFixed(1)}%, ${p.votos})`);
  console.log(`${cargo} ${ano}: vagas ${t.vagas} | ${top.join(" | ")}`);
}
