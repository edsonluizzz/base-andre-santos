#!/usr/bin/env node
// Coleta única: baixa os dados abertos do TSE e a malha do IBGE, confere com o resultado oficial
// e grava public/dados.json + public/mapa.geo.json.
// Uso (da raiz do repo): node analise-2026/coletar/coletar.mjs [--refazer] [--aceitar-divergencia]
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { FOCO, PARTIDO, RIVAIS_IGREJA } from "../public/js/config.mjs";
import { criarAgregador } from "./agregar.mjs";
import { CARGOS_DOBRADA, calcularDobradas, criarAgregadorCargos } from "./dobradas.mjs";
import { conferir } from "./conferir.mjs";
import { criarSomaContas } from "./contas.mjs";
import { criarLeitorLocais } from "./locais.mjs";
import { orientarParaD3 } from "./malha.mjs";
import { montarDados } from "./montar.mjs";
import { parseMunicipiosCfg, parseOficial } from "./oficial.mjs";
import { conferirRegioes } from "./regioes.mjs";
import { percorrerCsvDoZip } from "./zip.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CACHE = join(AQUI, "cache");
const PUBLICO = join(AQUI, "..", "public");
const ODSELE = "https://cdn.tse.jus.br/estatistica/sead/odsele";
const RES = "https://resultados.tse.jus.br/oficial/ele2026/6259";
const FONTES = {
  secao: { url: `${ODSELE}/votacao_secao/votacao_secao_2026_PR.zip`, arquivo: "secao.zip" },
  locais: { url: `${ODSELE}/eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip`, arquivo: "locais.zip" },
  contas: { url: `${ODSELE}/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2026.zip`, arquivo: "contas.zip" },
  oficial: { url: `${RES}/dados/pr/pr-c0007-e006259-u.json`, arquivo: "oficial.json" },
  municipios: { url: `${RES}/config/mun-e006259-cm.json`, arquivo: "municipios.json" },
  oficial6: { url: `${RES}/dados/pr/pr-c0006-e006259-u.json`, arquivo: "oficial-c0006.json" },
  oficial5: { url: `${RES}/dados/pr/pr-c0005-e006259-u.json`, arquivo: "oficial-c0005.json" },
  oficial3: { url: `${RES}/dados/pr/pr-c0003-e006259-u.json`, arquivo: "oficial-c0003.json" },
  malha: { url: "https://servicodados.ibge.gov.br/api/v3/malhas/estados/41?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio", arquivo: "malha.geojson" },
};
const ARGS = new Set(process.argv.slice(2));
const REFAZER = ARGS.has("--refazer");
const ACEITAR = ARGS.has("--aceitar-divergencia");

