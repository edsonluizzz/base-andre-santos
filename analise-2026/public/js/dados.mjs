import { CORES_SERIE, MAX_COMPARADOS, UF, raizDados } from "./config.mjs";
import { pearson } from "./calc.mjs";

const normal = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

export function indexar(dados) {
  const locaisPorMun = new Map();
  dados.locais.forEach((l, j) => {
    if (!locaisPorMun.has(l.mun)) locaisPorMun.set(l.mun, []);
    locaisPorMun.get(l.mun).push(j);
  });
  return {
    ...dados,
    porNumero: new Map(dados.candidatos.map((c) => [c.n, c])),
    munPorIbge: new Map(dados.municipios.map((m, i) => [m.ibge, i])),
    munPorCd: new Map(dados.municipios.map((m, i) => [m.cd, i])),
    locaisPorMun,
  };
}

// Município digitado no seletor: nome exato (sem acento/caixa) ou prefixo que só um município tem.
export function acharMunicipio(D, texto) {
  const t = normal(texto);
  if (!t) return null;
  const nomes = D.municipios.map((m) => normal(m.nm));
  const exato = nomes.indexOf(t);
  if (exato >= 0) return exato;
  const pref = nomes.flatMap((n, i) => (n.startsWith(t) ? [i] : []));
  return pref.length === 1 ? pref[0] : null;
}

// Unidade geográfica das séries "mun": nas eleições gerais é o município do estado; nas municipais
// (cargo.escopo = "municipio") é o bairro da cidade. Telas e relatório escrevem os textos a partir daqui.
const tituloNome = (s) => String(s ?? "").toLowerCase().replace(/(^|[\s-])(\S)/g, (m, a, b) => a + b.toUpperCase())
  .replace(/\s(Da|De|Do|Das|Dos|E)\s/g, (w) => w.toLowerCase());
export function unidade(D) {
  if (D.cargo?.escopo === "municipio") {
    const cidade = tituloNome(D.cargo.municipio.nm);
    return { municipal: true, um: "bairro", uns: "bairros", Um: "Bairro", Uns: "Bairros", area: cidade, naArea: `em ${cidade}`, daArea: `de ${cidade}`, todo: "Cidade inteira", ano: D.cargo.ano };
  }
  // "no PR"/"do PR", "na BA"/"da BA", "em SC"/"de SC"; "Paraná inteiro", "Bahia inteira"
  const de = { no: "do", na: "da", em: "de" }[UF.em];
  return { municipal: false, um: "município", uns: "municípios", Um: "Município", Uns: "Municípios", area: UF.nome, naArea: `${UF.em} ${UF.sigla}`, daArea: `${de} ${UF.sigla}`, todo: `${UF.nome} ${UF.em === "na" ? "inteira" : "inteiro"}`, ano: D.cargo?.ano ?? 2026 };
}
// "BAIRRO · MUNICÍPIO" do local (nas municipais a unidade já é o bairro: só ele).
export const ondeLocal = (D, l) => (D.cargo?.escopo === "municipio" ? (l.bairro ?? D.municipios[l.mun]?.nm ?? "") : `${l.bairro ?? ""} · ${D.municipios[l.mun].nm}`);

export const idxMunicipio = (D, cd) => D.munPorCd.get(cd) ?? null;
export const locaisDoMunicipio = (D, i) => D.locaisPorMun.get(i) ?? [];

