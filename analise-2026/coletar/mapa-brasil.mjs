#!/usr/bin/env node
// Mapa do Brasil do hero da landing (public/img/brasil.json), já projetado em coordenadas de tela.
// Por estado: o contorno (desenhado a traço na animação) e os municípios agrupados em 8 tons pelo total de votos
// válidos para deputado estadual em 2026 (quantis no país inteiro; mais voto = mais aceso). ~220 caminhos em vez
// de 5.570: leve até no celular. UF ainda sem dados coletados fica no tom mais baixo.
// Uso (da raiz do repo): node analise-2026/coletar/mapa-brasil.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geoMercator } from "d3-geo";
import { UFS } from "../public/js/config.mjs";
import { orientarParaD3 } from "./malha.mjs";
import { dadosUF } from "./uf.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const IBGE = join(AQUI, "cache", "ibge");
const NIVEIS = 8, L = 800, MIN_PX = 1.6;

async function malha(intra, arquivo) {
  const destino = join(IBGE, arquivo);
  if (!existsSync(destino)) {
    mkdirSync(IBGE, { recursive: true });
    const r = await fetch(`https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=${intra}`);
    if (!r.ok) throw new Error(`IBGE ${intra}: HTTP ${r.status}`);
    writeFileSync(destino, await r.text());
  }
  // anéis na orientação do D3 (senão o enquadramento pega o "mundo menos o polígono")
  return orientarParaD3(JSON.parse(readFileSync(destino, "utf8")));
}

const ufs = await malha("UF", "malha-BR-uf.json");
const muns = await malha("municipio", "malha-BR-mun.json");
const proj = geoMercator().fitWidth(L, ufs);
const altura = Math.ceil(Math.max(...ufs.features.flatMap((f) => aneis(f.geometry).flat().map((p) => proj(p)[1])))) + 2;

function aneis(g) {
  return g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : [];
}
// Caminho SVG de um polígono: projeta, arredonda ao pixel e descarta pontos a menos de MIN_PX do anterior.
function caminho(g) {
  let d = "";
  for (const anel of aneis(g)) {
    const pts = [];
    for (const p of anel) {
      const [x, y] = proj(p);
      const u = pts[pts.length - 1];
      if (!u || Math.hypot(x - u[0], y - u[1]) >= MIN_PX) pts.push([x, y]);
    }
    if (pts.length < 3) continue;
    d += `M${pts.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join("L")}Z`;
  }
  return d;
}

// votos válidos por município (código IBGE), de cada UF já coletada
const validos = new Map();
for (const sigla of Object.keys(UFS)) {
  const arq = join(dadosUF(sigla).pasta, "estadual.json");
  if (!existsSync(arq)) { console.log(`  ${sigla}: sem dados, tom mais baixo`); continue; }
  for (const m of JSON.parse(readFileSync(arq, "utf8")).municipios) validos.set(String(m.ibge), m.validos);
}
const ordenados = [...validos.values()].sort((a, b) => a - b);
const nivel = (v) => {
  if (!v) return 0;
  let lo = 0, hi = ordenados.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (ordenados[m] < v) lo = m + 1; else hi = m; }
  return Math.min(NIVEIS - 1, Math.floor((lo / ordenados.length) * NIVEIS));
};

const siglaDoIbge = new Map(Object.entries(UFS).map(([s, u]) => [String(u.ibge), s]));
const estados = new Map(ufs.features.map((f) => [siglaDoIbge.get(String(f.properties.codarea)), { uf: siglaDoIbge.get(String(f.properties.codarea)), contorno: caminho(f.geometry), niveis: Array(NIVEIS).fill("") }]));
for (const f of muns.features) {
  const cod = String(f.properties.codarea), e = estados.get(siglaDoIbge.get(cod.slice(0, 2)));
  if (e) e.niveis[nivel(validos.get(cod))] += caminho(f.geometry);
}
const saida = { largura: L, altura, niveis: NIVEIS, estados: [...estados.values()] };
const destino = join(AQUI, "..", "public", "img", "brasil.json");
writeFileSync(destino, JSON.stringify(saida));
console.log(`${destino}: ${(JSON.stringify(saida).length / 1024).toFixed(0)} KB, ${validos.size} municípios com dados, ${L}×${altura}`);