async function baixar({ url, arquivo }) {
  const destino = join(CACHE, arquivo);
  if (!REFAZER && existsSync(destino)) return destino;
  console.log(`baixando ${url}`);
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${r.status}`);
  const tmp = destino + ".parcial";
  await pipeline(Readable.fromWeb(r.body), createWriteStream(tmp));
  renameSync(tmp, destino);
  return destino;
}

const lerJson = (arq) => JSON.parse(readFileSync(arq, "utf8"));
const tamanho = (arq) => `${(statSync(arq).size / 1e6).toFixed(1)} MB`;
const geracao = (c, i) => `${c[i.DT_GERACAO]} ${c[i.HH_GERACAO]}`;

async function main() {
  mkdirSync(CACHE, { recursive: true });
  const arq = {};
  for (const [nome, fonte] of Object.entries(FONTES)) arq[nome] = await baixar(fonte);

  const oficial = parseOficial(lerJson(arq.oficial));
  const municipios = parseMunicipiosCfg(lerJson(arq.municipios));
  const faltam = conferirRegioes(municipios.map((m) => m.nm));
  if (faltam.length) throw new Error(`Municípios das listas de região não encontrados no TSE: ${faltam.join(", ")}`);
  for (const n of [FOCO, ...RIVAIS_IGREJA]) {
    if (!oficial.candidatos.some((c) => c.n === n)) throw new Error(`Candidato ${n} não está no resultado oficial`);
  }

  const validos = new Set(oficial.candidatos.filter((c) => c.valido).map((c) => c.n));
  const focoLocal = new Set([...oficial.candidatos.filter((c) => c.sg === PARTIDO).map((c) => c.n), FOCO, ...RIVAIS_IGREJA]);
  const fontes = { oficial: oficial.geradoEm };
  const outros = Object.fromEntries(Object.keys(CARGOS_DOBRADA).map((c) => [c, parseOficial(lerJson(arq[`oficial${c}`]))]));
  const agCargos = criarAgregadorCargos(new Map(Object.entries(outros).map(([c, o]) => [c, new Set(o.candidatos.filter((x) => x.valido).map((x) => x.n))])));

  console.log("lendo votação por seção (830 MB; leva alguns minutos)...");
  const ag = criarAgregador({ validos, legendas: new Set(oficial.legendasValidas), focoLocal });
  const nSecao = await percorrerCsvDoZip(arq.secao, "votacao_secao_2026_PR.csv",
    ["DT_GERACAO", "HH_GERACAO", "CD_CARGO", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO", "NR_VOTAVEL", "QT_VOTOS"],
    (c, i) => {
      const cargo = c[i.CD_CARGO];
      if (cargo !== "7") {
        agCargos.adicionar({ cargo, mun: c[i.CD_MUNICIPIO], zona: c[i.NR_ZONA], local: c[i.NR_LOCAL_VOTACAO], votavel: c[i.NR_VOTAVEL], votos: Number(c[i.QT_VOTOS]) });
        return;
      }
      fontes.secao ??= geracao(c, i);
      ag.adicionar({ mun: c[i.CD_MUNICIPIO], zona: c[i.NR_ZONA], local: c[i.NR_LOCAL_VOTACAO], votavel: c[i.NR_VOTAVEL], votos: Number(c[i.QT_VOTOS]) });
    });
  console.log(`  ${nSecao.toLocaleString("pt-BR")} linhas lidas`);

  console.log("lendo locais de votação...");
  const leitorLocais = criarLeitorLocais();
  await percorrerCsvDoZip(arq.locais, "eleitorado_local_votacao_2026_PR.csv",
    ["DT_GERACAO", "HH_GERACAO", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO", "NM_LOCAL_VOTACAO", "NM_BAIRRO", "NR_LATITUDE", "NR_LONGITUDE", "QT_ELEITOR_SECAO", "NR_LOCAL_VOTACAO_ORIGINAL", "NM_LOCAL_VOTACAO_ORIGINAL"],
    (c, i) => {
      fontes.locais ??= geracao(c, i);
      leitorLocais.adicionar({
        mun: c[i.CD_MUNICIPIO], zona: c[i.NR_ZONA], local: c[i.NR_LOCAL_VOTACAO], nome: c[i.NM_LOCAL_VOTACAO],
        bairro: c[i.NM_BAIRRO], lat: c[i.NR_LATITUDE], lon: c[i.NR_LONGITUDE], eleitores: c[i.QT_ELEITOR_SECAO],
        localOriginal: c[i.NR_LOCAL_VOTACAO_ORIGINAL], nomeOriginal: c[i.NM_LOCAL_VOTACAO_ORIGINAL],
      });
    });

  console.log("lendo prestação de contas...");
  const soma = criarSomaContas();
  await percorrerCsvDoZip(arq.contas, "receitas_candidatos_2026_PR.csv",
    ["DT_GERACAO", "HH_GERACAO", "SQ_CANDIDATO", "DS_CARGO", "DS_FONTE_RECEITA", "DS_ORIGEM_RECEITA", "VR_RECEITA"],
    (c, i) => {
      fontes.contas ??= geracao(c, i);
      soma.receita({ sq: c[i.SQ_CANDIDATO], cargo: c[i.DS_CARGO], fonte: c[i.DS_FONTE_RECEITA], origem: c[i.DS_ORIGEM_RECEITA], valor: c[i.VR_RECEITA] });
    });
  await percorrerCsvDoZip(arq.contas, "despesas_contratadas_candidatos_2026_PR.csv",
    ["SQ_CANDIDATO", "DS_CARGO", "VR_DESPESA_CONTRATADA"],
    (c, i) => soma.despesa({ sq: c[i.SQ_CANDIDATO], cargo: c[i.DS_CARGO], valor: c[i.VR_DESPESA_CONTRATADA] }));

  const agregado = ag.resultado();
  const conf = conferir(oficial.candidatos, agregado.votosMun);
  console.log("conferência (oficial × CSV de seção):");
  for (const n of [FOCO, ...RIVAIS_IGREJA]) {
    const c = oficial.candidatos.find((x) => x.n === n);
    const csv = [...(agregado.votosMun.get(n)?.values() ?? [])].reduce((a, b) => a + b, 0);
    console.log(`  ${c.nm.padEnd(22)} oficial ${String(c.votos).padStart(7)}   csv ${String(csv).padStart(7)}`);
  }
  if (conf.desconhecidos.length) {
    const total = conf.desconhecidos.reduce((s, d) => s + d.votos, 0);
    console.log(`  ${conf.desconhecidos.length} número(s) fora do oficial (registro indeferido → nulo técnico): ${total} votos — ${conf.desconhecidos.map((d) => `${d.n}=${d.votos}`).join(", ")}`);
  }
  console.log(`  ${oficial.candidatos.length - conf.divergentes.length} de ${oficial.candidatos.length} candidatos batem com o oficial`);
  if (!conf.ok) {
    console.error(`Conferência falhou: ${conf.divergentes.length} candidato(s) divergente(s).`);
    for (const d of conf.divergentes.slice(0, 30)) console.error(`  ${d.n} ${d.nm}: oficial ${d.oficial}, csv ${d.csv}`);
    if (!ACEITAR) {
      console.error("Nada foi gravado. Para gravar mesmo assim: --aceitar-divergencia");
      process.exitCode = 1;
      return;
    }
  }

  // Dobradas: afinidade do André com cada candidato a federal, senador e governador.
  const porCargo = agCargos.resultado();
  const dobradas = { totais: {} };
  for (const [cargo, nome] of Object.entries(CARGOS_DOBRADA)) {
    const ag = porCargo.get(cargo);
    const div = outros[cargo].candidatos.filter((x) => x.valido && [...(ag.votos.get(x.n)?.values() ?? [])].reduce((a, b) => a + b, 0) !== x.votos).length;
    console.log(`  ${nome}: ${outros[cargo].candidatos.length} candidatos${div ? `, ${div} com soma diferente do oficial` : ", somas batem com o oficial"}`);
    dobradas[nome] = calcularDobradas({
      candidatos: outros[cargo].candidatos, agregado: ag, ids: [...agregado.totalLocal.keys()],
      andre: agregado.votosLocal.get(FOCO), totAndre: agregado.totalLocal,
      comMapa: (l, k) => nome !== "federal" || k < 15 || l.sg === PARTIDO,
    });
    dobradas.totais[nome] = ag.total;
  }

  const dados = montarDados({ dobradas,
    oficial, municipios, agregado, locais: leitorLocais.resultado(), contas: soma.resultado(), focoLocal,
    meta: { geradoEm: new Date().toISOString(), fontes, divergencias: conf.divergentes.length },
  });
  const semCoord = dados.locais.filter((l) => l.lat == null).length;
  writeFileSync(join(PUBLICO, "dados.json"), JSON.stringify(dados));
  writeFileSync(join(PUBLICO, "mapa.geo.json"), JSON.stringify(orientarParaD3(lerJson(arq.malha))));
  console.log(`${dados.candidatos.length} candidatos, ${dados.municipios.length} municípios, ${dados.locais.length} locais (${semCoord} sem coordenada)`);
  console.log(`gravado public/dados.json (${tamanho(join(PUBLICO, "dados.json"))}) e public/mapa.geo.json (${tamanho(join(PUBLICO, "mapa.geo.json"))})`);
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
