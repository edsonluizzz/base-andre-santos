#!/usr/bin/env node
// Números do vídeo do Novo e a cláusula de barreira → dados.js. Votos do partido para deputado federal = nominais + legenda,
// sobre os válidos (nominais + legenda) de cada UF; regra de 2026 (EC 97/2017): 2,5% no país e 1,5% em 9 UFs, ou 13 deputados em 9 UFs.
import { readFileSync, writeFileSync } from "node:fs";
import { orientarParaD3 } from "../../coletar/malha.mjs";
const PUB = new URL("../../public/dados/", import.meta.url), ler = (u) => JSON.parse(readFileSync(u, "utf8"));
const UFS = "ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to".split(" ");
const COD = { ro: 11, ac: 12, am: 13, rr: 14, pa: 15, ap: 16, to: 17, ma: 21, pi: 22, ce: 23, rn: 24, pb: 25, pe: 26, al: 27, se: 28, ba: 29, mg: 31, es: 32, rj: 33, sp: 35, pr: 41, sc: 42, rs: 43, ms: 50, mt: 51, go: 52, df: 53 };
const arq = (uf, ano, c) => new URL((uf === "pr" ? "" : `uf/${uf}/`) + (ano === 2022 ? "2022/" : "") + `${c}.json`, PUB);
function ano(a) {
  let val = 0, votos = 0, eleitos = 0, cand = 0; const uf = {}, nomes = [];
  for (const u of UFS) { const d = ler(arq(u, a, "federal")), cs = d.candidatos.filter((c) => c.sg === "NOVO"), ag = d.agremiacoes.find((x) => x.siglas.length === 1 && x.siglas[0] === "NOVO");
    const v = cs.reduce((s, c) => s + c.votos, 0) + (ag?.legenda ?? 0); val += d.cargo.validos; votos += v; cand += cs.length; eleitos += cs.filter((c) => c.eleito).length;
    uf[u] = { v, val: d.cargo.validos, p: 100 * v / d.cargo.validos, e: cs.filter((c) => c.eleito).length };
    nomes.push(...cs.map((c) => ({ nm: c.nm, uf: u.toUpperCase(), v: c.votos, e: c.eleito }))); }
  return { val, votos, p: 100 * votos / val, eleitos, cand, uf, top: nomes.sort((x, y) => y.v - x.v).slice(0, 5) };
}
const a22 = ano(2022), a26 = ano(2026);
const acima = (A, lim) => UFS.filter((u) => A.uf[u].p >= lim);
const ufs22 = acima(a22, 1.5), ufs26 = acima(a26, 1.5);
const cor = {}; for (const u of UFS) { const n = ufs26.includes(u), v = ufs22.includes(u); cor[COD[u]] = n && v ? "rgb(47,111,255)" : n ? "#ff6a13" : v ? "#5b2330" : "#1b2232"; }
const sen = []; for (const u of UFS) for (const c of ler(arq(u, 2026, "senador")).candidatos) if (c.sg === "NOVO" && c.eleito) sen.push({ nm: c.nm, uf: u.toUpperCase() });
const D = {
  p22: a22.p, p26: a26.p, votos26: a26.votos, margem: a26.votos - Math.ceil(0.025 * a26.val), cand22: a22.cand, cand26: a26.cand, eleitos22: a22.eleitos, eleitos26: a26.eleitos,
  top: a26.top, pr: { p: a26.uf.pr.p, e: a26.uf.pr.e, fatia: 100 * a26.uf.pr.v / a26.votos, semPr: 100 * (a26.votos - a26.uf.pr.v) / (a26.val - a26.uf.pr.val) },
  df: { p: a26.uf.df.p, margem: a26.uf.df.v - Math.ceil(0.015 * a26.uf.df.val) },
  ufs22: ufs22.map((u) => u.toUpperCase()), ufs26: ufs26.map((u) => u.toUpperCase()).sort((x, y) => a26.uf[y.toLowerCase()].p - a26.uf[x.toLowerCase()].p),
  pctUF: Object.fromEntries(ufs26.map((u) => [u.toUpperCase(), a26.uf[u].p])),
  senadores: sen, ufs2030: acima(a26, 2).length,
};
const geo = orientarParaD3(ler(new URL("../../coletar/cache/ibge/malha-BR-uf.json", import.meta.url)));
writeFileSync(new URL("dados.js", import.meta.url), `// gerado por dados.mjs\nwindow.GEO = ${JSON.stringify(geo)};\nwindow.MAPAS = ${JSON.stringify({ estados: cor })};\nwindow.DADOS = ${JSON.stringify(D)};\n`);
console.log(JSON.stringify(D, null, 1));