export function rankingNoMunicipio(D, i) {
  return D.candidatos
    .map((c) => ({ c, v: c.mun.find(([k]) => k === i)?.[1] ?? 0 }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
}

// Seleção de candidatos vinda da URL ("10456,30777"); nada válido = todos.
export function lerSelecao(param, opcoes) {
  const pedidos = String(param ?? "").split(",");
  const ok = opcoes.filter((n) => pedidos.includes(n));
  return ok.length ? ok : [...opcoes];
}

export const restringir = (mapa, chaves) => (chaves ? new Map([...mapa].filter(([k]) => chaves.has(k))) : mapa);

// Índice (município ou local) → votos. "loc" vem do arquivo do candidato (garantirLocais); antes disso, vazio.
export const serie = (c, nivel) => new Map((nivel === "loc" ? c.loc : c.mun) ?? []);

export function percentuais(D, c, nivel) {
  const out = new Map();
  for (const [i, v] of serie(c, nivel)) {
    const den = nivel === "loc" ? D.locais[i].total : D.municipios[i].validos;
    out.set(i, den ? v / den : 0);
  }
  return out;
}

// Partido ou federação do candidato; a chapa é a agremiação inteira (federação = vários partidos).
export const agremiacaoDe = (D, c) => D.agremiacoes.find((a) => a.siglas.includes(c.sg)) ?? null;
export function chapa(D, c) {
  const siglas = agremiacaoDe(D, c)?.siglas ?? [c.sg];
  return D.candidatos.filter((x) => siglas.includes(x.sg)).sort((a, b) => b.votos - a.votos);
}

export function posicaoGeral(D, n) {
  return [...D.candidatos].sort((a, b) => b.votos - a.votos).findIndex((c) => c.n === n) + 1;
}

// "ANDRÉ SANTOS" → "André Santos" (nome de urna, para textos e cabeçalhos).
const MINUSC = new Set(["DA", "DE", "DO", "DAS", "DOS", "E"]);
export const nomeCurto = (c) => String(c?.nm ?? "").toLowerCase().split(/\s+/)
  .map((p, i) => (i && MINUSC.has(p.toUpperCase()) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(" ");

// Texto do campo de busca: número, "NOME · número · PARTIDO" (opção da lista) ou nome único.
export function buscarCandidato(D, texto) {
  const t = String(texto ?? "").trim();
  if (!t) return null;
  const num = t.match(/(?:^|·\s*)(\d{2,5})(?:\s*·|$)/)?.[1];
  if (num && D.porNumero.has(num)) return D.porNumero.get(num);
  const n = normal(t);
  const exato = D.candidatos.find((c) => normal(c.nm) === n);
  if (exato) return exato;
  const parte = D.candidatos.filter((c) => normal(c.nm).includes(n));
  return parte.length === 1 ? parte[0] : null;
}
export const rotuloCandidato = (c) => `${c.nm} · ${c.n} · ${c.sg}`;

// Concorrentes sugeridos: tamanho parecido (¼ a 4× os votos) e mesma geografia (correlação do % por município).
export function sugerirConcorrentes(D, foco, k = MAX_COMPARADOS) {
  if (!foco.votos) return [];
  const pf = percentuais(D, foco, "mun");
  return D.candidatos
    .filter((c) => c.n !== foco.n && c.votos >= foco.votos / 4 && c.votos <= foco.votos * 4)
    .map((c) => ({ c, r: pearson(pf, percentuais(D, c, "mun")) ?? -1 }))
    .sort((a, b) => b.r - a.r)
    .slice(0, k)
    .map((x) => x.c);
}

// "vs" da URL: lista de números; ausente = sugestão automática; "-" = nenhum.
export function lerComparados(D, foco, param) {
  if (param == null) return sugerirConcorrentes(D, foco);
  const vistos = new Set([foco.n]);
  const out = [];
  for (const n of String(param).split(",")) {
    const c = D.porNumero.get(n.trim());
    if (c && !vistos.has(c.n) && out.length < MAX_COMPARADOS) { vistos.add(c.n); out.push(c); }
  }
  return out;
}

// Cor de cada candidato em todas as telas: principal laranja, comparados na ordem.
export function coresDe(foco, comparados) {
  return new Map([foco, ...comparados].map((c, i) => [c.n, `var(${CORES_SERIE[i]})`]));
}
export const varCorDe = (foco, comparados) => new Map([foco, ...comparados].map((c, i) => [c.n, CORES_SERIE[i]]));

export const comparaveis = (D, foco) => D.candidatos.filter((c) => c.n !== foco.n).sort((a, b) => b.votos - a.votos);

// Candidato B do comparador: o pedido, senão o 1º comparado, senão o mais votado.
export function escolherB(D, foco, comparados, n) {
  const ops = comparaveis(D, foco);
  return ops.find((c) => c.n === n) ?? comparados[0] ?? ops[0];
}

// Votos por local de cada candidato vêm de um arquivo próprio (dados/<cargo>/<número>.json).
// Candidato sem voto não tem arquivo: fica com lista vazia.
// Pasta dos arquivos por candidato: "estadual" (2026) ou "2022/estadual" (anos anteriores, id "estadual-2022").
const pastaCargo = (D) => (D.cargo.id.includes("-") ? `${D.cargo.ano}/${D.cargo.id.split("-")[0]}` : D.cargo.id);
// No modo demonstração o arquivo é o do número real (nOrig) e os votos são multiplicados pelo fator do candidato.
export async function garantirLocais(D, numeros, buscar) {
  // Municipais: um arquivo com os votos por local de todos os candidatos da cidade (dados/<ano>/<cargo>/<cd>/loc.json).
  if (D.cargo?.escopo === "municipio") {
    if (D.candidatos.some((c) => c.loc)) return;
    const [cargo, ano] = D.cargo.id.split("-");
    const tudo = (await buscar(`${raizDados()}${ano}/${cargo}/${D.cargo.municipio.cd}/loc.json`)) ?? {};
    for (const c of D.candidatos) c.loc = tudo[c.n] ?? [];
    return;
  }
  const cands = [...new Set(numeros.map((n) => D.porNumero.get(n)).filter((c) => c && !c.loc))];
  await Promise.all(cands.map(async (c) => {
    const loc = (c.votos ? await buscar(`${raizDados()}${pastaCargo(D)}/${c.nOrig ?? c.n}.json`) : null) ?? [];
    c.loc = c.fatorVotos ? loc.map(([j, v]) => [j, Math.max(1, Math.round(v * c.fatorVotos))]) : loc;
  }));
}

// Regiões do estado: no PR, Curitiba/RMC/Litoral/Interior; nas demais UFs, as regiões intermediárias do IBGE
// (todas aparecem, mesmo com zero, na ordem em que surgem). Nas municipais não se aplica (objeto vazio).
export function porRegiao(D, c) {
  if (D.cargo?.escopo === "municipio") return {};
  const r = UF.sigla === "PR" ? { Curitiba: 0, RMC: 0, Litoral: 0, Interior: 0 } : {};
  for (const m of D.municipios) r[m.regiao] ??= 0;
  for (const [i, v] of c.mun) r[D.municipios[i].regiao] += v;
  return r;
}

export function porBairro(D, c, municipio = UF.capital) {
  const daCidade = (l) => D.municipios[l.mun].nm === municipio;
  const acc = new Map();
  for (const [j, v] of c.loc ?? []) {
    const l = D.locais[j];
    if (!daCidade(l)) continue;
    const k = l.bairro ?? "(sem bairro)";
    const x = acc.get(k) ?? { bairro: k, votos: 0, total: 0 };
    x.votos += v;
    acc.set(k, x);
  }
  // denominador: votos nominais de todos os locais do bairro, não só onde o candidato teve voto
  for (const l of D.locais) {
    if (!daCidade(l)) continue;
    const x = acc.get(l.bairro ?? "(sem bairro)");
    if (x) x.total += l.total;
  }
  return [...acc.values()].sort((a, b) => b.votos - a.votos);
}
