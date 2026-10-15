#!/usr/bin/env node
// Prepara um episódio da série: serie/<id>/{reel.html, dados.js} a partir dos dados do TSE (public/dados).
// Uso: node analise-2026/video/serie/gerar.mjs <id> <cargo> <uf> <numero>   ex.: moro governador pr 22
// Depois: textos.js (CFG das cenas), rosto.png (rosto.py) e narracao.json; ver LEIAME.md.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url)), PUB = join(AQUI, "../../public");
const [id, cargo, uf, numero] = process.argv.slice(2);
if (!numero) { console.error("uso: gerar.mjs <id> <cargo> <uf> <numero>"); process.exit(1); }
const base = uf.toLowerCase() === "pr" ? PUB : join(PUB, "dados/uf", uf.toLowerCase(), "..", "..", "..");
const arqDados = uf.toLowerCase() === "pr" ? join(PUB, "dados", `${cargo}.json`) : join(PUB, "dados/uf", uf.toLowerCase(), `${cargo}.json`);
const arqGeo = uf.toLowerCase() === "pr" ? join(PUB, "mapa.geo.json") : join(PUB, "dados/uf", uf.toLowerCase(), "mapa.geo.json");
const d = JSON.parse(readFileSync(arqDados, "utf8")), geo = JSON.parse(readFileSync(arqGeo, "utf8"));
const c = d.candidatos.find((x) => x.n === numero);
if (!c) throw new Error(`número ${numero} não encontrado em ${arqDados}`);

const lider = new Map();
for (const x of d.candidatos) for (const [i, v] of x.mun) if (!lider.has(i) || lider.get(i)[1] < v) lider.set(i, [x.n, v]);
const votos = new Map(c.mun);
const cidades = d.municipios.map((m, i) => ({ ibge: m.ibge, nm: m.nm, pct: m.validos ? (votos.get(i) ?? 0) / m.validos : 0, venceu: lider.get(i)?.[0] === numero }));
const ord = [...c.mun].sort((a, b) => b[1] - a[1]);
const eleitos = d.candidatos.filter((x) => x.eleito && x.receita > 0).map((x) => x.receita / x.votos).sort((p, q) => p - q);
const resumo = {
  nm: c.nm, sg: c.sg, sq: c.sq, uf: uf.toUpperCase(), cargo, votos: c.votos, validos: d.cargo.validos, qe: d.cargo.qe, receita: c.receita,
  cidadesComVoto: c.mun.length, totalCidades: d.municipios.length, venceuEm: cidades.filter((x) => x.venceu).length,
  maiorCidade: [d.municipios[ord[0][0]].nm, ord[0][1]], custo: c.receita / c.votos,
  medianaEleitos: eleitos[Math.floor(eleitos.length / 2)], posicaoCusto: eleitos.filter((x) => x < c.receita / c.votos).length + 1, nEleitos: eleitos.length,
};
const pasta = join(AQUI, id);
mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, "dados.js"), `// gerado por gerar.mjs (${cargo} ${uf.toUpperCase()} nº ${numero}) em ${new Date().toISOString()}\nwindow.GEO = ${JSON.stringify(geo)};\nwindow.CIDADES = ${JSON.stringify(cidades)};\nwindow.RESUMO = ${JSON.stringify(resumo)};\n`);
copyFileSync(join(AQUI, "modelo.html"), join(pasta, "reel.html"));
console.log(JSON.stringify(resumo, null, 1));
