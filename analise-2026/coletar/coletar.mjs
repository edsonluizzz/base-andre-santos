#!/usr/bin/env node
// Coleta única: baixa os dados abertos do TSE e a malha do IBGE, confere cada cargo com o resultado
// oficial e grava public/dados/<cargo>.json (base), public/dados/<cargo>/<número>.json (votos por
// local de cada candidato, carregados sob demanda) e public/mapa.geo.json.
// Uso (da raiz do repo): node analise-2026/coletar/coletar.mjs [UF=PR] [--refazer] [--aceitar-divergencia]
// PR grava em public/dados/ e public/mapa.geo.json; as demais UFs em public/dados/uf/<uf>/ (com o próprio mapa.geo.json).
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { CARGOS_GERAIS } from "../public/js/config.mjs";
import { cdMun, criarAgregador } from "./agregar.mjs";
import { conferir } from "./conferir.mjs";
import { criarSomaContas } from "./contas.mjs";
import { criarLeitorLocais } from "./locais.mjs";
import { montarDados } from "./montar.mjs";
import { parseMunicipiosCfg, parseOficial } from "./oficial.mjs";
import { conferirRegioes } from "./regioes.mjs";
import { dadosUF, gravarMalha, regioesUF } from "./uf.mjs";
import { percorrerCsvDoZip } from "./zip.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CACHE = join(AQUI, "cache");
const ODSELE = "https://cdn.tse.jus.br/estatistica/sead/odsele";
const RES = "https://resultados.tse.jus.br/oficial/ele2026/6259";
const ARGS = new Set(process.argv.slice(2));
const UF = dadosUF([...ARGS].find((a) => !a.startsWith("--")) ?? "PR");
const uf = UF.sigla.toLowerCase(), PR = UF.sigla === "PR";
// No DF, o "estadual" é deputado distrital (código 8, arquivo c0008).
const cargoDaUF = (id, c) => (UF.sigla === "DF" && id === "estadual" ? { ...c, nome: "Deputado Distrital", cd: "8", oficial: "c0008" } : c);
const CARGOS = Object.fromEntries(Object.entries(CARGOS_GERAIS).map(([id, c]) => [id, cargoDaUF(id, c)]));
// Cache: o PR mantém os nomes da primeira coleta; as demais UFs ficam em cache/2026/.
const noCache = (prNome, nome) => (PR ? prNome : `2026/${nome}`);
const FONTES = {
  secao: { url: `${ODSELE}/votacao_secao/votacao_secao_2026_${UF.sigla}.zip`, arquivo: noCache("secao.zip", `votacao_secao_2026_${UF.sigla}.zip`) },
  locais: { url: `${ODSELE}/eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip`, arquivo: "locais.zip" },
  contas: { url: `${ODSELE}/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2026.zip`, arquivo: "contas.zip" },
  ...Object.fromEntries(Object.entries(CARGOS).map(([id, c]) => [`oficial-${id}`,
    { url: `${RES}/dados/${uf}/${uf}-${c.oficial}-e006259-u.json`, arquivo: noCache(id === "estadual" ? "oficial.json" : `oficial-${id}.json`, `oficial-${uf}-${id}.json`) }])),
  municipios: { url: `${RES}/config/mun-e006259-cm.json`, arquivo: "municipios.json" },
};
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

  const municipios = parseMunicipiosCfg(lerJson(arq.municipios), uf);
  if (PR) {
    const faltam = conferirRegioes(municipios.map((m) => m.nm));
    if (faltam.length) throw new Error(`Municípios das listas de região não encontrados no TSE: ${faltam.join(", ")}`);
  }
  const regiao = await regioesUF(UF.sigla);

  const fontes = {};
  const cargos = Object.entries(CARGOS).map(([id, cfg]) => {
    const oficial = parseOficial(lerJson(arq[`oficial-${id}`]));
    const validos = new Set(oficial.candidatos.filter((c) => c.valido).map((c) => c.n));
    return {
      id, cfg, oficial,
      ag: criarAgregador({ validos, legendas: new Set(oficial.legendasValidas), digitos: cfg.digitos }),
      soma: criarSomaContas(cfg.nome),
    };
  });
  const porCodigo = new Map(cargos.map((c) => [c.cfg.cd, c]));

  console.log(`lendo votação por seção ${UF.sigla} (leva alguns minutos)...`);
  const nSecao = await percorrerCsvDoZip(arq.secao, `votacao_secao_2026_${UF.sigla}.csv`,
    ["DT_GERACAO", "HH_GERACAO", "CD_CARGO", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO", "NR_VOTAVEL", "QT_VOTOS"],
    (c, i) => {
      const cargo = porCodigo.get(c[i.CD_CARGO]);
      if (!cargo) return;
      fontes.secao ??= geracao(c, i);
      cargo.ag.adicionar({ mun: cdMun(c[i.CD_MUNICIPIO]), zona: c[i.NR_ZONA], local: c[i.NR_LOCAL_VOTACAO], votavel: c[i.NR_VOTAVEL], votos: Number(c[i.QT_VOTOS]) });
    });
  console.log(`  ${nSecao.toLocaleString("pt-BR")} linhas lidas`);

  console.log("lendo locais de votação...");
  const leitorLocais = criarLeitorLocais();
  await percorrerCsvDoZip(arq.locais, `eleitorado_local_votacao_2026_${UF.sigla}.csv`,
    ["DT_GERACAO", "HH_GERACAO", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO", "NM_LOCAL_VOTACAO", "NM_BAIRRO", "NR_LATITUDE", "NR_LONGITUDE", "QT_ELEITOR_SECAO", "NR_LOCAL_VOTACAO_ORIGINAL", "NM_LOCAL_VOTACAO_ORIGINAL"],
    (c, i) => {
      fontes.locais ??= geracao(c, i);
      leitorLocais.adicionar({
        mun: cdMun(c[i.CD_MUNICIPIO]), zona: c[i.NR_ZONA], local: c[i.NR_LOCAL_VOTACAO], nome: c[i.NM_LOCAL_VOTACAO],
        bairro: c[i.NM_BAIRRO], lat: c[i.NR_LATITUDE], lon: c[i.NR_LONGITUDE], eleitores: c[i.QT_ELEITOR_SECAO],
        localOriginal: c[i.NR_LOCAL_VOTACAO_ORIGINAL], nomeOriginal: c[i.NM_LOCAL_VOTACAO_ORIGINAL],
      });
    });
  const locais = leitorLocais.resultado();

  console.log("lendo prestação de contas...");
  await percorrerCsvDoZip(arq.contas, `receitas_candidatos_2026_${UF.sigla}.csv`,
    ["DT_GERACAO", "HH_GERACAO", "SQ_CANDIDATO", "DS_CARGO", "DS_FONTE_RECEITA", "DS_ORIGEM_RECEITA", "VR_RECEITA"],
    (c, i) => {
      fontes.contas ??= geracao(c, i);
      const r = { sq: c[i.SQ_CANDIDATO], cargo: c[i.DS_CARGO], fonte: c[i.DS_FONTE_RECEITA], origem: c[i.DS_ORIGEM_RECEITA], valor: c[i.VR_RECEITA] };
      for (const cargo of cargos) cargo.soma.receita(r);
    });
  await percorrerCsvDoZip(arq.contas, `despesas_contratadas_candidatos_2026_${UF.sigla}.csv`,
    ["SQ_CANDIDATO", "DS_CARGO", "VR_DESPESA_CONTRATADA"],
    (c, i) => {
      const d = { sq: c[i.SQ_CANDIDATO], cargo: c[i.DS_CARGO], valor: c[i.VR_DESPESA_CONTRATADA] };
      for (const cargo of cargos) cargo.soma.despesa(d);
    });

  // Confere tudo antes de gravar qualquer coisa: ou saem os dois cargos, ou nenhum.
  const prontos = [];
  for (const { id, cfg, oficial, ag, soma } of cargos) {
    const agregado = ag.resultado();
    const conf = conferir(oficial.candidatos, agregado.votosMun);
    console.log(`conferência ${cfg.nome} (oficial × CSV de seção):`);
    if (conf.desconhecidos.length) {
      const total = conf.desconhecidos.reduce((s, d) => s + d.votos, 0);
      console.log(`  ${conf.desconhecidos.length} número(s) fora do oficial (registro indeferido → nulo técnico): ${total} votos — ${conf.desconhecidos.map((d) => `${d.n}=${d.votos}`).join(", ")}`);
    }
    console.log(`  ${oficial.candidatos.length - conf.divergentes.length} de ${oficial.candidatos.length} candidatos batem com o oficial`);
    if (!conf.ok) {
      console.error(`Conferência de ${cfg.nome} falhou: ${conf.divergentes.length} candidato(s) divergente(s).`);
      for (const d of conf.divergentes.slice(0, 30)) console.error(`  ${d.n} ${d.nm}: oficial ${d.oficial}, csv ${d.csv}`);
      if (!ACEITAR) {
        console.error("Nada foi gravado. Para gravar mesmo assim: --aceitar-divergencia");
        process.exitCode = 1;
        return;
      }
    }
    const dados = montarDados({
      oficial, municipios, agregado, locais, contas: soma.resultado(), regiao,
      cargo: { id, nome: cfg.nome, ano: cfg.ano, majoritario: !!cfg.majoritario, uf: UF.sigla },
      meta: { geradoEm: new Date().toISOString(), fontes: { ...fontes, oficial: oficial.geradoEm }, divergencias: conf.divergentes.length },
    });
    prontos.push({ id, dados });
  }

  const pasta = UF.pasta;
  for (const { id, dados } of prontos) {
    const dir = join(pasta, id);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (const c of dados.candidatos) {
      if (c.loc?.length) writeFileSync(join(dir, `${c.n}.json`), JSON.stringify(c.loc));
      c.loc = undefined;
    }
    writeFileSync(join(pasta, `${id}.json`), JSON.stringify(dados));
    const semCoord = dados.locais.filter((l) => l.lat == null).length;
    console.log(`${id}: ${dados.candidatos.length} candidatos, ${dados.municipios.length} municípios, ${dados.locais.length} locais (${semCoord} sem coordenada) — ${tamanho(join(pasta, `${id}.json`))}`);
  }
  console.log(`gravado ${pasta} e ${await gravarMalha(UF.sigla)}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
