// Estados: pasta de saída, regiões e malha de cada UF.
// O PR, primeiro estado coletado, fica na raiz (public/dados/…, public/mapa.geo.json); os demais em
// public/dados/uf/<uf>/… com o mesmo layout (inclusive mapa.geo.json).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { UFS } from "../public/js/config.mjs";
import { orientarParaD3 } from "./malha.mjs";
import { regiaoDe } from "./regioes.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(AQUI, "..", "public");
const CACHE_IBGE = join(AQUI, "cache", "ibge");

export function dadosUF(sigla) {
  const uf = UFS[sigla.toUpperCase()];
  if (!uf) throw new Error(`UF desconhecida: ${sigla}`);
  return { ...uf, sigla: sigla.toUpperCase(), pasta: sigla.toUpperCase() === "PR" ? join(PUBLICO, "dados") : join(PUBLICO, "dados", "uf", sigla.toLowerCase()) };
}

async function baixarJson(url, arquivo) {
  mkdirSync(CACHE_IBGE, { recursive: true });
  const destino = join(CACHE_IBGE, arquivo);
  if (existsSync(destino)) return JSON.parse(readFileSync(destino, "utf8"));
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${r.status}`);
  const json = await r.json();
  writeFileSync(destino, JSON.stringify(json));
  return json;
}

// Região de cada município: no PR, Curitiba/RMC/Litoral/Interior; nos demais, a região geográfica
// intermediária do IBGE (polos como Joinville, Campinas, Uberlândia). Recebe { nm, ibge }.
export async function regioesUF(sigla) {
  const uf = dadosUF(sigla);
  if (uf.sigla === "PR") return (m) => regiaoDe(m.nm);
  const lista = await baixarJson(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf.ibge}/municipios?view=nivelado`, `municipios-${uf.sigla}.json`);
  const porIbge = new Map(lista.map((m) => [String(m["municipio-id"]), m["regiao-intermediaria-nome"]]));
  return (m) => {
    const r = porIbge.get(String(m.ibge));
    if (!r) throw new Error(`Município ${m.nm} (IBGE ${m.ibge}) sem região intermediária no IBGE`);
    return r;
  };
}

// Malha municipal da UF (IBGE, qualidade mínima), orientada para o D3, em <pasta>/mapa.geo.json (PR: public/mapa.geo.json).
export async function gravarMalha(sigla) {
  const uf = dadosUF(sigla);
  const geo = await baixarJson(`https://servicodados.ibge.gov.br/api/v3/malhas/estados/${uf.ibge}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`, `malha-${uf.sigla}.json`);
  const destino = uf.sigla === "PR" ? join(PUBLICO, "mapa.geo.json") : join(uf.pasta, "mapa.geo.json");
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, JSON.stringify(orientarParaD3(geo)));
  return destino;
}
