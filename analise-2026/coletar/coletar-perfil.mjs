#!/usr/bin/env node
// Perfil do eleitorado por local de votação (gênero, idade, escolaridade), para a tela "Perfil do eleitor".
// Lê perfil_eleitor_secao_<ano>_PR (TSE) e o cadastro de locais do mesmo ano (seção → local da votação) e grava
// public/dados/perfil/<ano>.json = { meta, cats, locais: { "<mun>-<zona>-<local>": [aptos, ...contagens] } }.
// Confere a cobertura com os locais da votação já coletada (dados/estadual.json ou dados/2022/estadual.json).
// Uso (da raiz do repo): node analise-2026/coletar/coletar-perfil.mjs [ano=2026]   (só PR por enquanto)
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { PERFIL_ANOS, PERFIL_CATS } from "../public/js/config.mjs";
import { cdMun } from "./agregar.mjs";
import { criarMapaSecoes, criarSomaPerfil } from "./perfil.mjs";
import { percorrerCsvDoZip } from "./zip.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const ANO = Number(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? 2026);
if (!PERFIL_ANOS.includes(ANO)) throw new Error(`Ano sem perfil configurado: ${ANO} (PERFIL_ANOS em config.mjs)`);
const UF = "PR";
const ODSELE = "https://cdn.tse.jus.br/estatistica/sead/odsele";
const PERFIL = { url: `${ODSELE}/perfil_eleitor_secao/perfil_eleitor_secao_${ANO}_${UF}.zip`, destino: join(AQUI, "cache", "perfil", `perfil_eleitor_secao_${ANO}_${UF}.zip`) };
// cadastro de locais: o de 2026 é o mesmo da coleta estadual; o de 2022, o nacional da coleta de 2022
const LOCAIS = ANO === 2026
  ? { zip: join(AQUI, "cache", "locais.zip"), csv: `eleitorado_local_votacao_2026_${UF}.csv` }
  : { zip: join(AQUI, "cache", String(ANO), `eleitorado_local_votacao_${ANO}.zip`), csv: `eleitorado_local_votacao_${ANO}.csv` };
const PUBLICO = join(AQUI, "..", "public", "dados");
const VOTACAO = ANO === 2026 ? join(PUBLICO, "estadual.json") : join(PUBLICO, String(ANO), "estadual.json");

async function baixar({ url, destino }) {
  if (existsSync(destino)) return destino;
  mkdirSync(dirname(destino), { recursive: true });
  console.log(`baixando ${url}`);
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${r.status}`);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(destino + ".parcial"));
  renameSync(destino + ".parcial", destino);
  return destino;
}

async function main() {
  if (!existsSync(LOCAIS.zip)) throw new Error(`Falta ${LOCAIS.zip} (rode antes a coleta de ${ANO})`);
  const zipPerfil = await baixar(PERFIL);
  const fontes = {};

  console.log("cadastro de locais (seção → local)...");
  const secoes = criarMapaSecoes();
  await percorrerCsvDoZip(LOCAIS.zip, LOCAIS.csv,
    ["DT_GERACAO", "SG_UF", "NR_TURNO", "CD_MUNICIPIO", "NR_ZONA", "NR_SECAO", "NR_LOCAL_VOTACAO", "NR_LOCAL_VOTACAO_ORIGINAL"],
    (c, i) => {
      if (c[i.SG_UF] !== UF || c[i.NR_TURNO] !== "1") return;
      fontes.locais ??= c[i.DT_GERACAO];
      secoes.adicionar({ mun: cdMun(c[i.CD_MUNICIPIO]), zona: c[i.NR_ZONA], secao: c[i.NR_SECAO], local: c[i.NR_LOCAL_VOTACAO], localOriginal: c[i.NR_LOCAL_VOTACAO_ORIGINAL] });
    });
  console.log(`  ${secoes.tamanho.toLocaleString("pt-BR")} seções`);

  console.log(`perfil do eleitorado ${ANO} (leva alguns minutos)...`);
  const soma = criarSomaPerfil(secoes);
  // 2026 chama a quantidade de QT_ELEITORES; 2022, de QT_ELEITORES_PERFIL
  const qt = ANO === 2022 ? "QT_ELEITORES_PERFIL" : "QT_ELEITORES";
  const n = await percorrerCsvDoZip(zipPerfil, `perfil_eleitor_secao_${ANO}_${UF}.csv`,
    ["DT_GERACAO", "CD_MUNICIPIO", "NR_ZONA", "NR_SECAO", "NR_LOCAL_VOTACAO", "CD_GENERO", "CD_FAIXA_ETARIA", "CD_GRAU_ESCOLARIDADE", qt],
    (c, i) => {
      fontes.perfil ??= c[i.DT_GERACAO];
      soma.adicionar({
        mun: cdMun(c[i.CD_MUNICIPIO]), zona: c[i.NR_ZONA], secao: c[i.NR_SECAO], local: c[i.NR_LOCAL_VOTACAO],
        genero: c[i.CD_GENERO], faixa: c[i.CD_FAIXA_ETARIA], escolaridade: c[i.CD_GRAU_ESCOLARIDADE], qt: c[i[qt]],
      });
    });
  const { locais, foraDoCadastro } = soma.resultado();
  const eleitores = [...locais.values()].reduce((s, v) => s + v[0], 0);
  console.log(`  ${n.toLocaleString("pt-BR")} linhas, ${locais.size.toLocaleString("pt-BR")} locais, ${eleitores.toLocaleString("pt-BR")} eleitores (${foraDoCadastro.toLocaleString("pt-BR")} em seções fora do cadastro de locais)`);

  // cobertura: locais com voto (estadual do mesmo ano) que ganharam perfil, e votos nesses locais
  if (existsSync(VOTACAO)) {
    const D = JSON.parse(readFileSync(VOTACAO, "utf8"));
    const com = D.locais.filter((l) => locais.has(l.id));
    const votos = (ls) => ls.reduce((s, l) => s + l.total, 0);
    const pct = (a, b) => `${((100 * a) / b).toFixed(2)}%`;
    console.log(`cobertura: ${com.length}/${D.locais.length} locais da votação (${pct(com.length, D.locais.length)}), ${pct(votos(com), votos(D.locais))} dos votos nominais`);
    const faltam = D.locais.filter((l) => !locais.has(l.id)).sort((a, b) => b.total - a.total).slice(0, 5);
    if (faltam.length) console.log(`  maiores sem perfil: ${faltam.map((l) => `${l.id} ${l.nm} (${l.total})`).join("; ")}`);
  } else console.log(`(sem ${VOTACAO}: cobertura não conferida)`);

  mkdirSync(join(PUBLICO, "perfil"), { recursive: true });
  const saida = join(PUBLICO, "perfil", `${ANO}.json`);
  writeFileSync(saida, JSON.stringify({
    meta: { ano: ANO, uf: UF, geradoEm: new Date().toISOString(), fontes, eleitores, foraDoCadastro },
    cats: ["aptos", ...PERFIL_CATS.map((c) => c.id)],
    locais: Object.fromEntries([...locais].sort(([a], [b]) => a.localeCompare(b))),
  }));
  console.log(`gravado ${saida}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
