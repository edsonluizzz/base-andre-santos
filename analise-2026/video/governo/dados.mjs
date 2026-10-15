#!/usr/bin/env node
// Números do vídeo "Como fica o governo" → dados.js. Bancadas eleitas (public/dados, 27 UFs) somadas pelos partidos das
// coligações de presidente (TSE e006257) e de governador do PR; Senado = eleitos em 2026 + eleitos em 2022 (partido da eleição).
// Uso: node dados.mjs <br-c0001-e006257-u.json>
import { readFileSync, writeFileSync } from "node:fs";
const PUB = new URL("../../public/dados/", import.meta.url), ler = (u) => JSON.parse(readFileSync(u, "utf8"));
const UFS = "ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to".split(" ");
const arq = (uf, ano, c) => new URL((uf === "pr" ? "" : `uf/${uf}/`) + (ano === 2022 ? "2022/" : "") + `${c}.json`, PUB);
const eleitos = (ano, c, ufs = UFS) => { const s = {}; for (const uf of ufs) for (const x of ler(arq(uf, ano, c)).candidatos) if (x.eleito) s[x.sg] = (s[x.sg] ?? 0) + 1; return s; };
const soma = (o, g) => g.reduce((t, k) => t + (o[k] ?? 0), 0), total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const pres = ler(process.argv[2]), coligacao = {}, votos = {};
for (const a of pres.carg[0].agr) for (const p of a.par) for (const c of p.cand) { coligacao[c.n] = a.com.split(" / ").map((s) => s.toUpperCase()); votos[c.n] = { v: +c.vap, p: +c.pvap.replace(",", ".") }; }
const FL = coligacao["22"], LU = coligacao["13"];
const cam = eleitos(2026, "federal"), sen = eleitos(2026, "senador"); for (const [k, v] of Object.entries(eleitos(2022, "senador"))) sen[k] = (sen[k] ?? 0) + v;
const bloco = (o) => ({ pl: soma(o, FL), lula: soma(o, LU), centro: total(o) - soma(o, FL) - soma(o, LU), total: total(o) });
// governador do PR: coligações (Moro, Sandro Alex, Requião Filho)
const gov = ler(new URL("../../coletar/cache/oficial-governador.json", import.meta.url)), colGov = {};
for (const a of gov.carg[0].agr) for (const p of a.par) for (const c of p.cand) colGov[c.nmu] = a.com.split(" / ").map((s) => s.toUpperCase());
const alep = eleitos(2026, "estadual", ["pr"]), prFed = eleitos(2026, "federal", ["pr"]);
const moro = gov.carg[0].agr.flatMap((a) => a.par.flatMap((p) => p.cand)).find((c) => c.nmu === "SERGIO MORO");
const centro = [["União Progressista", (cam.PP ?? 0) + (cam["UNIÃO"] ?? 0), "federação PP + União"], ["PSD", cam.PSD], ["Republicanos", cam.REPUBLICANOS], ["MDB", cam.MDB], ["Podemos", cam.PODE]];
centro.push(["Outros", bloco(cam).centro - centro.reduce((s, x) => s + x[1], 0), "PSDB, Novo, Avante, PRD e outros"]);
const D = { pres: { flavio: votos["22"], lula: votos["13"] }, camara: bloco(cam), senado: bloco(sen), centro,
  alep: { moro: soma(alep, colGov["SERGIO MORO"]), sandro: soma(alep, colGov["SANDRO ALEX"]), requiao: soma(alep, colGov["REQUIÃO FILHO"]), total: total(alep) },
  prFed: { moro: soma(prFed, colGov["SERGIO MORO"]) }, moro: { v: +moro.vap, p: +moro.pvap.replace(",", ".") } };
writeFileSync(new URL("dados.js", import.meta.url), `// gerado por dados.mjs\nwindow.DADOS = ${JSON.stringify(D, null, 1)};\n`);
console.log(JSON.stringify(D));
