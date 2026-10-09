#!/usr/bin/env node
// Coleta de eleições anteriores de uma UF a partir dos dados abertos do TSE.
//  - MUNICIPAIS (2016, 2020, 2024…: vereador e prefeito, 1º turno): cada município é uma eleição.
//  - GERAIS (2018, 2022: deputado estadual e federal): o estado inteiro é a eleição, como em 2026; grava
//    public/dados/<ano>/<cargo>.json (municípios da UF com região) e public/dados/<ano>/<cargo>/<número>.json (pago).
// Grava, por cargo e município:
//   public/dados/<ano>/<cargo>/<cd>.json      base (bairros, locais, candidatos com votos por bairro)
//   public/dados/<ano>/<cargo>/<cd>/loc.json  votos por local de todos os candidatos da cidade (parte paga)
//   public/dados/<ano>/municipios.json         índice para a busca (cidade → candidatos)
// No modo municipal o BAIRRO ocupa o lugar do "município" das eleições gerais (séries `mun`, lista `municipios`).
// Confere a soma por seção de cada candidato com o total oficial do TSE (votacao_candidato_munzona) antes de gravar.
// Uso (da raiz do repo): node analise-2026/coletar/coletar-municipal.mjs [ano=2024] [UF=PR] [--aceitar-divergencia]
// Saída: PR em public/dados/<ano>/; as demais UFs em public/dados/uf/<uf>/<ano>/ (e a malha em public/dados/uf/<uf>/mapa.geo.json).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cdMun, idLocal } from "./agregar.mjs";
import { dadosUF, gravarMalha, regioesUF } from "./uf.mjs";
import { criarSomaContas } from "./contas.mjs";
import { criarLeitorLocais } from "./locais.mjs";
import { percorrerCsvDoZip } from "./zip.mjs";

