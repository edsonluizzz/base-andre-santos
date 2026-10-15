#!/usr/bin/env node
// Presidente 2026, 1º turno, no PR: soma as seções do arquivo nacional do TSE por município → pr.json
// (votos por candidato em cada cidade, brancos e nulos). Confere com o resultado oficial do PR (e006257).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { percorrerCsvDoZip } from "../../../coletar/zip.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url)), RAIZ = join(AQUI, "../../..");
const ZIP = join(RAIZ, "coletar/cache/2026/votacao_secao_2026_BR.zip");
const mun = JSON.parse(readFileSync(join(RAIZ, "public/dados/governador.json"), "utf8")).municipios; // cd TSE, ibge, nome, região
const porCd = new Map(mun.map((m, i) => [m.cd, i]));
const votos = mun.map(() => ({})), nomes = {};
await percorrerCsvDoZip(ZIP, "votacao_secao_2026_BR.csv", ["SG_UF", "NR_TURNO", "CD_CARGO", "CD_MUNICIPIO", "NR_VOTAVEL", "NM_VOTAVEL", "QT_VOTOS"], (c, i) => {
  if (c[i.SG_UF] !== "PR" || c[i.NR_TURNO] !== "1" || c[i.CD_CARGO] !== "1") return;
  const k = porCd.get(String(+c[i.CD_MUNICIPIO]).padStart(5, "0"));
  if (k === undefined) throw new Error(`município ${c[i.CD_MUNICIPIO]} fora da lista`);
  const n = c[i.NR_VOTAVEL]; nomes[n] = c[i.NM_VOTAVEL];
  votos[k][n] = (votos[k][n] ?? 0) + +c[i.QT_VOTOS];
});
// confere com o oficial
const of = JSON.parse(readFileSync(process.argv[2], "utf8")), oficial = {};
for (const a of of.carg[0].agr) for (const p of a.par) for (const x of p.cand) oficial[x.n] = { v: +x.vap, nm: x.nmu, sg: p.sg };
const total = {}; for (const v of votos) for (const [n, q] of Object.entries(v)) total[n] = (total[n] ?? 0) + q;
let ok = true;
for (const [n, o] of Object.entries(oficial)) if (total[n] !== o.v) { ok = false; console.log(`DIVERGE ${n} ${o.nm}: seções ${total[n]} × oficial ${o.v}`); }
if (total["95"] !== +of.v.vb || total["96"] !== +of.v.vn + +of.v.vnt) console.log(`brancos/nulos: ${total["95"]}/${total["96"]} × oficial ${of.v.vb}/${+of.v.vn + +of.v.vnt}`);
console.log(ok ? "todos os candidatos batem com o oficial" : "HÁ DIVERGÊNCIA");
writeFileSync(join(AQUI, "pr.json"), JSON.stringify({ candidatos: oficial, municipios: mun.map((m, k) => ({ ...m, votos: votos[k] })) }));