const [ANO = "2024", ufArg = "PR"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const UF = ufArg.toUpperCase();
const ACEITAR = process.argv.includes("--aceitar-divergencia");
const AQUI = dirname(fileURLToPath(import.meta.url));
const CACHE = join(AQUI, "cache", ANO);
const PUBLICO = join(dadosUF(UF).pasta, ANO); // PR: public/dados/<ano>; demais: public/dados/uf/<uf>/<ano>
const GERAL = Number(ANO) % 4 === 2; // 2018, 2022: eleições gerais; 2016, 2020, 2024: municipais
const CARGOS = GERAL
  ? {
    1: { id: "presidente", nome: "Presidente", majoritario: true, nacional: true }, // votos no estado; arquivos _BR
    3: { id: "governador", nome: "Governador", majoritario: true },
    5: { id: "senador", nome: "Senador", majoritario: true },
    6: { id: "federal", nome: "Deputado Federal", majoritario: false },
    7: { id: "estadual", nome: "Deputado Estadual", majoritario: false },
    8: { id: "estadual", nome: "Deputado Distrital", majoritario: false }, // DF (no lugar do estadual)
  }
  : { 11: { id: "prefeito", nome: "Prefeito", majoritario: true }, 13: { id: "vereador", nome: "Vereador", majoritario: false } };
// "área" de uma eleição: a cidade (municipais) ou a UF inteira (gerais)
const area = (cd) => (GERAL ? UF : cd);
const BRANCO = "95", NULO = "96";

const num = (s) => Number(String(s ?? "").replace(/\./g, "").replace(",", ".")) || 0;
// "ELEITO POR QP" → "Eleito por QP"; "NÃO ELEITO" → "Não eleito"; "2º TURNO" → "2º turno"
const titulo = (s) => {
  const t = String(s ?? "").toLowerCase();
  return (t.charAt(0).toUpperCase() + t.slice(1)).replace(/\bqp\b/, "QP");
};
const arq = (nome) => {
  const caminho = join(CACHE, nome);
  if (!existsSync(caminho)) throw new Error(`Falta ${caminho} (baixe os dados abertos do TSE de ${ANO})`);
  return caminho;
};
const filho = (m, k, criar) => { let v = m.get(k); if (!v) m.set(k, (v = criar())); return v; };
const somar = (m, k, v) => m.set(k, (m.get(k) ?? 0) + v);

async function main() {
  // municípios da UF (TSE → IBGE), da configuração do resultado oficial já usada na coleta estadual
  const cfg = JSON.parse(readFileSync(join(AQUI, "cache", "municipios.json"), "utf8"));
  const uf = cfg.abr.find((a) => a.cd.toLowerCase() === UF.toLowerCase());
  const MUN = new Map(uf.mu.map((m) => [m.cd, { cd: m.cd, ibge: m.cdi, nm: m.nm }]));
  const regiao = await regioesUF(UF);
  if (GERAL) await gravarMalha(UF);

  console.log("vagas...");
  const vagas = new Map(); // `${cargo}:${cd}` → vagas
  await percorrerCsvDoZip(arq(`consulta_vagas_${ANO}.zip`), `consulta_vagas_${ANO}_${UF}.csv`, ["SG_UE", "CD_CARGO", "QT_VAGA"],
    (c, i) => { if (CARGOS[c[i.CD_CARGO]]) vagas.set(`${c[i.CD_CARGO]}:${c[i.SG_UE]}`, num(c[i.QT_VAGA])); });

  console.log("totais oficiais por candidato (munzona)...");
  const oficial = new Map(); // `${cargo}:${cd}` → Map(sq → candidato)
  const partidoPorNumero = new Map(); // `${cd}:${nr}` → sigla (para atribuir voto de legenda)
  let geracao = null;
  const lerMunzona = (csv, soNacional) => percorrerCsvDoZip(arq(`votacao_candidato_munzona_${ANO}.zip`), csv,
    ["SG_UF", "DT_GERACAO", "HH_GERACAO", "NR_TURNO", "CD_MUNICIPIO", "CD_CARGO", "SQ_CANDIDATO", "NR_CANDIDATO", "NM_URNA_CANDIDATO", "NR_PARTIDO", "SG_PARTIDO",
      "NR_FEDERACAO", "NM_FEDERACAO", "SG_FEDERACAO", "QT_VOTOS_NOMINAIS", "NM_TIPO_DESTINACAO_VOTOS", "DS_SIT_TOT_TURNO"],
    (c, i) => {
      if (!CARGOS[c[i.CD_CARGO]] || c[i.SG_UF] !== UF || !!CARGOS[c[i.CD_CARGO]].nacional !== soNacional) return;
      geracao ??= `${c[i.DT_GERACAO]} ${c[i.HH_GERACAO]}`;
      const chave = `${c[i.CD_CARGO]}:${area(cdMun(c[i.CD_MUNICIPIO]))}`;
      const cand = filho(filho(oficial, chave, () => new Map()), c[i.SQ_CANDIDATO], () => ({
        sq: c[i.SQ_CANDIDATO], n: c[i.NR_CANDIDATO], nm: c[i.NM_URNA_CANDIDATO], sg: c[i.SG_PARTIDO],
        fed: c[i.NR_FEDERACAO] !== "-1" ? { nm: c[i.NM_FEDERACAO], sg: c[i.SG_FEDERACAO] } : null,
        valido: false, votos: 0, votos2: null, st: null,
      }));
      partidoPorNumero.set(`${area(cdMun(c[i.CD_MUNICIPIO]))}:${c[i.NR_PARTIDO]}`, c[i.SG_PARTIDO]);
      if (c[i.NR_TURNO] === "1") {
        cand.votos += num(c[i.QT_VOTOS_NOMINAIS]);
        cand.valido ||= c[i.NM_TIPO_DESTINACAO_VOTOS].startsWith("Válido");
        cand.st = titulo(c[i.DS_SIT_TOT_TURNO]);
      } else {
        cand.votos2 = (cand.votos2 ?? 0) + num(c[i.QT_VOTOS_NOMINAIS]);
        cand.st2 = titulo(c[i.DS_SIT_TOT_TURNO]);
      }
    });
  await lerMunzona(`votacao_candidato_munzona_${ANO}_${UF}.csv`, false);
  if (GERAL) await lerMunzona(`votacao_candidato_munzona_${ANO}_BR.csv`, true);

  console.log("locais de votação...");
  const leitor = criarLeitorLocais();
  const bairroDoLocal = new Map();
  await percorrerCsvDoZip(arq(`eleitorado_local_votacao_${ANO}.zip`), `eleitorado_local_votacao_${ANO}.csv`,
    ["SG_UF", "NR_TURNO", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO", "NM_LOCAL_VOTACAO", "NM_BAIRRO", "NR_LATITUDE", "NR_LONGITUDE", "QT_ELEITOR_SECAO", "NR_LOCAL_VOTACAO_ORIGINAL", "NM_LOCAL_VOTACAO_ORIGINAL"],
    (c, i) => {
      if (c[i.SG_UF] !== UF || c[i.NR_TURNO] !== "1") return;
      leitor.adicionar({
        mun: cdMun(c[i.CD_MUNICIPIO]), zona: c[i.NR_ZONA], local: c[i.NR_LOCAL_VOTACAO], nome: c[i.NM_LOCAL_VOTACAO], bairro: c[i.NM_BAIRRO],
        lat: c[i.NR_LATITUDE], lon: c[i.NR_LONGITUDE], eleitores: c[i.QT_ELEITOR_SECAO],
        localOriginal: c[i.NR_LOCAL_VOTACAO_ORIGINAL], nomeOriginal: c[i.NM_LOCAL_VOTACAO_ORIGINAL],
      });
    });
  const locais = leitor.resultado();

  console.log("votação por seção (1º turno)...");
  const ag = new Map(); // `${cargo}:${cd}` → agregado da cidade
  const novoAg = () => ({ candLocal: new Map(), candTotal: new Map(), validoLocal: new Map(), nominalLocal: new Map(), legenda: new Map(), legendaLocal: new Map(), brancos: 0, nulos: 0, nomesLocal: new Map() });
  let geracaoSecao = null;
  const lerSecao = (zip, csv, soNacional) => percorrerCsvDoZip(zip, csv,
    ["SG_UF", "DT_GERACAO", "HH_GERACAO", "NR_TURNO", "CD_MUNICIPIO", "NR_ZONA", "CD_CARGO", "NR_VOTAVEL", "QT_VOTOS", "NR_LOCAL_VOTACAO", "SQ_CANDIDATO", "NM_LOCAL_VOTACAO"],
    (c, i) => {
      if (c[i.NR_TURNO] !== "1" || !CARGOS[c[i.CD_CARGO]] || c[i.SG_UF] !== UF || !!CARGOS[c[i.CD_CARGO]].nacional !== soNacional) return;
      geracaoSecao ??= `${c[i.DT_GERACAO]} ${c[i.HH_GERACAO]}`;
      const cd = cdMun(c[i.CD_MUNICIPIO]), chave = `${c[i.CD_CARGO]}:${area(cd)}`;
      const a = filho(ag, chave, novoAg);
      const id = idLocal(cd, c[i.NR_ZONA], c[i.NR_LOCAL_VOTACAO]);
      const v = num(c[i.QT_VOTOS]), nr = c[i.NR_VOTAVEL], sq = c[i.SQ_CANDIDATO];
      a.nomesLocal.set(id, c[i.NM_LOCAL_VOTACAO]);
      if (Number(sq) > 0) { // voto em candidato; legenda vem com SQ -3, branco/nulo com -1
        somar(a.candTotal, sq, v);
        const cand = oficial.get(chave)?.get(sq);
        if (cand?.valido) {
          somar(filho(a.candLocal, sq, () => new Map()), id, v);
          somar(a.nominalLocal, id, v);
          somar(a.validoLocal, id, v);
        }
      } else if (nr === BRANCO) a.brancos += v;
      else if (nr === NULO) a.nulos += v;
      else if (!CARGOS[c[i.CD_CARGO]].majoritario && nr.length === 2) {
        const sg = partidoPorNumero.get(`${area(cd)}:${nr}`);
        if (sg) { somar(a.legenda, sg, v); somar(a.validoLocal, id, v); somar(a.legendaLocal, id, v); }
      }
    });
  await lerSecao(arq(`votacao_secao_${ANO}_${UF}.zip`), `votacao_secao_${ANO}_${UF}.csv`, false);
  // presidente: arquivo nacional (só as seções da UF)
  if (GERAL && existsSync(join(CACHE, `votacao_secao_${ANO}_BR.zip`))) {
    console.log("votação por seção de presidente (arquivo nacional)...");
    await lerSecao(arq(`votacao_secao_${ANO}_BR.zip`), `votacao_secao_${ANO}_BR.csv`, true);
  }

  console.log("prestação de contas...");
  const contas = {};
  const zipContas = join(CACHE, `prestacao_contas_${ANO}.zip`);
  if (existsSync(zipContas)) {
    for (const k of Object.keys(CARGOS)) contas[k] = criarSomaContas(CARGOS[k].nome);
    let gerContas = null;
    await percorrerCsvDoZip(zipContas, `receitas_candidatos_${ANO}_${UF}.csv`,
      ["DT_GERACAO", "HH_GERACAO", "SQ_CANDIDATO", "DS_CARGO", "DS_FONTE_RECEITA", "DS_ORIGEM_RECEITA", "VR_RECEITA"],
      (c, i) => {
        gerContas ??= `${c[i.DT_GERACAO]} ${c[i.HH_GERACAO]}`;
        const r = { sq: c[i.SQ_CANDIDATO], cargo: c[i.DS_CARGO], fonte: c[i.DS_FONTE_RECEITA], origem: c[i.DS_ORIGEM_RECEITA], valor: c[i.VR_RECEITA] };
        for (const s of Object.values(contas)) s.receita(r);
      });
    await percorrerCsvDoZip(zipContas, `despesas_contratadas_candidatos_${ANO}_${UF}.csv`, ["SQ_CANDIDATO", "DS_CARGO", "VR_DESPESA_CONTRATADA"],
      (c, i) => { for (const s of Object.values(contas)) s.despesa({ sq: c[i.SQ_CANDIDATO], cargo: c[i.DS_CARGO], valor: c[i.VR_DESPESA_CONTRATADA] }); });
    contas.geracao = gerContas;
  } else console.log("  (sem arquivo de contas: custo do voto fica sem dado)");

  // conferência: soma por seção = total oficial de cada candidato (1º turno)
  let total = 0, divergentes = [];
  for (const [chave, cands] of oficial) {
    const a = ag.get(chave);
    for (const c of cands.values()) {
      total++;
      const s = a?.candTotal.get(c.sq) ?? 0;
      if (s !== c.votos) divergentes.push(`${chave} ${c.n} ${c.nm}: oficial ${c.votos}, seção ${s}`);
    }
  }
  console.log(`conferência: ${total - divergentes.length} de ${total} candidatos batem com o total oficial`);
  if (divergentes.length) {
    divergentes.slice(0, 20).forEach((d) => console.error("  " + d));
    if (!ACEITAR) { console.error("Nada foi gravado. Para gravar mesmo assim: --aceitar-divergencia"); process.exitCode = 1; return; }
  }

  // gravação
  rmSync(PUBLICO, { recursive: true, force: true });
  const indice = new Map();
  const centavos = (v) => Math.round(v * 100) / 100;
  for (const [chave, cands] of oficial) {
    const [cdCargo, cd] = chave.split(":");
    const cargo = CARGOS[cdCargo], m = GERAL ? { nm: UF } : MUN.get(cd);
    const a = ag.get(chave);
    if (!m || !a) continue;
    // locais com voto válido neste cargo e a "unidade" de cada um: bairro (municipais) ou município (gerais)
    const ids = [...a.validoLocal.keys()].sort();
    const bairroNome = (id) => (GERAL ? id.split("-")[0] : String(locais.get(id)?.bairro ?? "").trim().toUpperCase() || "(SEM BAIRRO)");
    const validosBairro = new Map();
    for (const id of ids) somar(validosBairro, bairroNome(id), a.validoLocal.get(id));
    const bairros = GERAL
      ? [...MUN.values()].map((x) => ({ cd: x.cd, ibge: x.ibge, nm: x.nm, regiao: regiao(x), validos: validosBairro.get(x.cd) ?? 0 }))
      : [...validosBairro].sort((x, y) => y[1] - x[1]).map(([nm, validos], k) => ({ cd: String(k), ibge: null, nm, regiao: null, validos }));
    const idxBairro = new Map(bairros.map((b, k) => [GERAL ? b.cd : b.nm, k]));
    const idxLocal = new Map(ids.map((id, j) => [id, j]));
    const locaisOut = ids.map((id) => {
      const l = locais.get(id);
      return { id, mun: idxBairro.get(bairroNome(id)), nm: l?.nm ?? a.nomesLocal.get(id) ?? `Local ${id}`, bairro: l?.bairro ?? null,
        lat: l?.lat == null ? null : Math.round(l.lat * 1e5) / 1e5, lon: l?.lon == null ? null : Math.round(l.lon * 1e5) / 1e5,
        aptos: l?.aptos ?? 0, total: a.nominalLocal.get(id) ?? 0 };
    });
    // trava: todo local precisa cair numa unidade (município/bairro); senão o código do município não bateu
    const orfao = locaisOut.find((l) => l.mun == null);
    if (orfao) throw new Error(`Local ${orfao.id} (${cargo.id}) sem município na lista do TSE`);
    const contasCargo = contas[cdCargo]?.resultado();
    const loc = {};
    const candidatos = [...cands.values()].filter((c) => c.valido).sort((x, y) => y.votos - x.votos).map((c) => {
      const porLocal = a.candLocal.get(c.sq) ?? new Map();
      const porBairro = new Map();
      for (const [id, v] of porLocal) somar(porBairro, idxBairro.get(bairroNome(id)), v);
      if (porLocal.size) loc[c.n] = [...porLocal].map(([id, v]) => [idxLocal.get(id), v]).sort((x, y) => y[1] - x[1]);
      // presidente: a receita é da campanha nacional; dividir pelos votos do estado não faz sentido
      const r = cargo.nacional ? null : contasCargo?.receitas.get(c.sq), d = cargo.nacional ? null : contasCargo?.despesas.get(c.sq);
      return {
        // eleito no 1º turno ou, para prefeito, no 2º turno
        n: c.n, sq: c.sq, nm: c.nm, sg: c.sg, fed: c.fed?.nm ?? null, st: c.st2 ?? c.st, eleito: /^Eleito/.test(c.st2 ?? c.st ?? ""), votos: c.votos,
        ...(c.votos2 != null ? { votos2: c.votos2, st1: c.st } : {}),
        receita: r ? centavos(r.total) : null, despesa: d != null ? centavos(d) : null,
        receitaPorOrigem: r ? Object.fromEntries(Object.entries(r.porOrigem).map(([k, v]) => [k, centavos(v)])) : null,
        mun: [...porBairro].sort((x, y) => y[1] - x[1]),
      };
    });
    // agremiações: partido isolado ou federação (proporcional); no majoritário, o partido de cada candidato
    const agrs = new Map();
    for (const c of candidatos) {
      const k = c.fed ?? c.sg;
      const g = filho(agrs, k, () => ({ nm: k, rotulo: k, federacao: !!c.fed, siglas: [], vagas: 0, nominais: 0, legenda: 0 }));
      if (!g.siglas.includes(c.sg)) g.siglas.push(c.sg);
      g.nominais += c.votos;
      if (c.eleito) g.vagas++;
    }
    for (const g of agrs.values()) {
      g.legenda = g.siglas.reduce((s, sg) => s + (a.legenda.get(sg) ?? 0), 0);
      if (g.federacao) g.rotulo = g.siglas.join(" / ");
    }
    const nominais = candidatos.reduce((s, c) => s + c.votos, 0);
    const legenda = [...a.legenda.values()].reduce((s, v) => s + v, 0);
    const validos = nominais + legenda, nVagas = vagas.get(chave) ?? (cargo.majoritario ? 1 : 0);
    const dados = {
      meta: { geradoEm: new Date().toISOString(), fontes: { oficial: geracao, secao: geracaoSecao, locais: geracaoSecao, contas: contas.geracao ?? null }, divergencias: 0 },
      cargo: {
        id: `${cargo.id}-${ANO}`, nome: cargo.nome, ano: Number(ANO), escopo: GERAL ? "estado" : "municipio", majoritario: cargo.majoritario,
        ...(GERAL ? { uf: UF } : { municipio: { cd, nm: m.nm, ibge: m.ibge } }), vagas: nVagas, qe: cargo.majoritario || !nVagas ? null : Math.round(validos / nVagas),
        validos, nominais, legenda, brancos: a.brancos, nulos: a.nulos,
      },
      agremiacoes: [...agrs.values()],
      municipios: bairros,
      locais: locaisOut,
      candidatos,
    };
    const dir = join(PUBLICO, cargo.id);
    if (GERAL) {
      // como 2026: base pública do cargo + um arquivo pago por candidato com os votos por local
      mkdirSync(dir, { recursive: true });
      for (const [n, pares] of Object.entries(loc)) writeFileSync(join(dir, `${n}.json`), JSON.stringify(pares));
      writeFileSync(join(PUBLICO, `${cargo.id}.json`), JSON.stringify(dados));
      console.log(`${cargo.id}-${ANO}: ${candidatos.length} candidatos, ${nVagas} vagas, QE ${dados.cargo.qe}, ${locaisOut.length} locais`);
      continue;
    }
    mkdirSync(join(dir, cd), { recursive: true });
    writeFileSync(join(dir, `${cd}.json`), JSON.stringify(dados));
    writeFileSync(join(dir, cd, "loc.json"), JSON.stringify(loc));
    const e = filho(indice, cd, () => ({ cd, nm: m.nm, ibge: m.ibge }));
    e[cargo.id] = candidatos.length;
  }
  if (GERAL) return;
  const lista = [...indice.values()].sort((x, y) => x.nm.localeCompare(y.nm, "pt-BR"));
  writeFileSync(join(PUBLICO, "municipios.json"), JSON.stringify(lista));
  console.log(`gravado public/dados/${ANO}: ${lista.length} municípios, ${lista.reduce((s, x) => s + (x.vereador ?? 0), 0)} vereadores, ${lista.reduce((s, x) => s + (x.prefeito ?? 0), 0)} candidatos a prefeito`);
}

main().catch((e) => { console.error(e.stack ?? e.message); process.exitCode = 1; });
