# Análise da eleição 2026 PR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard local, animado e interativo que mostra de onde vieram os votos do André Santos (do município ao local de votação), quanto custou cada voto, e o compara com qualquer estadual do NOVO e com os rivais da igreja (Fabio Oliveira, Mara Lima, Dirlete Pinheiro).

**Architecture:** Um script de coleta (Node, sem dependências) lê uma vez os dados abertos do TSE (votação por seção, locais de votação, prestação de contas) + resultado oficial + malha do IBGE, confere os totais contra o oficial e grava `public/dados.json` + `public/mapa.geo.json`. Uma página estática (HTML + módulos ES + D3 local) lê esses arquivos e desenha 5 telas. Um servidor estático mínimo serve a pasta localmente.

**Tech Stack:** Node v24 (`node:test`, `fetch`, `unzip` do macOS), JavaScript puro em módulos `.mjs`, D3 v7 em `public/vendor/`, Chrome headless para verificação visual.

**Spec:** `docs/superpowers/specs/2026-10-05-analise-eleicao-2026-design.md`

## Global Constraints
- Tudo dentro de `analise-2026/`; não importa nada de `src/` e nada de `src/` importa dele. Fora do menu e da Vercel.
- Zero dependências npm. Sem etapa de build. D3 v7.9.0 copiado para `analise-2026/public/vendor/d3.v7.min.js`.
- Todos os caminhos em `public/` são **relativos** (fase 2 vai servir a pasta sob um subcaminho do ovile).
- `dados.json` só contém dado público do TSE/IBGE. Gasto interno vem de `public/interno.json` (opcional, gitignored).
- Candidatos: `FOCO = "30777"`, `PARTIDO = "NOVO"`, `RIVAIS_IGREJA = ["30300", "10456", "22622"]`, padrão do comparador `"30300"`. Números de candidato são **strings**.
- R$/voto principal = receita ÷ votos; secundário = despesa contratada ÷ votos; sem valor → "sem dado"; 0 voto → "—".
- Conferência: soma do CSV por candidato = `vap` oficial, tolerância 0; divergência aborta sem gravar, salvo `--aceitar-divergencia`.
- Textos de interface em português do Brasil, com acentos.
- Testes: `node --test analise-2026/test/*.teste.mjs` (rodar da raiz do repo).
- Commit + push ao fim de cada tarefa (preferência do Edson para este repo).

## Review Focus
- Candidato sem receita/despesa declarada, ou com 0 voto → a tela mostra "sem dado"/"—", nunca "R$ 0,00", "NaN" ou "Infinity" (testes em Task 7: `rsPorVoto`, `reais`; formato da tabela em Task 10).
- CSV do TSE com `;` ou quebra de linha dentro de aspas, `""` escapado, CRLF, linha cortada entre dois pedaços do stream → registro íntegro (Task 1).
- Arquivo ausente dentro do ZIP ou `unzip` falhando → a coleta aborta com mensagem e não grava nada (Task 2).
- Município do CSV de seção que não está na lista do TSE → `montarDados` lança erro com o código (Task 5).
- URL com tela inexistente ou `b` inválido (o próprio André, candidato fora da chapa/rivais, número inexistente) → cai no padrão sem quebrar (Task 7: `lerRota`, `escolherB`).

---

## Mapa de arquivos

```
analise-2026/
  coletar/
    csv.mjs        Task 1  campos(), linhasCsv(), indices()
    zip.mjs        Task 2  linhasDoZip(), percorrerCsvDoZip()
    regioes.mjs    Task 2  regiaoDe(), conferirRegioes(), REGIOES
    oficial.mjs    Task 2  parseOficial(), parseMunicipiosCfg()
    agregar.mjs    Task 3  idLocal(), classificarVotavel(), criarAgregador()
    locais.mjs     Task 3  criarLeitorLocais()
    contas.mjs     Task 4  valorBR(), categoriaReceita(), criarSomaContas()
    conferir.mjs   Task 5  conferir()
    montar.mjs     Task 5  montarDados()
    coletar.mjs    Task 6  orquestração (CLI)
    cache/         (gitignored)
  public/
    index.html     Task 8
    css/estilo.css Task 8
    dados.json     Task 6 (gerado, versionado)
    mapa.geo.json  Task 6 (gerado, versionado)
    interno.json   Task 13 (gitignored)
    vendor/d3.v7.min.js  Task 8
    js/
      config.mjs   Task 1  FOCO, PARTIDO, RIVAIS_IGREJA, PADRAO_B, CORES_IGREJA, CATEGORIAS_RECEITA
      fmt.mjs      Task 7  inteiro, reais, reaisCurto, pct, esc
      rota.mjs     Task 7  lerRota, escreverRota
      dados.mjs    Task 7  indexar, serie, percentuais, chapa, posicaoGeral, comparaveis, escolherB, porRegiao, porBairro
      calc.mjs     Task 7  rsPorVoto, concentracao, sobreposicao, pearson, diferenca, vencedor
      tabela.mjs   Task 7 (ordenar) / Task 8 (tabela)
      dica.mjs     Task 8  mostrarDica, esconderDica
      animar.mjs   Task 8  reduzido, contar, barras
      mapa.mjs     Task 8  cor, escalaSeq, escalaDiv, criarMapa, legenda
      main.mjs     Task 8 (+1 linha por tela nas Tasks 9–12)
      telas/panorama.mjs Task 8, andre.mjs Task 9, custo.mjs Task 10, comparador.mjs Task 11, igreja.mjs Task 12
  test/            fx.mjs + *.teste.mjs
  servidor.mjs     Task 8
  verificar.sh     Task 8
  analise.command  Task 8
  README.md        Task 13
```

---

### Task 1: Estrutura, configuração e leitor de CSV do TSE

**Files:**
- Create: `analise-2026/public/js/config.mjs`
- Create: `analise-2026/coletar/csv.mjs`
- Create: `analise-2026/test/csv.teste.mjs`
- Modify: `.gitignore` (acrescentar no fim)

**Interfaces:**
- Produces: `campos(linha: string): string[]`; `linhasCsv(fonte: AsyncIterable<Buffer|string>): AsyncGenerator<string[]>` (primeiro item = cabeçalho); `indices(cabecalho: string[], nomes: string[], arquivo?: string): Record<string, number>` (lança `Coluna X ausente em arquivo`).
- Produces (config): `FOCO`, `PARTIDO`, `RIVAIS_IGREJA`, `PADRAO_B`, `CORES_IGREJA`, `CATEGORIAS_RECEITA`.

- [ ] **Step 1: Configuração compartilhada**

`analise-2026/public/js/config.mjs`:
```js
// Configuração compartilhada pela coleta (Node) e pela página.
export const FOCO = "30777";
export const PARTIDO = "NOVO";
export const RIVAIS_IGREJA = ["30300", "10456", "22622"];
export const PADRAO_B = "30300";
export const CORES_IGREJA = { 30777: "var(--laranja)", 30300: "var(--azul)", 10456: "var(--rosa)", 22622: "var(--roxo)" };
// Ordem fixa das categorias de receita (coleta e gráfico usam a mesma lista).
export const CATEGORIAS_RECEITA = ["FEFC", "Fundo Partidário", "Partido (outros recursos)", "Pessoas físicas", "Recursos próprios", "Outros candidatos", "Outros"];
```

Acrescentar ao fim de `.gitignore`:
```
# analise-2026
/analise-2026/coletar/cache/
/analise-2026/public/interno.json
```

- [ ] **Step 2: Teste que falha**

`analise-2026/test/csv.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { campos, indices, linhasCsv } from "../coletar/csv.mjs";

const coletar = async (fonte) => { const out = []; for await (const l of linhasCsv(fonte)) out.push(l); return out; };

test("campos: texto entre aspas, número sem aspas", () => {
  assert.deepEqual(campos('"05/10/2026";2026;"PARANÁ";78255'), ["05/10/2026", "2026", "PARANÁ", "78255"]);
});

test("campos: ; dentro de aspas e aspas duplas escapadas", () => {
  assert.deepEqual(campos('"A;B";"diz ""oi""";3'), ["A;B", 'diz "oi"', "3"]);
});

test("campos: campo vazio no meio e no fim", () => {
  assert.deepEqual(campos('"a";;"c";'), ["a", "", "c", ""]);
});

test("linhasCsv: latin1, CRLF e linha partida entre pedaços", async () => {
  const bytes = Buffer.from('"NOME";"QT"\r\n"JOS\xc9";10\r\n"MAR', "latin1");
  const resto = Buffer.from('IA";20\r\n', "latin1");
  assert.deepEqual(await coletar([bytes, resto]), [["NOME", "QT"], ["JOSÉ", "10"], ["MARIA", "20"]]);
});

test("linhasCsv: quebra de linha dentro de aspas fica no mesmo registro", async () => {
  const txt = '"ID";"DESC"\n1;"linha um\nlinha dois"\n2;"ok"\n';
  assert.deepEqual(await coletar([Buffer.from(txt, "latin1")]), [["ID", "DESC"], ["1", "linha um\nlinha dois"], ["2", "ok"]]);
});

test("linhasCsv: última linha sem \\n e linhas vazias ignoradas", async () => {
  assert.deepEqual(await coletar([Buffer.from('"A"\n\n1', "latin1")]), [["A"], ["1"]]);
});

test("indices: mapeia nomes e acusa coluna ausente", () => {
  assert.deepEqual(indices(["X", "Y", "Z"], ["Z", "X"]), { Z: 2, X: 0 });
  assert.throws(() => indices(["X"], ["W"], "arq.csv"), /Coluna W ausente em arq\.csv/);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test analise-2026/test/csv.teste.mjs`
Expected: FAIL — `Cannot find module '.../coletar/csv.mjs'`.

- [ ] **Step 4: Implementação**

`analise-2026/coletar/csv.mjs`:
```js
// Leitor dos CSVs de dados abertos do TSE: Latin-1, separador ";", campos de texto entre aspas
// (podem conter ";", quebra de linha e "" escapado), campos numéricos sem aspas.

export function campos(linha) {
  const out = [];
  const n = linha.length;
  let i = 0;
  while (true) {
    if (linha[i] === '"') {
      let valor = "";
      let j = i + 1;
      while (true) {
        const k = linha.indexOf('"', j);
        if (k === -1) { valor += linha.slice(j); j = n; break; }
        if (linha[k + 1] === '"') { valor += linha.slice(j, k) + '"'; j = k + 2; continue; }
        valor += linha.slice(j, k);
        j = k + 1;
        break;
      }
      out.push(valor);
      if (j >= n) break;
      i = j + 1; // pula o ";"
    } else {
      const k = linha.indexOf(";", i);
      if (k === -1) { out.push(linha.slice(i)); break; }
      out.push(linha.slice(i, k));
      i = k + 1;
    }
  }
  return out;
}

function aspasImpares(s) {
  let c = 0;
  for (let i = s.indexOf('"'); i !== -1; i = s.indexOf('"', i + 1)) c++;
  return c % 2 === 1;
}

export async function* linhasCsv(fonte) {
  const dec = new TextDecoder("latin1");
  let buf = "";
  let acumulado = null; // registro com aspas abertas: continua na próxima linha física
  const fechar = (linha) => {
    acumulado = acumulado === null ? linha : acumulado + "\n" + linha;
    if (aspasImpares(acumulado)) return null;
    const pronto = acumulado;
    acumulado = null;
    return pronto;
  };
  for await (const pedaco of fonte) {
    buf += typeof pedaco === "string" ? pedaco : dec.decode(pedaco, { stream: true });
    let ini = 0;
    let fim;
    while ((fim = buf.indexOf("\n", ini)) !== -1) {
      let linha = buf.slice(ini, fim);
      ini = fim + 1;
      if (linha.endsWith("\r")) linha = linha.slice(0, -1);
      const pronto = fechar(linha);
      if (pronto) yield campos(pronto);
    }
    buf = buf.slice(ini);
  }
  buf += dec.decode();
  if (buf.endsWith("\r")) buf = buf.slice(0, -1);
  if (buf !== "" || acumulado !== null) {
    const pronto = acumulado === null ? buf : acumulado + "\n" + buf;
    if (pronto) yield campos(pronto);
  }
}

export function indices(cabecalho, nomes, arquivo = "CSV") {
  const out = {};
  for (const nome of nomes) {
    const i = cabecalho.indexOf(nome);
    if (i === -1) throw new Error(`Coluna ${nome} ausente em ${arquivo}`);
    out[nome] = i;
  }
  return out;
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test analise-2026/test/csv.teste.mjs`
Expected: PASS (7 testes).

- [ ] **Step 6: Commit**

```bash
git add .gitignore analise-2026/public/js/config.mjs analise-2026/coletar/csv.mjs analise-2026/test/csv.teste.mjs
git commit -m "feat(analise-2026): leitor de CSV do TSE e configuração compartilhada"
git push
```

---

### Task 2: Leitura de ZIP, regiões e resultado oficial

**Files:**
- Create: `analise-2026/coletar/zip.mjs`, `analise-2026/coletar/regioes.mjs`, `analise-2026/coletar/oficial.mjs`
- Test: `analise-2026/test/zip.teste.mjs`, `analise-2026/test/regioes.teste.mjs`, `analise-2026/test/oficial.teste.mjs`

**Interfaces:**
- Consumes: `linhasCsv`, `indices` (Task 1).
- Produces:
  - `linhasDoZip(zip: string, entrada: string): AsyncGenerator<string[]>` — lança `unzip falhou (...)` se o `unzip` sair com código ≠ 0.
  - `percorrerCsvDoZip(zip, entrada, colunas: string[], fn: (campos: string[], idx: Record<string,number>) => void): Promise<number>` — retorna nº de linhas de dados; lança `<entrada> veio vazio de <zip>`.
  - `REGIOES = ["Curitiba","RMC","Litoral","Interior"]`; `regiaoDe(nome: string): string`; `conferirRegioes(nomes: string[]): string[]` (nomes das listas ausentes).
  - `parseOficial(json) → { geradoEm: string, cargo: {vagas,qe,validos,nominais,legenda,brancos,nulos}, agremiacoes: [{nm,rotulo,federacao,siglas,vagas,nominais,legenda}], candidatos: [{n,sq,nm,sg,fed,st,eleito,valido,votos}] }` (candidatos ordenados por votos desc).
  - `parseMunicipiosCfg(cfg) → [{cd, ibge, nm}]`.

- [ ] **Step 1: Testes que falham**

`analise-2026/test/zip.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { percorrerCsvDoZip } from "../coletar/zip.mjs";

function zipCom(arquivos) {
  const dir = mkdtempSync(join(tmpdir(), "analise-zip-"));
  for (const [nome, conteudo] of Object.entries(arquivos)) writeFileSync(join(dir, nome), Buffer.from(conteudo, "latin1"));
  execFileSync("zip", ["-q", "-j", join(dir, "t.zip"), ...Object.keys(arquivos).map((n) => join(dir, n))]);
  return join(dir, "t.zip");
}

test("percorre o CSV dentro do zip pelas colunas pedidas", async () => {
  const zip = zipCom({ "a.csv": '"NOME";"QT";"X"\n"JOS\xc9";10;"a"\n"ANA";5;"b"\n' });
  const vistos = [];
  const n = await percorrerCsvDoZip(zip, "a.csv", ["QT", "NOME"], (c, i) => vistos.push([c[i.NOME], c[i.QT]]));
  assert.equal(n, 2);
  assert.deepEqual(vistos, [["JOSÉ", "10"], ["ANA", "5"]]);
});

test("arquivo ausente no zip: erro, não lista vazia", async () => {
  const zip = zipCom({ "a.csv": '"A"\n1\n' });
  await assert.rejects(percorrerCsvDoZip(zip, "nao-existe.csv", ["A"], () => {}), /unzip falhou|veio vazio/);
});

test("coluna ausente: erro com o nome da coluna", async () => {
  const zip = zipCom({ "a.csv": '"A"\n1\n' });
  await assert.rejects(percorrerCsvDoZip(zip, "a.csv", ["B"], () => {}), /Coluna B ausente em a\.csv/);
});
```

`analise-2026/test/regioes.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { conferirRegioes, regiaoDe, REGIOES } from "../coletar/regioes.mjs";

test("classifica por nome, ignorando acento e caixa", () => {
  assert.equal(regiaoDe("CURITIBA"), "Curitiba");
  assert.equal(regiaoDe("SÃO JOSÉ DOS PINHAIS"), "RMC");
  assert.equal(regiaoDe("PARANAGUÁ"), "Litoral");
  assert.equal(regiaoDe("Pontal do Paraná"), "Litoral");
  assert.equal(regiaoDe("LONDRINA"), "Interior");
  assert.deepEqual(REGIOES, ["Curitiba", "RMC", "Litoral", "Interior"]);
});

test("conferirRegioes aponta nomes das listas que não existem no TSE", () => {
  const faltam = conferirRegioes(["CURITIBA", "PARANAGUÁ"]);
  assert.ok(faltam.includes("COLOMBO"));
  assert.ok(!faltam.includes("PARANAGUA"));
  assert.equal(faltam.length, 28 + 6);
});
```

`analise-2026/test/oficial.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { parseMunicipiosCfg, parseOficial } from "../coletar/oficial.mjs";

const json = {
  dg: "04/10/2026", hg: "23:59:59",
  v: { vv: "1000", vnom: "900", vl: "100", vb: "40", tvn: "20" },
  carg: [{ nv: "54", qe: "114449", agr: [
    { nm: "PARTIDO NOVO", tp: "i", com: "NOVO", vag: "3", par: [{ sg: "NOVO", tvtn: "371998", tvtl: "35192", cand: [
      { n: "30777", sqcand: "160002542346", nmu: "ANDRÉ SANTOS", st: "Suplente", e: "n", dvt: "Válido", vap: "9481" },
      { n: "30123", sqcand: "1", nmu: "ELEITO", st: "Eleito por QP", e: "s", dvt: "Válido", vap: "80000" },
    ] }] },
    { nm: "FEDERAÇÃO X", tp: "f", com: "PT / PV", vag: "8", par: [
      { sg: "PT", tvtn: "500", tvtl: "50", cand: [{ n: "13000", sqcand: "2", nmu: "FULANO", st: "Não eleito", e: "n", dvt: "Anulado sub judice", vap: "120" }] },
      { sg: "PV", tvtn: "100", tvtl: "10", cand: [] },
    ] },
  ] }],
};

test("parseOficial: cargo, agremiações e candidatos", () => {
  const r = parseOficial(json);
  assert.equal(r.geradoEm, "04/10/2026 23:59:59");
  assert.deepEqual(r.cargo, { vagas: 54, qe: 114449, validos: 1000, nominais: 900, legenda: 100, brancos: 40, nulos: 20 });
  assert.deepEqual(r.agremiacoes[0], { nm: "PARTIDO NOVO", rotulo: "NOVO", federacao: false, siglas: ["NOVO"], vagas: 3, nominais: 371998, legenda: 35192 });
  assert.deepEqual(r.agremiacoes[1], { nm: "FEDERAÇÃO X", rotulo: "PT / PV", federacao: true, siglas: ["PT", "PV"], vagas: 8, nominais: 600, legenda: 60 });
  assert.deepEqual(r.candidatos.map((c) => c.n), ["30123", "30777", "13000"]);
  const andre = r.candidatos[1];
  assert.deepEqual(andre, { n: "30777", sq: "160002542346", nm: "ANDRÉ SANTOS", sg: "NOVO", fed: null, st: "Suplente", eleito: false, valido: true, votos: 9481 });
  assert.equal(r.candidatos[2].fed, "FEDERAÇÃO X");
  assert.equal(r.candidatos[2].valido, false);
});

test("parseOficial sem cargo: erro claro", () => {
  assert.throws(() => parseOficial({}), /sem cargo/);
});

test("parseMunicipiosCfg: só PR, com código IBGE", () => {
  const cfg = { abr: [{ cd: "SC", mu: [{ cd: "1", cdi: "2", nm: "X" }] }, { cd: "PR", mu: [{ cd: "75353", cdi: "4106902", nm: "CURITIBA", c: "s", z: ["1"] }] }] };
  assert.deepEqual(parseMunicipiosCfg(cfg), [{ cd: "75353", ibge: "4106902", nm: "CURITIBA" }]);
  assert.throws(() => parseMunicipiosCfg({ abr: [] }), /PR não encontrada/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test analise-2026/test/zip.teste.mjs analise-2026/test/regioes.teste.mjs analise-2026/test/oficial.teste.mjs`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Implementação**

`analise-2026/coletar/zip.mjs`:
```js
import { spawn } from "node:child_process";
import { indices, linhasCsv } from "./csv.mjs";

// Lê um CSV de dentro do zip sem extrair para o disco (o de seção tem 830 MB).
export async function* linhasDoZip(zip, entrada) {
  const p = spawn("unzip", ["-p", zip, entrada], { stdio: ["ignore", "pipe", "pipe"] });
  let erro = "";
  p.stderr.on("data", (d) => (erro += d));
  const saida = new Promise((resolve, reject) => {
    p.on("error", reject);
    p.on("close", resolve);
  });
  yield* linhasCsv(p.stdout);
  const codigo = await saida;
  if (codigo !== 0) throw new Error(`unzip falhou (código ${codigo}) lendo ${entrada} de ${zip}: ${erro.trim()}`);
}

export async function percorrerCsvDoZip(zip, entrada, colunas, fn) {
  let idx = null;
  let n = 0;
  for await (const c of linhasDoZip(zip, entrada)) {
    if (!idx) { idx = indices(c, colunas, entrada); continue; }
    fn(c, idx);
    n++;
  }
  if (!idx) throw new Error(`${entrada} veio vazio de ${zip}`);
  return n;
}
```

`analise-2026/coletar/regioes.mjs`:
```js
// Regiões usadas na análise. RMC = lei estadual (29 municípios, Curitiba à parte); Litoral = 7 municípios.
export const REGIOES = ["Curitiba", "RMC", "Litoral", "Interior"];

export const RMC = [
  "ADRIANOPOLIS", "AGUDOS DO SUL", "ALMIRANTE TAMANDARE", "ARAUCARIA", "BALSA NOVA", "BOCAIUVA DO SUL",
  "CAMPINA GRANDE DO SUL", "CAMPO DO TENENTE", "CAMPO LARGO", "CAMPO MAGRO", "CERRO AZUL", "COLOMBO",
  "CONTENDA", "DOUTOR ULYSSES", "FAZENDA RIO GRANDE", "ITAPERUCU", "LAPA", "MANDIRITUBA", "PIEN",
  "PINHAIS", "PIRAQUARA", "QUATRO BARRAS", "QUITANDINHA", "RIO BRANCO DO SUL", "RIO NEGRO",
  "SAO JOSE DOS PINHAIS", "TIJUCAS DO SUL", "TUNAS DO PARANA",
];
export const LITORAL = ["ANTONINA", "GUARAQUECABA", "GUARATUBA", "MATINHOS", "MORRETES", "PARANAGUA", "PONTAL DO PARANA"];

const normal = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

export function regiaoDe(nome) {
  const n = normal(nome);
  if (n === "CURITIBA") return "Curitiba";
  if (RMC.includes(n)) return "RMC";
  if (LITORAL.includes(n)) return "Litoral";
  return "Interior";
}

export function conferirRegioes(nomes) {
  const existentes = new Set(nomes.map(normal));
  return [...RMC, ...LITORAL, "CURITIBA"].filter((n) => !existentes.has(n));
}
```

`analise-2026/coletar/oficial.mjs`:
```js
// Resultado oficial de Deputado Estadual (arquivo pr-c0007-e006259-u.json do TSE).
const num = (s) => {
  const v = Number(String(s ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

export function parseOficial(json) {
  const cargo = json?.carg?.[0];
  if (!cargo) throw new Error("Resultado oficial sem cargo (carg[0])");
  const agremiacoes = [];
  const candidatos = [];
  for (const agr of cargo.agr ?? []) {
    const federacao = agr.tp === "f";
    const siglas = agr.par.map((p) => p.sg);
    agremiacoes.push({
      nm: agr.nm,
      rotulo: federacao ? agr.com : siglas[0],
      federacao,
      siglas,
      vagas: num(agr.vag),
      nominais: agr.par.reduce((s, p) => s + num(p.tvtn), 0),
      legenda: agr.par.reduce((s, p) => s + num(p.tvtl), 0),
    });
    for (const par of agr.par) {
      for (const c of par.cand ?? []) {
        candidatos.push({
          n: c.n, sq: c.sqcand, nm: c.nmu, sg: par.sg, fed: federacao ? agr.nm : null,
          st: c.st, eleito: c.e === "s", valido: c.dvt === "Válido", votos: num(c.vap),
        });
      }
    }
  }
  candidatos.sort((a, b) => b.votos - a.votos);
  return {
    geradoEm: `${json.dg} ${json.hg}`,
    cargo: {
      vagas: num(cargo.nv), qe: num(cargo.qe), validos: num(json.v?.vv), nominais: num(json.v?.vnom),
      legenda: num(json.v?.vl), brancos: num(json.v?.vb), nulos: num(json.v?.tvn),
    },
    agremiacoes,
    candidatos,
  };
}

export function parseMunicipiosCfg(cfg) {
  const pr = (cfg?.abr ?? []).find((a) => a.cd.toLowerCase() === "pr");
  if (!pr) throw new Error("UF PR não encontrada na lista de municípios do TSE");
  return pr.mu.map((m) => ({ cd: m.cd, ibge: m.cdi, nm: m.nm }));
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test analise-2026/test/zip.teste.mjs analise-2026/test/regioes.teste.mjs analise-2026/test/oficial.teste.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add analise-2026/coletar/zip.mjs analise-2026/coletar/regioes.mjs analise-2026/coletar/oficial.mjs analise-2026/test/zip.teste.mjs analise-2026/test/regioes.teste.mjs analise-2026/test/oficial.teste.mjs
git commit -m "feat(analise-2026): leitura de zip, regiões e resultado oficial"
git push
```

---

### Task 3: Agregação da votação por seção e dos locais de votação

**Files:**
- Create: `analise-2026/coletar/agregar.mjs`, `analise-2026/coletar/locais.mjs`
- Test: `analise-2026/test/agregar.teste.mjs`, `analise-2026/test/locais.teste.mjs`

**Interfaces:**
- Produces:
  - `idLocal(mun, zona, local): string` → `"75353-3-1155"` (zona e local normalizados com `Number`).
  - `classificarVotavel(nr: string, validos: Set<string>): "nominal"|"anulado"|"legenda"|"descartado"`.
  - `criarAgregador({ validos: Set<string>, focoLocal: Set<string> })` → `{ adicionar({mun, zona, local, votavel, votos}), resultado() }`, onde `resultado()` = `{ votosMun: Map<n, Map<cdMun, votos>>, votosLocal: Map<n, Map<localId, votos>>, totalLocal: Map<localId, nominaisVálidos>, validosMun: Map<cdMun, nominais+legenda> }`.
  - `criarLeitorLocais()` → `{ adicionar({mun, zona, local, nome, bairro, lat, lon, eleitores}), resultado(): Map<localId, {nm, bairro, lat, lon, aptos}> }`.

- [ ] **Step 1: Testes que falham**

`analise-2026/test/agregar.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { classificarVotavel, criarAgregador, idLocal } from "../coletar/agregar.mjs";

test("idLocal normaliza zeros à esquerda", () => {
  assert.equal(idLocal("75353", "0003", "01155"), "75353-3-1155");
});

test("classificarVotavel", () => {
  const validos = new Set(["30777"]);
  assert.equal(classificarVotavel("30777", validos), "nominal");
  assert.equal(classificarVotavel("12345", validos), "anulado");
  assert.equal(classificarVotavel("30", validos), "legenda");
  for (const nr of ["95", "96", "97"]) assert.equal(classificarVotavel(nr, validos), "descartado");
});

test("agregador: município, local, válidos e anulados", () => {
  const ag = criarAgregador({ validos: new Set(["30777", "10456"]), focoLocal: new Set(["30777"]) });
  const s = (mun, zona, local, votavel, votos) => ag.adicionar({ mun, zona, local, votavel, votos });
  s("75353", "3", "1155", "30777", 4);
  s("75353", "3", "1155", "30777", 1); // outra seção do mesmo local
  s("75353", "3", "1155", "10456", 2);
  s("75353", "4", "1392", "30777", 3);
  s("75353", "4", "1392", "30", 5);     // legenda
  s("75353", "4", "1392", "95", 7);     // branco
  s("78255", "59", "1244", "12345", 6); // anulado sub judice
  const r = ag.resultado();
  assert.deepEqual([...r.votosMun.get("30777")], [["75353", 8]]);
  assert.deepEqual([...r.votosMun.get("12345")], [["78255", 6]]);
  assert.deepEqual([...r.votosLocal.get("30777")], [["75353-3-1155", 5], ["75353-4-1392", 3]]);
  assert.equal(r.votosLocal.has("10456"), false); // fora do foco
  assert.deepEqual([...r.totalLocal], [["75353-3-1155", 7], ["75353-4-1392", 3]]);
  assert.deepEqual([...r.validosMun], [["75353", 15]]); // 8 + 2 + 5; anulado e branco fora
});
```

`analise-2026/test/locais.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { criarLeitorLocais } from "../coletar/locais.mjs";

test("soma eleitores das seções e converte coordenadas", () => {
  const l = criarLeitorLocais();
  l.adicionar({ mun: "75353", zona: "3", local: "1155", nome: "ESCOLA ESTADUAL SANTA ROSA", bairro: "CAJURU", lat: "-25,4759288", lon: "-49,1950276", eleitores: "378" });
  l.adicionar({ mun: "75353", zona: "003", local: "1155", nome: "ESCOLA ESTADUAL SANTA ROSA", bairro: "CAJURU", lat: "-25,4759288", lon: "-49,1950276", eleitores: "300" });
  l.adicionar({ mun: "75353", zona: "4", local: "9", nome: "X", bairro: "#NULO#", lat: "-1", lon: "", eleitores: "10" });
  const r = l.resultado();
  assert.deepEqual(r.get("75353-3-1155"), { nm: "ESCOLA ESTADUAL SANTA ROSA", bairro: "CAJURU", lat: -25.4759288, lon: -49.1950276, aptos: 678 });
  assert.deepEqual(r.get("75353-4-9"), { nm: "X", bairro: null, lat: null, lon: null, aptos: 10 });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test analise-2026/test/agregar.teste.mjs analise-2026/test/locais.teste.mjs`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Implementação**

`analise-2026/coletar/agregar.mjs`:
```js
// Agrega a votação por seção (Dep. Estadual) por município e por local de votação.
export const idLocal = (mun, zona, local) => `${mun}-${Number(zona)}-${Number(local)}`;

// 5 dígitos = candidato (válido ou anulado sub judice); 2 dígitos = legenda; 95/96/97 = branco/nulo/anulado.
export function classificarVotavel(nr, validos) {
  const s = String(nr);
  if (s.length === 5) return validos.has(s) ? "nominal" : "anulado";
  if (s.length === 2 && !["95", "96", "97"].includes(s)) return "legenda";
  return "descartado";
}

const somar = (mapa, k, v) => mapa.set(k, (mapa.get(k) ?? 0) + v);
const filho = (mapa, k) => {
  let m = mapa.get(k);
  if (!m) mapa.set(k, (m = new Map()));
  return m;
};

export function criarAgregador({ validos, focoLocal }) {
  const votosMun = new Map();
  const votosLocal = new Map();
  const totalLocal = new Map();
  const validosMun = new Map();
  return {
    adicionar({ mun, zona, local, votavel, votos }) {
      const tipo = classificarVotavel(votavel, validos);
      if (tipo === "descartado") return;
      if (tipo === "legenda") { somar(validosMun, mun, votos); return; }
      // anulado entra em votosMun para a conferência com o "vap" oficial bater, mas não conta como válido
      somar(filho(votosMun, votavel), mun, votos);
      if (tipo !== "nominal") return;
      somar(validosMun, mun, votos);
      const id = idLocal(mun, zona, local);
      somar(totalLocal, id, votos);
      if (focoLocal.has(votavel)) somar(filho(votosLocal, votavel), id, votos);
    },
    resultado: () => ({ votosMun, votosLocal, totalLocal, validosMun }),
  };
}
```

`analise-2026/coletar/locais.mjs`:
```js
import { idLocal } from "./agregar.mjs";

const coord = (s) => {
  const t = String(s ?? "").trim();
  if (!t || t === "-1" || t.startsWith("#")) return null;
  const v = Number(t.replace(",", "."));
  return Number.isFinite(v) && v !== 0 ? v : null;
};
const texto = (s) => (s && !String(s).startsWith("#") ? s : null);

// Cada linha do CSV de locais é uma seção; o local junta as seções da mesma zona.
export function criarLeitorLocais() {
  const locais = new Map();
  return {
    adicionar({ mun, zona, local, nome, bairro, lat, lon, eleitores }) {
      const id = idLocal(mun, zona, local);
      let l = locais.get(id);
      if (!l) locais.set(id, (l = { nm: texto(nome), bairro: texto(bairro), lat: coord(lat), lon: coord(lon), aptos: 0 }));
      l.aptos += Number(eleitores) || 0;
    },
    resultado: () => locais,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test analise-2026/test/agregar.teste.mjs analise-2026/test/locais.teste.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add analise-2026/coletar/agregar.mjs analise-2026/coletar/locais.mjs analise-2026/test/agregar.teste.mjs analise-2026/test/locais.teste.mjs
git commit -m "feat(analise-2026): agregação por município e por local de votação"
git push
```

---

### Task 4: Prestação de contas

**Files:**
- Create: `analise-2026/coletar/contas.mjs`
- Test: `analise-2026/test/contas.teste.mjs`

**Interfaces:**
- Consumes: `CATEGORIAS_RECEITA` (Task 1).
- Produces: `valorBR(s): number`; `categoriaReceita(fonte, origem): string` (sempre um item de `CATEGORIAS_RECEITA`); `criarSomaContas()` → `{ receita({sq, cargo, fonte, origem, valor}), despesa({sq, cargo, valor}), resultado(): { receitas: Map<sq, {total, porOrigem}>, despesas: Map<sq, number> } }`. Só soma `cargo === "Deputado Estadual"`. **Não deduplica** `SQ_DESPESA`/`SQ_RECEITA` (linhas repetidas são parcelas com valores diferentes).

- [ ] **Step 1: Teste que falha**

`analise-2026/test/contas.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORIAS_RECEITA } from "../public/js/config.mjs";
import { categoriaReceita, criarSomaContas, valorBR } from "../coletar/contas.mjs";

test("valorBR", () => {
  assert.equal(valorBR("1.234,56"), 1234.56);
  assert.equal(valorBR("910,00"), 910);
  assert.equal(valorBR("#NULO"), 0);
  assert.equal(valorBR(""), 0);
});

test("categoriaReceita usa fonte antes da origem", () => {
  assert.equal(categoriaReceita("FUNDO ESPECIAL", "Recursos de partido político"), "FEFC");
  assert.equal(categoriaReceita("FUNDO PARTIDARIO", "Recursos de partido político"), "Fundo Partidário");
  assert.equal(categoriaReceita("OUTROS RECURSOS", "Recursos de partido político"), "Partido (outros recursos)");
  assert.equal(categoriaReceita("OUTROS RECURSOS", "Recursos de pessoas físicas"), "Pessoas físicas");
  assert.equal(categoriaReceita("OUTROS RECURSOS", "Doações pela Internet"), "Pessoas físicas");
  assert.equal(categoriaReceita("OUTROS RECURSOS", "Recursos de Financiamento Coletivo"), "Pessoas físicas");
  assert.equal(categoriaReceita("OUTROS RECURSOS", "Recursos próprios"), "Recursos próprios");
  assert.equal(categoriaReceita("OUTROS RECURSOS", "Recursos de outros candidatos"), "Outros candidatos");
  assert.equal(categoriaReceita("#NULO", "#NULO"), "Outros");
  for (const [f, o] of [["FUNDO ESPECIAL", ""], ["#NULO", "Recursos de origens não identificadas"]]) assert.ok(CATEGORIAS_RECEITA.includes(categoriaReceita(f, o)));
});

test("soma parcelas repetidas e ignora outros cargos", () => {
  const s = criarSomaContas();
  s.receita({ sq: "1", cargo: "Deputado Estadual", fonte: "OUTROS RECURSOS", origem: "Recursos de pessoas físicas", valor: "200,00" });
  s.receita({ sq: "1", cargo: "Deputado Estadual", fonte: "OUTROS RECURSOS", origem: "Recursos de pessoas físicas", valor: "600,00" });
  s.receita({ sq: "1", cargo: "Deputado Estadual", fonte: "FUNDO ESPECIAL", origem: "Recursos de partido político", valor: "1.000,50" });
  s.receita({ sq: "9", cargo: "Deputado Federal", fonte: "FUNDO ESPECIAL", origem: "x", valor: "5,00" });
  s.despesa({ sq: "1", cargo: "Deputado Estadual", valor: "140,00" });
  s.despesa({ sq: "1", cargo: "Deputado Estadual", valor: "60,00" });
  const r = s.resultado();
  assert.deepEqual(r.receitas.get("1"), { total: 1800.5, porOrigem: { "Pessoas físicas": 800, FEFC: 1000.5 } });
  assert.equal(r.receitas.has("9"), false);
  assert.equal(r.despesas.get("1"), 200);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test analise-2026/test/contas.teste.mjs`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementação**

`analise-2026/coletar/contas.mjs`:
```js
// Soma receitas e despesas contratadas por candidato (CSV de prestação de contas do TSE).
// O mesmo SQ_DESPESA/SQ_RECEITA aparece em várias linhas com valores diferentes (parcelas/itens): soma tudo.
export const CARGO_CONTAS = "Deputado Estadual";

export function valorBR(s) {
  const t = String(s ?? "").trim();
  if (!t || t.startsWith("#")) return 0;
  const v = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

export function categoriaReceita(fonte, origem) {
  if (fonte === "FUNDO ESPECIAL") return "FEFC";
  if (fonte === "FUNDO PARTIDARIO") return "Fundo Partidário";
  const o = String(origem ?? "");
  if (/pessoas f[ií]sicas|internet|financiamento coletivo/i.test(o)) return "Pessoas físicas";
  if (/pr[óo]prios/i.test(o)) return "Recursos próprios";
  if (/outros candidatos/i.test(o)) return "Outros candidatos";
  if (/partido/i.test(o)) return "Partido (outros recursos)";
  return "Outros";
}

export function criarSomaContas() {
  const receitas = new Map();
  const despesas = new Map();
  return {
    receita({ sq, cargo, fonte, origem, valor }) {
      if (cargo !== CARGO_CONTAS) return;
      let r = receitas.get(sq);
      if (!r) receitas.set(sq, (r = { total: 0, porOrigem: {} }));
      const v = valorBR(valor);
      const cat = categoriaReceita(fonte, origem);
      r.total += v;
      r.porOrigem[cat] = (r.porOrigem[cat] ?? 0) + v;
    },
    despesa({ sq, cargo, valor }) {
      if (cargo !== CARGO_CONTAS) return;
      despesas.set(sq, (despesas.get(sq) ?? 0) + valorBR(valor));
    },
    resultado: () => ({ receitas, despesas }),
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test analise-2026/test/contas.teste.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add analise-2026/coletar/contas.mjs analise-2026/test/contas.teste.mjs
git commit -m "feat(analise-2026): soma de receitas e despesas por candidato"
git push
```

---

### Task 5: Conferência com o oficial e montagem do `dados.json`

**Files:**
- Create: `analise-2026/coletar/conferir.mjs`, `analise-2026/coletar/montar.mjs`
- Test: `analise-2026/test/conferir.teste.mjs`, `analise-2026/test/montar.teste.mjs`

**Interfaces:**
- Consumes: `regiaoDe` (Task 2); formatos de `parseOficial`, `parseMunicipiosCfg` (Task 2), `criarAgregador().resultado()`, `criarLeitorLocais().resultado()` (Task 3), `criarSomaContas().resultado()` (Task 4).
- Produces:
  - `conferir(candidatos: [{n, nm, votos}], votosMun: Map) → { ok: boolean, divergentes: [{n, nm, oficial, csv}], desconhecidos: string[] }`.
  - `montarDados({ oficial, municipios, agregado, locais, contas, focoLocal, meta }) → dados` no formato da spec: `{ meta, cargo, agremiacoes, municipios: [{cd, ibge, nm, regiao, validos}], locais: [{id, mun, nm, bairro, lat, lon, aptos, total}], candidatos: [{n, sq, nm, sg, fed, st, eleito, votos, receita, despesa, receitaPorOrigem, mun: [[i, v]], loc: [[j, v]] | null}] }`. `mun`/`loc` esparsos e ordenados por votos desc. Valores em R$ arredondados a centavos; lat/lon a 5 casas. Lança `Município <cd> da votação não está na lista do TSE`.

- [ ] **Step 1: Testes que falham**

`analise-2026/test/conferir.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { conferir } from "../coletar/conferir.mjs";

const cands = [{ n: "30777", nm: "ANDRÉ", votos: 7 }, { n: "11111", nm: "ZERO", votos: 0 }];

test("bate: ok, inclusive candidato sem nenhuma linha no CSV com 0 voto", () => {
  const r = conferir(cands, new Map([["30777", new Map([["a", 5], ["b", 2]])]]));
  assert.deepEqual(r, { ok: true, divergentes: [], desconhecidos: [] });
});

test("diverge: lista o candidato com os dois totais", () => {
  const r = conferir(cands, new Map([["30777", new Map([["a", 5]])]]));
  assert.equal(r.ok, false);
  assert.deepEqual(r.divergentes, [{ n: "30777", nm: "ANDRÉ", oficial: 7, csv: 5 }]);
});

test("número no CSV fora do resultado oficial", () => {
  const r = conferir(cands, new Map([["30777", new Map([["a", 7]])], ["99999", new Map([["a", 1]])]]));
  assert.equal(r.ok, false);
  assert.deepEqual(r.desconhecidos, ["99999"]);
});
```

`analise-2026/test/montar.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { montarDados } from "../coletar/montar.mjs";

const entrada = () => ({
  oficial: {
    geradoEm: "x",
    cargo: { vagas: 54, qe: 100, validos: 18, nominais: 15, legenda: 3, brancos: 0, nulos: 0 },
    agremiacoes: [{ nm: "PARTIDO NOVO", rotulo: "NOVO", federacao: false, siglas: ["NOVO"], vagas: 1, nominais: 7, legenda: 0 }],
    candidatos: [
      { n: "30777", sq: "1", nm: "ANDRÉ SANTOS", sg: "NOVO", fed: null, st: "Suplente", eleito: false, valido: true, votos: 7 },
      { n: "10456", sq: "2", nm: "MARA", sg: "REPUBLICANOS", fed: null, st: "Suplente", eleito: false, valido: true, votos: 5 },
      { n: "55555", sq: "3", nm: "OUTRO", sg: "PSD", fed: null, st: "Eleito", eleito: true, valido: true, votos: 3 },
    ],
  },
  municipios: [{ cd: "75353", ibge: "4106902", nm: "CURITIBA" }, { cd: "74934", ibge: "4108304", nm: "FOZ DO IGUAÇU" }],
  agregado: {
    votosMun: new Map([["30777", new Map([["74934", 2], ["75353", 5]])], ["10456", new Map([["75353", 5]])], ["55555", new Map([["74934", 3]])]]),
    votosLocal: new Map([["30777", new Map([["74934-2-20", 2], ["75353-1-10", 5]])], ["10456", new Map([["75353-1-10", 5]])]]),
    totalLocal: new Map([["75353-1-10", 10], ["74934-2-20", 5]]),
    validosMun: new Map([["75353", 12], ["74934", 6]]),
  },
  locais: new Map([["75353-1-10", { nm: "ESCOLA A", bairro: "CENTRO", lat: -25.4312345678, lon: -49.2, aptos: 300 }]]),
  contas: { receitas: new Map([["1", { total: 100.254, porOrigem: { FEFC: 100.254 } }]]), despesas: new Map([["1", 50]]) },
  focoLocal: new Set(["30777", "10456"]),
  meta: { geradoEm: "agora" },
});

test("monta municípios, locais e candidatos esparsos", () => {
  const d = montarDados(entrada());
  assert.equal(d.meta.geradoEm, "agora");
  assert.deepEqual(d.municipios, [
    { cd: "75353", ibge: "4106902", nm: "CURITIBA", regiao: "Curitiba", validos: 12 },
    { cd: "74934", ibge: "4108304", nm: "FOZ DO IGUAÇU", regiao: "Interior", validos: 6 },
  ]);
  assert.deepEqual(d.locais.map((l) => l.id), ["74934-2-20", "75353-1-10"]);
  assert.deepEqual(d.locais[0], { id: "74934-2-20", mun: 1, nm: "Local 74934-2-20", bairro: null, lat: null, lon: null, aptos: 0, total: 5 });
  assert.deepEqual(d.locais[1], { id: "75353-1-10", mun: 0, nm: "ESCOLA A", bairro: "CENTRO", lat: -25.43123, lon: -49.2, aptos: 300, total: 10 });
  const [andre, mara, outro] = d.candidatos;
  assert.deepEqual(andre.mun, [[0, 5], [1, 2]]);
  assert.deepEqual(andre.loc, [[1, 5], [0, 2]]);
  assert.equal(andre.receita, 100.25);
  assert.equal(andre.despesa, 50);
  assert.deepEqual(andre.receitaPorOrigem, { FEFC: 100.25 });
  assert.equal(mara.receita, null);
  assert.equal(mara.despesa, null);
  assert.equal(mara.receitaPorOrigem, null);
  assert.deepEqual(mara.loc, [[1, 5]]);
  assert.equal(outro.loc, null);
  assert.equal("valido" in andre, false);
});

test("município da votação fora da lista do TSE: erro com o código", () => {
  const e = entrada();
  e.agregado.votosMun.get("55555").set("99999", 1);
  assert.throws(() => montarDados(e), /Município 99999/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test analise-2026/test/conferir.teste.mjs analise-2026/test/montar.teste.mjs`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Implementação**

`analise-2026/coletar/conferir.mjs`:
```js
// A soma do CSV de seção por candidato tem que bater exatamente com o "vap" do resultado oficial.
export function conferir(candidatos, votosMun) {
  const divergentes = [];
  for (const c of candidatos) {
    let csv = 0;
    for (const v of votosMun.get(c.n)?.values() ?? []) csv += v;
    if (csv !== c.votos) divergentes.push({ n: c.n, nm: c.nm, oficial: c.votos, csv });
  }
  const conhecidos = new Set(candidatos.map((c) => c.n));
  const desconhecidos = [...votosMun.keys()].filter((n) => !conhecidos.has(n));
  return { ok: divergentes.length === 0 && desconhecidos.length === 0, divergentes, desconhecidos };
}
```

`analise-2026/coletar/montar.mjs`:
```js
import { regiaoDe } from "./regioes.mjs";

const centavos = (v) => Math.round(v * 100) / 100;
const casas5 = (v) => (v == null ? null : Math.round(v * 1e5) / 1e5);

function esparso(mapa, indice, oQue) {
  const out = [];
  for (const [k, v] of mapa) {
    if (!(v > 0)) continue;
    const i = indice.get(k);
    if (i === undefined) throw new Error(`${oQue} ${k} da votação não está na lista do TSE`);
    out.push([i, v]);
  }
  return out.sort((a, b) => b[1] - a[1]);
}

export function montarDados({ oficial, municipios, agregado, locais, contas, focoLocal, meta }) {
  const { votosMun, votosLocal, totalLocal, validosMun } = agregado;
  const idxMun = new Map(municipios.map((m, i) => [m.cd, i]));
  const municipiosOut = municipios.map((m) => ({ cd: m.cd, ibge: m.ibge, nm: m.nm, regiao: regiaoDe(m.nm), validos: validosMun.get(m.cd) ?? 0 }));

  const ids = [...totalLocal.keys()].sort();
  const idxLoc = new Map(ids.map((id, j) => [id, j]));
  const locaisOut = ids.map((id) => {
    const cd = id.split("-")[0];
    if (!idxMun.has(cd)) throw new Error(`Município ${cd} da votação não está na lista do TSE`);
    const info = locais.get(id);
    return {
      id, mun: idxMun.get(cd), nm: info?.nm ?? `Local ${id}`, bairro: info?.bairro ?? null,
      lat: casas5(info?.lat ?? null), lon: casas5(info?.lon ?? null), aptos: info?.aptos ?? 0, total: totalLocal.get(id),
    };
  });

  const candidatos = oficial.candidatos.map((c) => {
    const r = contas.receitas.get(c.sq);
    const d = contas.despesas.get(c.sq);
    return {
      n: c.n, sq: c.sq, nm: c.nm, sg: c.sg, fed: c.fed, st: c.st, eleito: c.eleito, votos: c.votos,
      receita: r ? centavos(r.total) : null,
      despesa: d != null ? centavos(d) : null,
      receitaPorOrigem: r ? Object.fromEntries(Object.entries(r.porOrigem).map(([k, v]) => [k, centavos(v)])) : null,
      mun: esparso(votosMun.get(c.n) ?? new Map(), idxMun, "Município"),
      loc: focoLocal.has(c.n) ? esparso(votosLocal.get(c.n) ?? new Map(), idxLoc, "Local") : null,
    };
  });
  // Votos em municípios que não estão na lista também precisam abortar, mesmo de candidato fora do foco.
  for (const [, porMun] of votosMun) for (const cd of porMun.keys()) if (!idxMun.has(cd)) throw new Error(`Município ${cd} da votação não está na lista do TSE`);

  return { meta, cargo: oficial.cargo, agremiacoes: oficial.agremiacoes, municipios: municipiosOut, locais: locaisOut, candidatos };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test analise-2026/test/conferir.teste.mjs analise-2026/test/montar.teste.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add analise-2026/coletar/conferir.mjs analise-2026/coletar/montar.mjs analise-2026/test/conferir.teste.mjs analise-2026/test/montar.teste.mjs
git commit -m "feat(analise-2026): conferência com o oficial e montagem do dados.json"
git push
```

---

### Task 6: Script de coleta e geração real dos dados

**Files:**
- Create: `analise-2026/coletar/coletar.mjs`
- Create (gerados): `analise-2026/public/dados.json`, `analise-2026/public/mapa.geo.json`

**Interfaces:**
- Consumes: tudo das Tasks 1–5.
- Produces: CLI `node analise-2026/coletar/coletar.mjs [--refazer] [--aceitar-divergencia]`; arquivos `public/dados.json` (com `meta.fontes = { secao, locais, oficial, contas }` em texto "dd/mm/aaaa hh:mm:ss") e `public/mapa.geo.json` (GeoJSON do IBGE, `properties.codarea`).

- [ ] **Step 1: Implementação**

`analise-2026/coletar/coletar.mjs`:
```js
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
import { conferir } from "./conferir.mjs";
import { criarSomaContas } from "./contas.mjs";
import { criarLeitorLocais } from "./locais.mjs";
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

  console.log("lendo votação por seção (830 MB; leva alguns minutos)...");
  const ag = criarAgregador({ validos, focoLocal });
  const nSecao = await percorrerCsvDoZip(arq.secao, "votacao_secao_2026_PR.csv",
    ["DT_GERACAO", "HH_GERACAO", "CD_CARGO", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO", "NR_VOTAVEL", "QT_VOTOS"],
    (c, i) => {
      if (c[i.CD_CARGO] !== "7") return;
      fontes.secao ??= geracao(c, i);
      ag.adicionar({ mun: c[i.CD_MUNICIPIO], zona: c[i.NR_ZONA], local: c[i.NR_LOCAL_VOTACAO], votavel: c[i.NR_VOTAVEL], votos: Number(c[i.QT_VOTOS]) });
    });
  console.log(`  ${nSecao.toLocaleString("pt-BR")} linhas lidas`);

  console.log("lendo locais de votação...");
  const leitorLocais = criarLeitorLocais();
  await percorrerCsvDoZip(arq.locais, "eleitorado_local_votacao_2026_PR.csv",
    ["DT_GERACAO", "HH_GERACAO", "CD_MUNICIPIO", "NR_ZONA", "NR_LOCAL_VOTACAO", "NM_LOCAL_VOTACAO", "NM_BAIRRO", "NR_LATITUDE", "NR_LONGITUDE", "QT_ELEITOR_SECAO"],
    (c, i) => {
      fontes.locais ??= geracao(c, i);
      leitorLocais.adicionar({
        mun: c[i.CD_MUNICIPIO], zona: c[i.NR_ZONA], local: c[i.NR_LOCAL_VOTACAO], nome: c[i.NM_LOCAL_VOTACAO],
        bairro: c[i.NM_BAIRRO], lat: c[i.NR_LATITUDE], lon: c[i.NR_LONGITUDE], eleitores: c[i.QT_ELEITOR_SECAO],
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
  if (!conf.ok) {
    console.error(`Conferência falhou: ${conf.divergentes.length} candidato(s) divergente(s), ${conf.desconhecidos.length} número(s) no CSV fora do resultado oficial.`);
    for (const d of conf.divergentes.slice(0, 30)) console.error(`  ${d.n} ${d.nm}: oficial ${d.oficial}, csv ${d.csv}`);
    if (conf.desconhecidos.length) console.error(`  fora do oficial: ${conf.desconhecidos.slice(0, 30).join(", ")}`);
    if (!ACEITAR) {
      console.error("Nada foi gravado. Para gravar mesmo assim: --aceitar-divergencia");
      process.exitCode = 1;
      return;
    }
  }

  const dados = montarDados({
    oficial, municipios, agregado, locais: leitorLocais.resultado(), contas: soma.resultado(), focoLocal,
    meta: { geradoEm: new Date().toISOString(), fontes, divergencias: conf.divergentes.length },
  });
  const semCoord = dados.locais.filter((l) => l.lat == null).length;
  writeFileSync(join(PUBLICO, "dados.json"), JSON.stringify(dados));
  writeFileSync(join(PUBLICO, "mapa.geo.json"), readFileSync(arq.malha));
  console.log(`${dados.candidatos.length} candidatos, ${dados.municipios.length} municípios, ${dados.locais.length} locais (${semCoord} sem coordenada)`);
  console.log(`gravado public/dados.json (${tamanho(join(PUBLICO, "dados.json"))}) e public/mapa.geo.json (${tamanho(join(PUBLICO, "mapa.geo.json"))})`);
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Rodar a coleta real**

Run (da raiz do repo; baixa ~320 MB na primeira vez): `node analise-2026/coletar/coletar.mjs`
Expected (números da conferência exatamente estes):
```
  ANDRÉ SANTOS           oficial    9481   csv    9481
  FABIO OLIVEIRA         oficial   22365   csv   22365
  CANTORA MARA LIMA      oficial   41133   csv   41133
  DIRLETE PINHEIRO       oficial    5298   csv    5298
591 candidatos, 399 municípios, ... locais (0 sem coordenada)
gravado public/dados.json (... MB) e public/mapa.geo.json (0.2 MB)
```
Se a conferência falhar: **não** usar `--aceitar-divergencia`; reportar ao Edson a lista de divergentes e parar (é sinal de erro de leitura ou de arquivo do TSE ainda incompleto).
Se `dados.json` passar de 6 MB: parar e reportar (a spec prevê separar `loc` em outro arquivo).

- [ ] **Step 3: Conferir contas e locais no arquivo gerado**

Run:
```bash
node -e '
const d=require("./analise-2026/public/dados.json");
for (const n of ["30777","30300","10456","22622"]) { const c=d.candidatos.find(x=>x.n===n); console.log(c.nm, c.votos, c.receita, c.despesa, c.loc.length, "locais"); }
console.log("fontes", d.meta.fontes);
console.log("NOVO", d.candidatos.filter(c=>c.sg==="NOVO").length, "eleitos", d.candidatos.filter(c=>c.sg==="NOVO"&&c.eleito).map(c=>c.nm));'
```
Expected: André `9481 92064 72862.05`; Fabio `22365 794000 393491.71`; Mara `41133 954014.1 483950.98`; Dirlete `5298 495000 274776`; NOVO 41 com 3 eleitos (Bruno Secco, Luiz Fernando Guerra, Deivid Wisley). `fontes` com as 4 datas preenchidas.

- [ ] **Step 4: Rodar todos os testes**

Run: `node --test analise-2026/test/*.teste.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add analise-2026/coletar/coletar.mjs analise-2026/public/dados.json analise-2026/public/mapa.geo.json
git commit -m "feat(analise-2026): coleta dos dados abertos do TSE conferida com o oficial"
git push
```

---

### Task 7: Funções puras da página (formato, rota, consultas e cálculos)

**Files:**
- Create: `analise-2026/public/js/fmt.mjs`, `rota.mjs`, `dados.mjs`, `calc.mjs`, `tabela.mjs` (só `ordenar` nesta tarefa)
- Create: `analise-2026/test/fx.mjs`
- Test: `analise-2026/test/fmt.teste.mjs`, `rota.teste.mjs`, `dados.teste.mjs`, `calc.teste.mjs`, `tabela.teste.mjs`

**Interfaces:**
- Consumes: `FOCO`, `PARTIDO`, `RIVAIS_IGREJA`, `PADRAO_B` (Task 1); formato do `dados.json` (Task 5).
- Produces:
  - `fmt.mjs`: `inteiro(n)`, `reais(v, casas=2)` ("sem dado" se null), `reaisCurto(v)`, `pct(x, casas=2)` ("—" se null), `esc(s)`.
  - `rota.mjs`: `lerRota(hash, ids) → {tela, params}`; `escreverRota(tela, params) → "#tela?..."`.
  - `dados.mjs`: `indexar(dados) → D` (= dados + `porNumero: Map<n, cand>`, `munPorIbge: Map<ibge, i>`); `serie(c, nivel: "mun"|"loc") → Map<idx, votos>`; `percentuais(D, c, nivel) → Map<idx, fração>`; `chapa(D, sg)`; `posicaoGeral(D, n)`; `comparaveis(D)`; `escolherB(D, n) → cand`; `porRegiao(D, c) → {Curitiba, RMC, Litoral, Interior}`; `porBairro(D, c, municipio="CURITIBA") → [{bairro, votos, total}]`.
  - `calc.mjs`: `rsPorVoto(valor, votos) → number|null`; `concentracao(valores) → {p50, p80, total, n}`; `sobreposicao(a, b) → {areas, fracA, fracB}`; `pearson(a, b) → number|null`; `diferenca(x, y) → [{k, x, y, d}]` (d = x − y, desc); `vencedor(series: [{n, mapa}]) → Map<k, {n|null, v, margem}>`.
  - `tabela.mjs`: `ordenar(linhas, valor, desc) → linhas` (nulos sempre no fim, texto com `localeCompare` pt-BR).

- [ ] **Step 1: Fixture**

`analise-2026/test/fx.mjs`:
```js
// dados.json em miniatura, com somas coerentes (mun e loc de cada candidato batem com "votos").
export const dadosMini = () => ({
  meta: { geradoEm: "2026-10-05T00:00:00Z", fontes: { secao: "05/10/2026 09:50:34", locais: "05/10/2026 06:29:34", oficial: "04/10/2026 23:59:59", contas: "04/10/2026 04:05:53" } },
  cargo: { vagas: 54, qe: 100, validos: 1000, nominais: 900, legenda: 100, brancos: 10, nulos: 5 },
  agremiacoes: [{ nm: "PARTIDO NOVO", rotulo: "NOVO", federacao: false, siglas: ["NOVO"], vagas: 1, nominais: 190, legenda: 10 }],
  municipios: [
    { cd: "75353", ibge: "4106902", nm: "CURITIBA", regiao: "Curitiba", validos: 600 },
    { cd: "75990", ibge: "4125506", nm: "SÃO JOSÉ DOS PINHAIS", regiao: "RMC", validos: 300 },
    { cd: "77771", ibge: "4118204", nm: "PARANAGUÁ", regiao: "Litoral", validos: 100 },
  ],
  locais: [
    { id: "75353-1-10", mun: 0, nm: "ESCOLA A", bairro: "CENTRO", lat: -25.43, lon: -49.27, aptos: 400, total: 300 },
    { id: "75353-1-20", mun: 0, nm: "ESCOLA B", bairro: "CAJURU", lat: -25.45, lon: -49.2, aptos: 400, total: 200 },
    { id: "75990-5-30", mun: 1, nm: "ESCOLA C", bairro: "CENTRO", lat: null, lon: null, aptos: 300, total: 250 },
    { id: "77771-9-40", mun: 2, nm: "ESCOLA D", bairro: null, lat: -25.5, lon: -48.5, aptos: 100, total: 80 },
  ],
  candidatos: [
    { n: "55555", nm: "OUTRO", sg: "PSD", st: "Eleito por QP", eleito: true, votos: 200, receita: 10, despesa: 1, receitaPorOrigem: { Outros: 10 }, mun: [[0, 200]], loc: null },
    { n: "30123", nm: "ELEITO NOVO", sg: "NOVO", st: "Eleito por QP", eleito: true, votos: 100, receita: 500, despesa: 400, receitaPorOrigem: { FEFC: 500 }, mun: [[0, 60], [1, 40]], loc: [[2, 40], [0, 30], [1, 30]] },
    { n: "30777", nm: "ANDRÉ SANTOS", sg: "NOVO", st: "Suplente", eleito: false, votos: 50, receita: 100, despesa: 80, receitaPorOrigem: { "Pessoas físicas": 100 }, mun: [[0, 30], [2, 20]], loc: [[0, 20], [3, 20], [1, 10]] },
    { n: "30300", nm: "FABIO OLIVEIRA", sg: "NOVO", st: "Suplente", eleito: false, votos: 40, receita: 400, despesa: null, receitaPorOrigem: { FEFC: 400 }, mun: [[0, 40]], loc: [[0, 25], [1, 15]] },
    { n: "10456", nm: "CANTORA MARA LIMA", sg: "REPUBLICANOS", st: "Suplente", eleito: false, votos: 30, receita: null, despesa: null, receitaPorOrigem: null, mun: [[1, 30]], loc: [[2, 30]] },
    { n: "22622", nm: "DIRLETE PINHEIRO", sg: "PL", st: "Suplente", eleito: false, votos: 0, receita: 200, despesa: 10, receitaPorOrigem: { FEFC: 200 }, mun: [], loc: [] },
  ],
});
```

- [ ] **Step 2: Testes que falham**

`analise-2026/test/fmt.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { esc, inteiro, pct, reais, reaisCurto } from "../public/js/fmt.mjs";

test("formatos pt-BR", () => {
  assert.equal(inteiro(9481), "9.481");
  assert.equal(inteiro(0), "0");
  assert.equal(reais(9.7104), "R$ 9,71");
  assert.equal(reais(92064, 0), "R$ 92.064");
  assert.equal(reais(null), "sem dado");
  assert.equal(reais(undefined), "sem dado");
  assert.equal(pct(0.0037), "0,37%");
  assert.equal(pct(0.395, 1), "39,5%");
  assert.equal(pct(null), "—");
  assert.equal(reaisCurto(954014), "R$ 954 mil");
  assert.equal(reaisCurto(1500000), "R$ 1,5 mi");
  assert.equal(reaisCurto(350), "R$ 350,00");
  assert.equal(reaisCurto(null), "sem dado");
  assert.equal(esc('<a "b">&'), "&lt;a &quot;b&quot;&gt;&amp;");
  assert.equal(esc(null), "");
});
```

`analise-2026/test/rota.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { escreverRota, lerRota } from "../public/js/rota.mjs";

const ids = ["panorama", "andre", "custo", "comparador", "igreja"];

test("lerRota", () => {
  assert.deepEqual(lerRota("#comparador?b=30300&nivel=loc", ids), { tela: "comparador", params: { b: "30300", nivel: "loc" } });
  assert.deepEqual(lerRota("", ids), { tela: "panorama", params: {} });
  assert.deepEqual(lerRota("#nao-existe?b=1", ids), { tela: "panorama", params: { b: "1" } });
});

test("escreverRota omite vazios", () => {
  assert.equal(escreverRota("comparador", { b: "30300", nivel: null, modo: "" }), "#comparador?b=30300");
  assert.equal(escreverRota("andre", {}), "#andre");
});
```

`analise-2026/test/dados.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { chapa, comparaveis, escolherB, indexar, percentuais, porBairro, porRegiao, posicaoGeral, serie } from "../public/js/dados.mjs";
import { dadosMini } from "./fx.mjs";

const D = indexar(dadosMini());
const andre = D.porNumero.get("30777");

test("índices", () => {
  assert.equal(andre.nm, "ANDRÉ SANTOS");
  assert.equal(D.munPorIbge.get("4106902"), 0);
});

test("séries e percentuais", () => {
  assert.deepEqual([...serie(andre, "mun")], [[0, 30], [2, 20]]);
  assert.deepEqual([...serie(D.porNumero.get("55555"), "loc")], []);
  assert.deepEqual([...percentuais(D, andre, "mun")], [[0, 30 / 600], [2, 20 / 100]]);
  assert.deepEqual([...percentuais(D, andre, "loc")], [[0, 20 / 300], [3, 20 / 80], [1, 10 / 200]]);
});

test("chapa, posição geral e comparáveis", () => {
  assert.deepEqual(chapa(D, "NOVO").map((c) => c.n), ["30123", "30777", "30300"]);
  assert.equal(posicaoGeral(D, "30777"), 3);
  assert.deepEqual(comparaveis(D).map((c) => c.n), ["30123", "30300", "10456", "22622"]);
});

test("escolherB cai no padrão quando o pedido não serve", () => {
  assert.equal(escolherB(D, "10456").n, "10456");
  assert.equal(escolherB(D, "30777").n, "30300");
  assert.equal(escolherB(D, "55555").n, "30300");
  assert.equal(escolherB(D, "00000").n, "30300");
  assert.equal(escolherB(D, undefined).n, "30300");
});

test("região e bairro", () => {
  assert.deepEqual(porRegiao(D, andre), { Curitiba: 30, RMC: 0, Litoral: 20, Interior: 0 });
  assert.deepEqual(porBairro(D, andre), [{ bairro: "CENTRO", votos: 20, total: 300 }, { bairro: "CAJURU", votos: 10, total: 200 }]);
});
```

`analise-2026/test/calc.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { concentracao, diferenca, pearson, rsPorVoto, sobreposicao, vencedor } from "../public/js/calc.mjs";

const M = (o) => new Map(Object.entries(o));

test("rsPorVoto nunca devolve 0 falso nem Infinity", () => {
  assert.equal(rsPorVoto(100, 50), 2);
  assert.equal(rsPorVoto(null, 50), null);
  assert.equal(rsPorVoto(100, 0), null);
  assert.equal(rsPorVoto(0, 10), 0);
});

test("concentracao", () => {
  assert.deepEqual(concentracao([30, 20]), { p50: 1, p80: 2, total: 50, n: 2 });
  assert.deepEqual(concentracao([0, 10]), { p50: 1, p80: 1, total: 10, n: 1 });
  assert.deepEqual(concentracao([]), { p50: 0, p80: 0, total: 0, n: 0 });
});

test("sobreposicao", () => {
  assert.deepEqual(sobreposicao(M({ 0: 20, 1: 10, 3: 20 }), M({ 0: 25, 1: 15 })), { areas: 2, fracA: 0.6, fracB: 1 });
  assert.deepEqual(sobreposicao(M({}), M({ 0: 1 })), { areas: 0, fracA: 0, fracB: 0 });
});

test("pearson", () => {
  assert.equal(pearson(M({ a: 1, b: 2, c: 3 }), M({ a: 2, b: 4, c: 6 })), 1);
  assert.equal(pearson(M({ a: 1, b: 2, c: 3 }), M({ a: 3, b: 2, c: 1 })), -1);
  assert.equal(pearson(M({ a: 1, b: 2 }), M({ a: 1, b: 2 })), null);
  assert.equal(pearson(M({ a: 1, b: 1, c: 1 }), M({ a: 1, b: 2, c: 3 })), null);
});

test("diferenca: x − y em ordem decrescente, união das chaves", () => {
  assert.deepEqual(diferenca(M({ a: 5, b: 1 }), M({ b: 3, c: 2 })), [
    { k: "a", x: 5, y: 0, d: 5 }, { k: "b", x: 1, y: 3, d: -2 }, { k: "c", x: 0, y: 2, d: -2 },
  ]);
});

test("vencedor com empate", () => {
  const r = vencedor([{ n: "A", mapa: M({ 0: 5, 1: 2, 2: 3 }) }, { n: "B", mapa: M({ 0: 3, 1: 2, 3: 1 }) }]);
  assert.deepEqual(r.get("0"), { n: "A", v: 5, margem: 2 });
  assert.deepEqual(r.get("1"), { n: null, v: 2, margem: 0 });
  assert.deepEqual(r.get("2"), { n: "A", v: 3, margem: 3 });
  assert.deepEqual(r.get("3"), { n: "B", v: 1, margem: 1 });
});
```

`analise-2026/test/tabela.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { ordenar } from "../public/js/tabela.mjs";

test("ordenar: nulos sempre no fim", () => {
  const ls = [{ v: 2 }, { v: null }, { v: 5 }];
  assert.deepEqual(ordenar(ls, (l) => l.v, true).map((l) => l.v), [5, 2, null]);
  assert.deepEqual(ordenar(ls, (l) => l.v, false).map((l) => l.v), [2, 5, null]);
});

test("ordenar: texto com acento em ordem alfabética pt-BR", () => {
  const ls = ["Bento", "Ária", "Abel"].map((v) => ({ v }));
  assert.deepEqual(ordenar(ls, (l) => l.v, false).map((l) => l.v), ["Abel", "Ária", "Bento"]);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test analise-2026/test/fmt.teste.mjs analise-2026/test/rota.teste.mjs analise-2026/test/dados.teste.mjs analise-2026/test/calc.teste.mjs analise-2026/test/tabela.teste.mjs`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 4: Implementação**

`analise-2026/public/js/fmt.mjs`:
```js
const NUM = new Intl.NumberFormat("pt-BR");
const dec = (v, casas) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const inteiro = (n) => NUM.format(Math.round(n));
export const reais = (v, casas = 2) => (v == null ? "sem dado" : `R$ ${dec(v, casas)}`);
export const pct = (x, casas = 2) => (x == null ? "—" : `${dec(x * 100, casas)}%`);
export function reaisCurto(v) {
  if (v == null) return "sem dado";
  if (v >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (v >= 1e3) return `R$ ${inteiro(v / 1e3)} mil`;
  return reais(v);
}
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
```

`analise-2026/public/js/rota.mjs`:
```js
// Estado da tela na URL: "#comparador?b=30300&nivel=loc".
export function lerRota(hash, ids) {
  const [tela, qs = ""] = String(hash ?? "").replace(/^#/, "").split("?");
  return { tela: ids.includes(tela) ? tela : ids[0], params: Object.fromEntries(new URLSearchParams(qs)) };
}

export function escreverRota(tela, params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== "")).toString();
  return `#${tela}${qs ? `?${qs}` : ""}`;
}
```

`analise-2026/public/js/dados.mjs`:
```js
import { FOCO, PADRAO_B, PARTIDO, RIVAIS_IGREJA } from "./config.mjs";

export function indexar(dados) {
  return {
    ...dados,
    porNumero: new Map(dados.candidatos.map((c) => [c.n, c])),
    munPorIbge: new Map(dados.municipios.map((m, i) => [m.ibge, i])),
  };
}

// Índice (município ou local) → votos. "loc" só existe para NOVO + rivais; para os outros vem vazio.
export const serie = (c, nivel) => new Map((nivel === "loc" ? c.loc : c.mun) ?? []);

export function percentuais(D, c, nivel) {
  const out = new Map();
  for (const [i, v] of serie(c, nivel)) {
    const den = nivel === "loc" ? D.locais[i].total : D.municipios[i].validos;
    out.set(i, den ? v / den : 0);
  }
  return out;
}

export const chapa = (D, sg) => D.candidatos.filter((c) => c.sg === sg).sort((a, b) => b.votos - a.votos);

export function posicaoGeral(D, n) {
  return [...D.candidatos].sort((a, b) => b.votos - a.votos).findIndex((c) => c.n === n) + 1;
}

export const comparaveis = (D) =>
  D.candidatos.filter((c) => c.n !== FOCO && (c.sg === PARTIDO || RIVAIS_IGREJA.includes(c.n))).sort((a, b) => b.votos - a.votos);

export function escolherB(D, n) {
  const ops = comparaveis(D);
  return ops.find((c) => c.n === n) ?? ops.find((c) => c.n === PADRAO_B) ?? ops[0];
}

export function porRegiao(D, c) {
  const r = { Curitiba: 0, RMC: 0, Litoral: 0, Interior: 0 };
  for (const [i, v] of c.mun) r[D.municipios[i].regiao] += v;
  return r;
}

export function porBairro(D, c, municipio = "CURITIBA") {
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
```

`analise-2026/public/js/calc.mjs`:
```js
export const rsPorVoto = (valor, votos) => (valor == null || !votos ? null : valor / votos);

// Menor nº de áreas (municípios ou locais) que somam 50% e 80% dos votos.
export function concentracao(valores) {
  const v = valores.filter((x) => x > 0).sort((a, b) => b - a);
  const total = v.reduce((s, x) => s + x, 0);
  let acc = 0, p50 = 0, p80 = 0;
  for (let k = 0; k < v.length && !p80; k++) {
    acc += v[k];
    if (!p50 && acc >= total * 0.5) p50 = k + 1;
    if (acc >= total * 0.8) p80 = k + 1;
  }
  return { p50, p80, total, n: v.length };
}

export function sobreposicao(a, b) {
  let areas = 0, va = 0, vb = 0, ta = 0, tb = 0;
  for (const v of a.values()) ta += v;
  for (const v of b.values()) tb += v;
  for (const [k, x] of a) {
    const y = b.get(k) ?? 0;
    if (x > 0 && y > 0) { areas++; va += x; vb += y; }
  }
  return { areas, fracA: ta ? va / ta : 0, fracB: tb ? vb / tb : 0 };
}

export function pearson(a, b) {
  const ks = [...new Set([...a.keys(), ...b.keys()])];
  if (ks.length < 3) return null;
  const xs = ks.map((k) => a.get(k) ?? 0);
  const ys = ks.map((k) => b.get(k) ?? 0);
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = ys.reduce((s, y) => s + y, 0) / ys.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

export function diferenca(x, y) {
  const ks = [...new Set([...x.keys(), ...y.keys()])];
  return ks.map((k) => {
    const a = x.get(k) ?? 0, b = y.get(k) ?? 0;
    return { k, x: a, y: b, d: a - b };
  }).sort((p, q) => q.d - p.d);
}

// Para cada área, quem teve mais votos entre as séries; empate no topo → n = null.
export function vencedor(series) {
  const chaves = new Set(series.flatMap((s) => [...s.mapa.keys()]));
  const out = new Map();
  for (const k of chaves) {
    let melhor = null, v1 = 0, v2 = 0;
    for (const s of series) {
      const v = s.mapa.get(k) ?? 0;
      if (v > v1) { v2 = v1; v1 = v; melhor = s.n; } else if (v > v2) v2 = v;
    }
    if (v1 > 0) out.set(k, { n: v1 === v2 ? null : melhor, v: v1, margem: v1 - v2 });
  }
  return out;
}
```

`analise-2026/public/js/tabela.mjs` (nesta tarefa só a função pura; a Task 8 acrescenta `tabela()`):
```js
export function ordenar(linhas, valor, desc) {
  return [...linhas].sort((a, b) => {
    const x = valor(a), y = valor(b);
    if (x == null || y == null) return (x == null) - (y == null);
    const c = typeof x === "string" ? x.localeCompare(y, "pt-BR") : x - y;
    return desc ? -c : c;
  });
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test analise-2026/test/*.teste.mjs`
Expected: PASS (todas as tarefas até aqui).

- [ ] **Step 6: Commit**

```bash
git add analise-2026/public/js/fmt.mjs analise-2026/public/js/rota.mjs analise-2026/public/js/dados.mjs analise-2026/public/js/calc.mjs analise-2026/public/js/tabela.mjs analise-2026/test/fx.mjs analise-2026/test/fmt.teste.mjs analise-2026/test/rota.teste.mjs analise-2026/test/dados.teste.mjs analise-2026/test/calc.teste.mjs analise-2026/test/tabela.teste.mjs
git commit -m "feat(analise-2026): consultas e cálculos da página (custo/voto, sobreposição, correlação)"
git push
```

---

### Task 8: Servidor, casca da página, componentes e tela Panorama

**Files:**
- Create: `analise-2026/servidor.mjs`, `analise-2026/test/servidor.teste.mjs`
- Create: `analise-2026/analise.command`, `analise-2026/verificar.sh`
- Create: `analise-2026/public/index.html`, `analise-2026/public/css/estilo.css`, `analise-2026/public/vendor/d3.v7.min.js`
- Create: `analise-2026/public/js/main.mjs`, `dica.mjs`, `animar.mjs`, `mapa.mjs`, `telas/panorama.mjs`
- Modify: `analise-2026/public/js/tabela.mjs` (acrescentar `tabela()`)

**Interfaces:**
- Consumes: Task 7 inteira; `dados.json`/`mapa.geo.json` (Task 6).
- Produces:
  - `criarServidor(raiz: string): http.Server`; CLI `node analise-2026/servidor.mjs [--porta=4330]`.
  - Contexto de tela: `montar(el: HTMLElement, { D, geo, interno, params, navegar(novos: object) })`.
  - `main.mjs` mantém `const TELAS = [{ id, nome, mod }]`; Tasks 9–12 acrescentam uma linha de import e uma entrada cada.
  - `document.body.dataset.pronta = <id>` após montar; `document.body.dataset.erros = <n>` + texto em `<pre id="erros">` se houver erro de JS (usado por `verificar.sh`).
  - `dica.mjs`: `mostrarDica(ev, html)`, `esconderDica()`.
  - `animar.mjs`: `reduzido()`, `contar(el, ate, formato, ms)`, `barras(el, itens: [{rotulo, valor, classe?, cor?, titulo?}], {formato, max})`.
  - `mapa.mjs`: `cor(nomeVar) → string`; `escalaSeq(max, nomeVar) → (v)=>cor`; `escalaDiv(lim) → (d)=>cor` (azul negativo, laranja positivo); `criarMapa(el, {geo, D}) → { colorir(fn(i)→cor|null), pontos(lista: [{j, raio, cor}], {semLimiar}) → nºSemCoordenada, dicas(fMun, fLoc), aoZoom(fn), aplicarZoom(t) }`; `legenda(el, {cores, min, max, titulo})`.
  - `tabela(el, { colunas: [{rotulo, valor(l), formato?(v, l) → html, num?}], linhas, ordem=0, desc=true, classe?(l), limite? })`.

- [ ] **Step 1: Teste do servidor (falha)**

`analise-2026/test/servidor.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarServidor } from "../servidor.mjs";

test("serve arquivos de public com o tipo certo e bloqueia fuga da pasta", async () => {
  const base = mkdtempSync(join(tmpdir(), "analise-srv-"));
  const raiz = join(base, "public");
  mkdirSync(join(raiz, "js"), { recursive: true });
  writeFileSync(join(raiz, "index.html"), "<h1>oi</h1>");
  writeFileSync(join(raiz, "js", "a.mjs"), "export {}");
  writeFileSync(join(raiz, "dados.json"), "{}");
  writeFileSync(join(base, "segredo.txt"), "não");
  const srv = criarServidor(raiz).listen(0);
  await new Promise((r) => srv.once("listening", r));
  const url = `http://127.0.0.1:${srv.address().port}`;
  try {
    let r = await fetch(`${url}/`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /text\/html/);
    r = await fetch(`${url}/js/a.mjs`);
    assert.match(r.headers.get("content-type"), /text\/javascript/);
    r = await fetch(`${url}/dados.json`);
    assert.match(r.headers.get("content-type"), /application\/json/);
    assert.equal((await fetch(`${url}/..%2Fsegredo.txt`)).status, 404);
    assert.equal((await fetch(`${url}/nao-existe.json`)).status, 404);
  } finally {
    srv.close();
  }
});
```

Run: `node --test analise-2026/test/servidor.teste.mjs`
Expected: FAIL — módulo inexistente.

- [ ] **Step 2: Servidor, lançador e verificador**

`analise-2026/servidor.mjs`:
```js
#!/usr/bin/env node
// Servidor estático da análise: só entrega os arquivos de public/ (nenhuma tela depende dele).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
};

export function criarServidor(raiz) {
  return http.createServer(async (req, res) => {
    try {
      const caminho = decodeURIComponent(new URL(req.url, "http://local").pathname);
      const arquivo = join(raiz, normalize(caminho === "/" ? "/index.html" : caminho));
      if (!arquivo.startsWith(raiz + sep)) throw new Error("fora da pasta");
      const corpo = await readFile(arquivo);
      res.writeHead(200, { "content-type": MIME[extname(arquivo)] ?? "application/octet-stream", "cache-control": "no-cache" });
      res.end(corpo);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("não encontrado");
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv.find((a) => a.startsWith("--porta="));
  const porta = Number(arg ? arg.slice(8) : process.env.PORTA ?? 4330);
  const raiz = join(dirname(fileURLToPath(import.meta.url)), "public");
  criarServidor(raiz).listen(porta, "127.0.0.1", () => console.log(`Análise 2026 em http://localhost:${porta}/`));
}
```

`analise-2026/analise.command`:
```bash
#!/bin/bash
# Sobe o servidor local da análise e abre no Chrome. Feche esta janela para encerrar.
cd "$(dirname "$0")" || exit 1
PORTA="${PORTA:-4330}"
ANTIGO=$(lsof -ti "tcp:$PORTA" -sTCP:LISTEN)
if [ -n "$ANTIGO" ]; then kill $ANTIGO 2>/dev/null; sleep 1; fi
node servidor.mjs --porta="$PORTA" &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT INT TERM
for _ in $(seq 1 20); do curl -s -o /dev/null "http://localhost:$PORTA/" && break; sleep 0.3; done
open -a "Google Chrome" "http://localhost:$PORTA/" 2>/dev/null || open "http://localhost:$PORTA/"
echo "Análise rodando em http://localhost:$PORTA/ — feche esta janela para encerrar."
wait $SRV
```

`analise-2026/verificar.sh`:
```bash
#!/bin/bash
# Abre cada tela no Chrome headless, salva captura e falha se a página registrou erro de JavaScript
# ou não terminou de montar. Uso: analise-2026/verificar.sh [rota ...]   (padrão: as 5 telas)
cd "$(dirname "$0")" || exit 1
PORTA=4331
SAIDA="${SAIDA:-/tmp/analise-2026-telas}"
mkdir -p "$SAIDA"
ROTAS=("$@")
[ ${#ROTAS[@]} -eq 0 ] && ROTAS=(panorama andre custo comparador igreja)
node servidor.mjs --porta=$PORTA >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
for _ in $(seq 1 20); do curl -s -o /dev/null "http://localhost:$PORTA/" && break; sleep 0.3; done
CHROME=""
for c in "/Applications/Google Chrome.app" "$HOME/Applications/Google Chrome.app" "$HOME/Desktop/Google Chrome.app"; do
  [ -d "$c" ] && CHROME="$c/Contents/MacOS/Google Chrome" && break
done
[ -z "$CHROME" ] && { echo "Chrome não encontrado"; exit 1; }
FALHOU=0
for rota in "${ROTAS[@]}"; do
  url="http://localhost:$PORTA/#$rota"
  nome=$(echo "$rota" | tr '?&=' '___')
  opts=(--headless=new --disable-gpu --hide-scrollbars --window-size=1600,1100 --virtual-time-budget=8000 --user-data-dir="$SAIDA/perfil")
  "$CHROME" "${opts[@]}" --dump-dom "$url" > "$SAIDA/$nome.html" 2>/dev/null
  "$CHROME" "${opts[@]}" --screenshot="$SAIDA/$nome.png" "$url" >/dev/null 2>&1
  tela="${rota%%\?*}"
  if grep -q 'data-erros=' "$SAIDA/$nome.html" || ! grep -q "data-pronta=\"$tela\"" "$SAIDA/$nome.html"; then
    echo "FALHOU $rota"
    sed -n 's/.*<pre id="erros"[^>]*>\([^<]*\).*/\1/p' "$SAIDA/$nome.html"
    FALHOU=1
  else
    echo "ok     $rota → $SAIDA/$nome.png"
  fi
done
exit $FALHOU
```

Run:
```bash
chmod +x analise-2026/analise.command analise-2026/verificar.sh
mkdir -p analise-2026/public/vendor analise-2026/public/css analise-2026/public/js/telas
curl -sL https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js -o analise-2026/public/vendor/d3.v7.min.js
head -c 120 analise-2026/public/vendor/d3.v7.min.js; echo
node --test analise-2026/test/servidor.teste.mjs
```
Expected: o `head` mostra `// https://d3js.org v7.9.0 ...`; teste do servidor PASS.

- [ ] **Step 3: Casca da página e estilos**

`analise-2026/public/index.html`:
```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Análise Eleição 2026 PR</title>
  <link rel="stylesheet" href="css/estilo.css">
  <script src="vendor/d3.v7.min.js"></script>
  <script type="module" src="js/main.mjs"></script>
</head>
<body>
  <header>
    <h1>ELEIÇÃO 2026 <b>PR</b> · análise</h1>
    <nav id="abas"></nav>
    <button id="tema" title="Alternar tema (T)">◐ tema</button>
  </header>
  <main id="tela"><p class="carregando">Carregando dados…</p></main>
  <footer id="rodape"></footer>
  <div id="dica" hidden></div>
  <pre id="erros" hidden></pre>
</body>
</html>
```

`analise-2026/public/css/estilo.css`:
```css
:root {
  --fundo: #0b0f17; --cartao: #141a26; --borda: #232c3d; --texto: #f2f5fa; --suave: #8b97ad;
  --laranja: #ff6a13; --laranja-2: #ffb074; --verde: #2ecc71; --azul: #4c8dff; --roxo: #b06cff; --rosa: #ff4f8b;
  --ambar: #f5b301; --barra: #5b6b8a; --mapa-vazio: #1b2231; --mapa-borda: #0b0f17;
}
:root[data-tema="claro"] {
  --fundo: #e9edf3; --cartao: #ffffff; --borda: #d5dce7; --texto: #131a26; --suave: #57647a;
  --laranja: #e85400; --laranja-2: #ff9a57; --verde: #0f8a45; --azul: #1f5fd6; --roxo: #7a3fd1; --rosa: #d42a68;
  --ambar: #b88600; --barra: #8c9ab3; --mapa-vazio: #e3e8ef; --mapa-borda: #ffffff;
}
* { box-sizing: border-box; margin: 0; }
body { background: var(--fundo); color: var(--texto); font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; font-variant-numeric: tabular-nums; min-height: 100vh; transition: background .4s ease; }
header { display: flex; align-items: center; gap: 24px; padding: 14px 24px; border-bottom: 1px solid var(--borda); position: sticky; top: 0; background: var(--fundo); z-index: 5; flex-wrap: wrap; }
h1 { font-size: 20px; font-weight: 300; letter-spacing: 2px; white-space: nowrap; }
h1 b { color: var(--laranja); font-weight: 800; }
nav { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
nav a { color: var(--suave); text-decoration: none; padding: 8px 14px; border-radius: 8px; font-size: 14px; }
nav a.ativa { background: var(--cartao); color: var(--texto); box-shadow: inset 0 -2px 0 var(--laranja); }
nav a kbd { opacity: .5; margin-right: 6px; font-size: 11px; font-family: inherit; }
button, select { background: var(--cartao); color: var(--texto); border: 1px solid var(--borda); border-radius: 8px; padding: 6px 12px; font: inherit; font-size: 14px; cursor: pointer; }
.seg { display: inline-flex; border: 1px solid var(--borda); border-radius: 8px; overflow: hidden; }
.seg button { border: 0; border-radius: 0; }
.seg button.on { background: var(--laranja); color: #fff; }
main { padding: 20px 24px 40px; animation: surgir .5s ease; }
.carregando { color: var(--suave); }
.grade { display: grid; gap: 16px; }
.g2 { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); }
.g3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.kpis { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.espaco { margin-top: 16px; }
.cartao { background: var(--cartao); border: 1px solid var(--borda); border-radius: 14px; padding: 16px; min-width: 0; }
.cartao h2 { font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--suave); font-weight: 600; margin-bottom: 12px; }
.cartao p { font-size: 14px; line-height: 1.6; }
.kpi b { display: block; font-size: 30px; font-weight: 800; }
.kpi small { color: var(--suave); font-size: 12px; line-height: 1.5; display: block; margin-top: 4px; }
.destaque { color: var(--laranja); }
small { color: var(--suave); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: var(--suave); font-weight: 600; padding: 6px; border-bottom: 1px solid var(--borda); white-space: nowrap; position: sticky; top: 0; background: var(--cartao); }
th[data-ordem] { cursor: pointer; }
td { padding: 5px 6px; border-bottom: 1px solid var(--borda); }
td.n, th.n { text-align: right; }
tr.foco td { color: var(--laranja); font-weight: 700; }
.rolagem { max-height: 420px; overflow: auto; }
.barras { display: flex; flex-direction: column; gap: 4px; }
.barra { display: grid; grid-template-columns: 170px 1fr auto; align-items: center; gap: 8px; font-size: 13px; }
.barra .rot { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.barra .trilho { height: 14px; background: var(--borda); border-radius: 7px; overflow: hidden; }
.barra .enche { display: block; height: 100%; width: 0; background: var(--barra); border-radius: 7px; transition: width 1.1s cubic-bezier(.2, .8, .2, 1); }
.barra.eleito .enche { background: var(--verde); }
.barra.foco .enche { background: var(--laranja); }
.barra .val { text-align: right; min-width: 60px; }
.empilhada { display: grid; grid-template-columns: 170px 1fr auto; gap: 8px; align-items: center; font-size: 13px; margin-top: 8px; }
.empilhada .trilho { display: flex; height: 16px; background: var(--borda); border-radius: 8px; overflow: hidden; }
.mapa { position: relative; width: 100%; aspect-ratio: 4 / 3; }
.mapa svg { width: 100%; height: 100%; display: block; cursor: grab; }
.mapa path { stroke: var(--mapa-borda); stroke-width: .5; vector-effect: non-scaling-stroke; transition: fill .6s ease; }
.mapa circle { stroke: var(--fundo); stroke-width: .6; vector-effect: non-scaling-stroke; fill-opacity: .85; }
.legenda { display: flex; align-items: center; gap: 8px 14px; font-size: 12px; color: var(--suave); margin-top: 8px; flex-wrap: wrap; }
.legenda .grad { flex: 1; min-width: 120px; height: 10px; border-radius: 5px; }
.chip { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
#dica { position: fixed; pointer-events: none; background: var(--cartao); border: 1px solid var(--borda); border-radius: 10px; padding: 10px 12px; font-size: 13px; line-height: 1.5; z-index: 20; max-width: 340px; box-shadow: 0 6px 24px rgba(0, 0, 0, .35); }
#dica b { display: block; margin-bottom: 2px; }
#erros { position: fixed; bottom: 0; left: 0; right: 0; background: #d1001f; color: #fff; padding: 8px 16px; font-size: 12px; white-space: pre-wrap; z-index: 30; }
.aviso { background: color-mix(in srgb, var(--ambar) 16%, transparent); border: 1px solid var(--ambar); border-radius: 10px; padding: 10px 14px; font-size: 13px; line-height: 1.5; }
.controles { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; font-size: 14px; }
footer { color: var(--suave); font-size: 12px; padding: 0 24px 24px; line-height: 1.5; }
@keyframes surgir { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (max-width: 1000px) {
  .g2, .g3 { grid-template-columns: 1fr; }
  .barra, .empilhada { grid-template-columns: 110px 1fr auto; }
  header, main { padding-left: 16px; padding-right: 16px; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
```

- [ ] **Step 4: Componentes**

`analise-2026/public/js/dica.mjs`:
```js
export function mostrarDica(ev, html) {
  const el = document.getElementById("dica");
  if (!html) { el.hidden = true; return; }
  el.innerHTML = html;
  el.hidden = false;
  el.style.left = `${Math.min(ev.clientX + 14, innerWidth - el.offsetWidth - 8)}px`;
  el.style.top = `${Math.min(ev.clientY + 14, innerHeight - el.offsetHeight - 8)}px`;
}
export function esconderDica() {
  document.getElementById("dica").hidden = true;
}
```

`analise-2026/public/js/animar.mjs`:
```js
import { esc } from "./fmt.mjs";

export const reduzido = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// Número "contando" de 0 até o valor final.
export function contar(el, ate, formato = String, ms = 1200) {
  if (reduzido()) { el.textContent = formato(ate); return; }
  const t0 = performance.now();
  const passo = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = formato(ate * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

// Barras horizontais que crescem em sequência ("corrida").
export function barras(el, itens, { formato = String, max } = {}) {
  const m = max ?? Math.max(1, ...itens.map((i) => i.valor));
  el.classList.add("barras");
  el.innerHTML = itens.map((i) => `
    <div class="barra ${i.classe ?? ""}" title="${esc(i.titulo ?? i.rotulo)}">
      <span class="rot">${esc(i.rotulo)}</span>
      <span class="trilho"><span class="enche" data-w="${(100 * i.valor) / m}" style="${i.cor ? `background:${i.cor}` : ""}"></span></span>
      <span class="val">${formato(i.valor)}</span>
    </div>`).join("");
  el.offsetWidth; // força o layout com largura 0 antes de animar
  el.querySelectorAll(".enche").forEach((e, k) => {
    e.style.transitionDelay = reduzido() ? "0s" : `${Math.min(k * 25, 900)}ms`;
    e.style.width = `${e.dataset.w}%`;
  });
}
```

`analise-2026/public/js/mapa.mjs`:
```js
import { esc } from "./fmt.mjs";
import { esconderDica, mostrarDica } from "./dica.mjs";

const d3 = globalThis.d3;
const LIMIAR_PONTOS = 2.5; // zoom a partir do qual os locais de votação aparecem

export const cor = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

export function escalaSeq(max, nomeVar) {
  const s = d3.scaleSequentialSqrt(d3.interpolateRgb(cor("--mapa-vazio"), cor(nomeVar))).domain([0, max || 1]);
  return (v) => s(0.06 * (max || 1) + 0.94 * v); // valor positivo pequeno já aparece tingido
}

export function escalaDiv(lim) {
  const s = d3.scaleDivergingSqrt(d3.interpolateRgbBasis([cor("--azul"), cor("--mapa-vazio"), cor("--laranja")])).domain([-lim, 0, lim]);
  return (d) => s(d);
}

export function legenda(el, { cores, min, max, titulo }) {
  el.innerHTML = `<div class="legenda"><span>${esc(titulo)}</span><span>${esc(min)}</span><span class="grad" style="background:linear-gradient(90deg,${cores.join(",")})"></span><span>${esc(max)}</span></div>`;
}

export function criarMapa(el, { geo, D }) {
  el.classList.add("mapa");
  const L = 800, A = 600;
  const proj = d3.geoMercator().fitSize([L, A], geo);
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${L} ${A}`);
  const g = svg.append("g");
  const munIdx = (f) => D.munPorIbge.get(f.properties.codarea);
  const areas = g.append("g").selectAll("path").data(geo.features).join("path")
    .attr("d", d3.geoPath(proj)).style("fill", "var(--mapa-vazio)");
  const camadaPontos = g.append("g");
  const xy = new Map();
  const posicao = (j) => {
    if (!xy.has(j)) xy.set(j, proj([D.locais[j].lon, D.locais[j].lat]));
    return xy.get(j);
  };
  let k = 1, pontos = [], semLimiar = false, htmlMun = null, htmlLoc = null, sincronizando = false;
  const ouvintes = [];

  areas.on("mousemove", (ev, f) => mostrarDica(ev, htmlMun?.(munIdx(f)))).on("mouseleave", esconderDica);

  function desenharPontos() {
    const visiveis = semLimiar || k >= LIMIAR_PONTOS ? pontos : [];
    camadaPontos.selectAll("circle").data(visiveis, (p) => p.j).join("circle")
      .attr("cx", (p) => posicao(p.j)[0]).attr("cy", (p) => posicao(p.j)[1])
      .attr("r", (p) => p.raio / Math.sqrt(k)).style("fill", (p) => p.cor)
      .on("mousemove", (ev, p) => mostrarDica(ev, htmlLoc?.(p.j))).on("mouseleave", esconderDica);
  }

  const zoom = d3.zoom().scaleExtent([1, 40]).translateExtent([[0, 0], [L, A]]).on("zoom", (ev) => {
    g.attr("transform", ev.transform);
    k = ev.transform.k;
    desenharPontos();
    if (!sincronizando) ouvintes.forEach((fn) => fn(ev.transform));
  });
  svg.call(zoom);

  return {
    colorir(fn) {
      areas.style("fill", (f) => {
        const i = munIdx(f);
        return (i == null ? null : fn(i)) ?? "var(--mapa-vazio)";
      });
    },
    pontos(lista, opcoes = {}) {
      semLimiar = !!opcoes.semLimiar;
      pontos = lista.filter((p) => D.locais[p.j].lat != null).sort((a, b) => b.raio - a.raio);
      desenharPontos();
      return lista.length - pontos.length;
    },
    dicas(fMun, fLoc) { htmlMun = fMun; htmlLoc = fLoc; },
    aoZoom(fn) { ouvintes.push(fn); },
    aplicarZoom(t) {
      sincronizando = true;
      svg.call(zoom.transform, t);
      sincronizando = false;
    },
  };
}
```

Acrescentar no topo de `analise-2026/public/js/tabela.mjs` a linha `import { esc } from "./fmt.mjs";` e, no fim do arquivo:
```js
// Tabela ordenável: clique no cabeçalho alterna a ordem. "formato" devolve HTML (já escapado).
export function tabela(el, { colunas, linhas, ordem = 0, desc = true, classe = () => "", limite = Infinity }) {
  let o = ordem, d = desc;
  const render = () => {
    const ls = ordenar(linhas, colunas[o].valor, d).slice(0, limite);
    el.innerHTML = `<table><thead><tr>${colunas.map((c, k) =>
      `<th data-ordem="${k}" class="${c.num ? "n" : ""}">${esc(c.rotulo)}${k === o ? (d ? " ▾" : " ▴") : ""}</th>`).join("")}</tr></thead>
      <tbody>${ls.map((l) => `<tr class="${classe(l)}">${colunas.map((c) =>
        `<td class="${c.num ? "n" : ""}">${(c.formato ?? esc)(c.valor(l), l)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    el.querySelectorAll("th").forEach((th) => {
      th.onclick = () => {
        const k = Number(th.dataset.ordem);
        if (k === o) d = !d; else { o = k; d = true; }
        render();
      };
    });
  };
  render();
}
```

- [ ] **Step 5: Tela Panorama e `main.mjs`**

`analise-2026/public/js/telas/panorama.mjs`:
```js
import { FOCO, PARTIDO } from "../config.mjs";
import { chapa, posicaoGeral } from "../dados.mjs";
import { barras, contar } from "../animar.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";

export function montar(el, { D }) {
  const c = D.cargo;
  const andre = D.porNumero.get(FOCO);
  const novo = chapa(D, PARTIDO);
  const ag = D.agremiacoes.find((a) => a.siglas.includes(PARTIDO));
  const totalNovo = ag.nominais + ag.legenda;
  const diretas = Math.floor(totalNovo / c.qe);
  const falta = (diretas + 1) * c.qe - totalNovo;
  el.innerHTML = `
    <div class="grade kpis">
      <div class="cartao kpi"><h2>Votos válidos</h2><b data-n="${c.validos}"></b><small>Deputado Estadual · Paraná · ${c.vagas} vagas</small></div>
      <div class="cartao kpi"><h2>Quociente eleitoral</h2><b data-n="${c.qe}"></b><small>votos por cadeira</small></div>
      <div class="cartao kpi"><h2>NOVO</h2><b data-n="${totalNovo}"></b><small>${inteiro(ag.nominais)} nominais + ${inteiro(ag.legenda)} de legenda · ${ag.vagas} cadeiras · faltaram ${inteiro(falta)} votos para a ${diretas + 1}ª pelo quociente</small></div>
      <div class="cartao kpi"><h2>André Santos</h2><b class="destaque" data-n="${andre.votos}"></b><small>${novo.indexOf(andre) + 1}º de ${novo.length} na chapa do NOVO · ${posicaoGeral(D, FOCO)}º de ${D.candidatos.length} no PR · ${pct(andre.votos / c.validos)} dos válidos · ${esc(andre.st)}</small></div>
    </div>
    <div class="grade g2 espaco">
      <div class="cartao"><h2>Chapa do NOVO · ${novo.length} candidatos · verde = eleito</h2><div id="pn-chapa"></div></div>
      <div class="cartao"><h2>Cadeiras por partido ou federação</h2><div id="pn-cadeiras"></div></div>
    </div>`;
  el.querySelectorAll("[data-n]").forEach((b) => contar(b, Number(b.dataset.n), inteiro));
  barras(el.querySelector("#pn-chapa"), novo.map((x) => ({
    rotulo: x.nm, valor: x.votos, classe: x.n === FOCO ? "foco" : x.eleito ? "eleito" : "", titulo: `${x.nm} (${x.n}) — ${x.st}`,
  })), { formato: inteiro });
  barras(el.querySelector("#pn-cadeiras"), D.agremiacoes.filter((a) => a.vagas > 0).sort((a, b) => b.vagas - a.vagas).map((a) => ({
    rotulo: a.rotulo, valor: a.vagas, classe: a.siglas.includes(PARTIDO) ? "foco" : "", titulo: a.nm,
  })));
}
```

`analise-2026/public/js/main.mjs`:
```js
import { indexar } from "./dados.mjs";
import { esc } from "./fmt.mjs";
import { escreverRota, lerRota } from "./rota.mjs";
import { esconderDica } from "./dica.mjs";
import * as panorama from "./telas/panorama.mjs";

const TELAS = [
  { id: "panorama", nome: "Panorama", mod: panorama },
];

let erros = 0;
function registrarErro(msg) {
  erros++;
  document.body.dataset.erros = String(erros);
  const pre = document.getElementById("erros");
  pre.hidden = false;
  pre.textContent += `${msg}\n`;
}
addEventListener("error", (e) => registrarErro(e.message));
addEventListener("unhandledrejection", (e) => registrarErro(String(e.reason?.stack ?? e.reason)));

function lerTema() {
  try { return localStorage.getItem("analise-2026-tema"); } catch { return null; }
}
function aplicarTema(t) {
  document.documentElement.dataset.tema = t;
  try { localStorage.setItem("analise-2026-tema", t); } catch { /* sem armazenamento: tudo bem */ }
}

async function carregar(url, opcional = false) {
  const r = await fetch(url).catch((e) => { if (opcional) return null; throw e; });
  if (!r?.ok) {
    if (opcional) return null;
    throw new Error(`${url}: HTTP ${r.status}`);
  }
  return r.json();
}

async function iniciar() {
  aplicarTema(lerTema() ?? "escuro");
  const tela = document.getElementById("tela");
  let base;
  try {
    const [dados, geo, interno] = await Promise.all([carregar("dados.json"), carregar("mapa.geo.json"), carregar("interno.json", true)]);
    base = { D: indexar(dados), geo, interno };
  } catch (e) {
    tela.innerHTML = `<div class="aviso">Não consegui carregar os dados (${esc(e.message)}). Rode <code>node analise-2026/coletar/coletar.mjs</code> na raiz do repositório e recarregue.</div>`;
    return;
  }
  const f = base.D.meta.fontes;
  document.getElementById("rodape").textContent =
    `Fontes: TSE — votação por seção (${f.secao}), locais de votação (${f.locais}), resultado oficial (${f.oficial}), prestação de contas (${f.contas}); IBGE — malha municipal. Gerado em ${new Date(base.D.meta.geradoEm).toLocaleString("pt-BR")}.`;
  const nav = document.getElementById("abas");
  nav.innerHTML = TELAS.map((t, k) => `<a href="#${t.id}" data-id="${t.id}"><kbd>${k + 1}</kbd>${t.nome}</a>`).join("");
  const ids = TELAS.map((t) => t.id);

  const render = () => {
    const { tela: id, params } = lerRota(location.hash, ids);
    nav.querySelectorAll("a").forEach((a) => a.classList.toggle("ativa", a.dataset.id === id));
    esconderDica();
    tela.replaceChildren();
    tela.style.animation = "none";
    tela.offsetWidth;
    tela.style.animation = "";
    const navegar = (novos) => { location.hash = escreverRota(id, { ...params, ...novos }); };
    TELAS.find((t) => t.id === id).mod.montar(tela, { ...base, params, navegar });
    document.body.dataset.pronta = id;
  };
  const trocarTema = () => {
    aplicarTema(document.documentElement.dataset.tema === "claro" ? "escuro" : "claro");
    render();
  };
  addEventListener("hashchange", render);
  addEventListener("keydown", (e) => {
    if (e.target.closest?.("select, input") || e.metaKey || e.ctrlKey) return;
    const n = Number(e.key);
    if (n >= 1 && n <= TELAS.length) location.hash = `#${TELAS[n - 1].id}`;
    if (e.key === "t" || e.key === "T") trocarTema();
  });
  document.getElementById("tema").onclick = trocarTema;
  render();
}

iniciar();
```

- [ ] **Step 6: Verificar no Chrome**

Run: `analise-2026/verificar.sh panorama`
Expected: `ok     panorama → /tmp/analise-2026-telas/panorama.png`.
Abrir `/tmp/analise-2026-telas/panorama.png` (Read tool) e conferir: 4 cartões com números (válidos ≈ 6.180.261, quociente 114.449, NOVO 407.190, André 9.481 em laranja), 41 barras da chapa com 3 verdes, barras de cadeiras com o NOVO em laranja. Rodapé com as 4 datas das fontes.

Run: `node --test analise-2026/test/*.teste.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add analise-2026/servidor.mjs analise-2026/analise.command analise-2026/verificar.sh analise-2026/test/servidor.teste.mjs analise-2026/public/index.html analise-2026/public/css/estilo.css analise-2026/public/vendor/d3.v7.min.js analise-2026/public/js/main.mjs analise-2026/public/js/dica.mjs analise-2026/public/js/animar.mjs analise-2026/public/js/mapa.mjs analise-2026/public/js/tabela.mjs analise-2026/public/js/telas/panorama.mjs
git commit -m "feat(analise-2026): página com servidor local, componentes e tela Panorama"
git push
```

---

### Task 9: Tela "De onde vieram os votos do André"

**Files:**
- Create: `analise-2026/public/js/telas/andre.mjs`
- Modify: `analise-2026/public/js/main.mjs` (import + entrada em `TELAS`)

**Interfaces:**
- Consumes: `serie`, `percentuais`, `porRegiao`, `porBairro` (Task 7); `concentracao` (Task 7); `criarMapa`, `legenda`, `cor`, `escalaSeq` (Task 8); `barras` (Task 8); `tabela` (Task 8).
- Produces: `montar(el, ctx)`; parâmetro de URL `modo=abs|pct`. Exporta também `dicaLocal(D, j, linhas: [{nm, v: Map, p: Map, destaque?}]) → html` (reaproveitada nas Tasks 11 e 12).

- [ ] **Step 1: Implementação**

`analise-2026/public/js/telas/andre.mjs`:
```js
import { FOCO } from "../config.mjs";
import { percentuais, porBairro, porRegiao, serie } from "../dados.mjs";
import { concentracao } from "../calc.mjs";
import { cor, criarMapa, escalaSeq, legenda } from "../mapa.mjs";
import { barras } from "../animar.mjs";
import { tabela } from "../tabela.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";

// Dica de um local de votação com uma linha por candidato.
export function dicaLocal(D, j, linhas) {
  const l = D.locais[j];
  return `<b>${esc(l.nm)}</b><small>${esc(l.bairro ?? "sem bairro")} · ${esc(D.municipios[l.mun].nm)} · ${inteiro(l.aptos)} eleitores · ${inteiro(l.total)} votos nominais</small><br>` +
    linhas.map((x) => `<span class="${x.destaque ? "destaque" : ""}">${esc(x.nm)}: ${inteiro(x.v.get(j) ?? 0)} (${pct(x.p.get(j) ?? 0)})</span>`).join("<br>");
}

export function dicaMunicipio(D, i, linhas) {
  const m = D.municipios[i];
  return `<b>${esc(m.nm)}</b><small>${m.regiao} · ${inteiro(m.validos)} votos válidos</small><br>` +
    linhas.map((x) => `<span class="${x.destaque ? "destaque" : ""}">${esc(x.nm)}: ${inteiro(x.v.get(i) ?? 0)} (${pct(x.p.get(i) ?? 0)})</span>`).join("<br>");
}

export function montar(el, { D, geo, params, navegar }) {
  const a = D.porNumero.get(FOCO);
  const modo = params.modo === "pct" ? "pct" : "abs";
  const vMun = serie(a, "mun"), pMun = percentuais(D, a, "mun");
  const vLoc = serie(a, "loc"), pLoc = percentuais(D, a, "loc");
  const cMun = concentracao([...vMun.values()]);
  const cLoc = concentracao([...vLoc.values()]);
  const zeros = D.municipios.length - cMun.n;
  el.innerHTML = `
    <div class="controles">
      <span class="seg"><button data-modo="abs" class="${modo === "abs" ? "on" : ""}">Votos</button><button data-modo="pct" class="${modo === "pct" ? "on" : ""}">% dos válidos</button></span>
      <small>Role o mouse sobre o mapa ou dê zoom: os locais de votação aparecem como círculos.</small>
    </div>
    <div class="grade g2">
      <div class="cartao"><h2>André Santos · ${inteiro(a.votos)} votos por município</h2><div id="an-mapa"></div><div id="an-leg"></div><small id="an-semcoord"></small></div>
      <div class="grade" style="align-content:start">
        <div class="cartao"><h2>Por região</h2><div id="an-reg"></div></div>
        <div class="cartao"><h2>Concentração</h2><p>
          <b>${cMun.p50}</b> municípios fazem 50% dos votos e <b>${cMun.p80}</b> fazem 80% (de ${cMun.n} com voto).<br>
          <b>${cLoc.p50}</b> locais de votação fazem 50% e <b>${cLoc.p80}</b> fazem 80% (de ${cLoc.n} com voto).<br>
          <b>${zeros}</b> dos ${D.municipios.length} municípios não deram nenhum voto.</p></div>
      </div>
    </div>
    <div class="grade g3 espaco">
      <div class="cartao"><h2>Top 20 municípios</h2><div id="an-tmun" class="rolagem"></div></div>
      <div class="cartao"><h2>Top 20 locais de votação</h2><div id="an-tloc" class="rolagem"></div></div>
      <div class="cartao"><h2>Bairros de Curitiba</h2><div id="an-bairros" class="rolagem"></div></div>
    </div>`;
  el.querySelectorAll("[data-modo]").forEach((b) => { b.onclick = () => navegar({ modo: b.dataset.modo }); });

  const mapa = criarMapa(el.querySelector("#an-mapa"), { geo, D });
  const valores = modo === "pct" ? pMun : vMun;
  const max = Math.max(1e-9, ...valores.values());
  const escala = escalaSeq(max, "--laranja");
  mapa.colorir((i) => (valores.get(i) ? escala(valores.get(i)) : null));
  legenda(el.querySelector("#an-leg"), {
    cores: [cor("--mapa-vazio"), cor("--laranja")], min: "0", max: modo === "pct" ? pct(max) : inteiro(max), titulo: modo === "pct" ? "% dos válidos" : "votos",
  });
  const maxL = Math.max(1, ...vLoc.values());
  const sem = mapa.pontos([...vLoc].map(([j, v]) => ({ j, raio: 2 + 14 * Math.sqrt(v / maxL), cor: "var(--laranja-2)" })));
  if (sem) el.querySelector("#an-semcoord").textContent = `${sem} locais sem coordenada ficaram fora do mapa.`;
  const linhas = (v, p) => [{ nm: a.nm, v, p, destaque: true }];
  mapa.dicas((i) => dicaMunicipio(D, i, linhas(vMun, pMun)), (j) => dicaLocal(D, j, linhas(vLoc, pLoc)));

  barras(el.querySelector("#an-reg"), Object.entries(porRegiao(D, a)).map(([k, v]) => ({ rotulo: k, valor: v, classe: "foco" })),
    { formato: (v) => `${inteiro(v)} · ${pct(v / a.votos, 1)}` });

  tabela(el.querySelector("#an-tmun"), {
    linhas: [...vMun].map(([i, v]) => ({ i, v, p: pMun.get(i) })), ordem: 1, limite: 20,
    colunas: [
      { rotulo: "Município", valor: (l) => D.municipios[l.i].nm },
      { rotulo: "Votos", valor: (l) => l.v, formato: inteiro, num: true },
      { rotulo: "% válidos", valor: (l) => l.p, formato: (v) => pct(v), num: true },
    ],
  });
  tabela(el.querySelector("#an-tloc"), {
    linhas: [...vLoc].map(([j, v]) => ({ j, v, p: pLoc.get(j) })), ordem: 1, limite: 20,
    colunas: [
      { rotulo: "Local", valor: (l) => D.locais[l.j].nm, formato: (v, l) => `${esc(v)}<br><small>${esc(D.locais[l.j].bairro ?? "")} · ${esc(D.municipios[D.locais[l.j].mun].nm)}</small>` },
      { rotulo: "Votos", valor: (l) => l.v, formato: inteiro, num: true },
      { rotulo: "% no local", valor: (l) => l.p, formato: (v) => pct(v), num: true },
    ],
  });
  tabela(el.querySelector("#an-bairros"), {
    linhas: porBairro(D, a), ordem: 1,
    colunas: [
      { rotulo: "Bairro", valor: (l) => l.bairro },
      { rotulo: "Votos", valor: (l) => l.votos, formato: inteiro, num: true },
      { rotulo: "% no bairro", valor: (l) => (l.total ? l.votos / l.total : null), formato: (v) => pct(v), num: true },
    ],
  });
}
```

Em `analise-2026/public/js/main.mjs`, acrescentar o import abaixo do de `panorama` e a entrada em `TELAS`:
```js
import * as andre from "./telas/andre.mjs";
```
```js
  { id: "andre", nome: "Votos do André", mod: andre },
```

- [ ] **Step 2: Verificar no Chrome**

Run: `analise-2026/verificar.sh andre "andre?modo=pct"`
Expected: duas linhas `ok`.
Abrir `/tmp/analise-2026-telas/andre.png`: mapa do PR com municípios em tons de laranja (Curitiba e litoral mais fortes), barras por região (Curitiba ≈ 3.748, RMC ≈ 2.681, Interior ≈ 2.015, Litoral ≈ 1.004 — da análise de 04/10; diferença pequena é aceitável se as somas batem 9.481), três tabelas preenchidas.

- [ ] **Step 3: Commit**

```bash
git add analise-2026/public/js/telas/andre.mjs analise-2026/public/js/main.mjs
git commit -m "feat(analise-2026): tela de origem dos votos do André (mapa, regiões, locais, bairros)"
git push
```

---

### Task 10: Tela "Custo do voto"

**Files:**
- Create: `analise-2026/public/js/telas/custo.mjs`
- Modify: `analise-2026/public/js/main.mjs`

**Interfaces:**
- Consumes: `rsPorVoto` (Task 7); `CATEGORIAS_RECEITA`, `CORES_IGREJA` (Task 1); `tabela`, `mostrarDica`, `esconderDica`, `reduzido` (Task 8); `interno` do contexto (`{ andre: { gastoInterno, fonte, data } }` ou `null`).
- Produces: `montar(el, ctx)`; parâmetro `eixo=receita|despesa`.

- [ ] **Step 1: Implementação**

`analise-2026/public/js/telas/custo.mjs`:
```js
import { CATEGORIAS_RECEITA, CORES_IGREJA, FOCO, PARTIDO, RIVAIS_IGREJA } from "../config.mjs";
import { rsPorVoto } from "../calc.mjs";
import { tabela } from "../tabela.mjs";
import { esconderDica, mostrarDica } from "../dica.mjs";
import { reduzido } from "../animar.mjs";
import { esc, inteiro, reais, reaisCurto } from "../fmt.mjs";

const d3 = globalThis.d3;
const CORES_CATS = ["--laranja", "--laranja-2", "--ambar", "--azul", "--roxo", "--rosa", "--barra"];
const porVoto = (v, c) => (!c.votos ? "—" : reais(v));

function dispersao(el, pts, eixo) {
  const L = 640, A = 420, m = { t: 16, r: 120, b: 40, l: 64 };
  const x = d3.scaleSqrt().domain([0, d3.max(pts, (c) => c[eixo]) || 1]).range([m.l, L - m.r]).nice();
  const y = d3.scaleSqrt().domain([0, d3.max(pts, (c) => c.votos) || 1]).range([A - m.b, m.t]).nice();
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${L} ${A}`).style("width", "100%");
  svg.append("g").attr("transform", `translate(0,${A - m.b})`).call(d3.axisBottom(x).ticks(5).tickFormat(reaisCurto)).attr("color", "var(--suave)");
  svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(inteiro)).attr("color", "var(--suave)");
  const corDe = (c) => CORES_IGREJA[c.n] ?? (c.eleito ? "var(--verde)" : "var(--barra)");
  const ms = reduzido() ? 0 : 1200;
  svg.append("g").selectAll("circle").data(pts).join("circle")
    .attr("cx", x(0)).attr("cy", y(0)).attr("r", (c) => (CORES_IGREJA[c.n] ? 7 : 4.5)).style("fill", corDe).style("fill-opacity", 0.9)
    .on("mousemove", (ev, c) => mostrarDica(ev, `<b>${esc(c.nm)}</b>${esc(c.sg)} · ${inteiro(c.votos)} votos<br>${eixo === "receita" ? "Receita" : "Despesa"}: ${reais(c[eixo], 0)}<br>${porVoto(rsPorVoto(c[eixo], c.votos), c)} por voto`))
    .on("mouseleave", esconderDica)
    .transition().duration(ms).delay((c, k) => (ms ? k * 15 : 0))
    .attr("cx", (c) => x(c[eixo])).attr("cy", (c) => y(c.votos));
  svg.append("g").selectAll("text").data(pts.filter((c) => CORES_IGREJA[c.n] || c.eleito)).join("text")
    .attr("x", (c) => x(c[eixo]) + 10).attr("y", (c) => y(c.votos) + 4).text((c) => c.nm)
    .style("fill", "var(--texto)").style("font-size", "11px").style("opacity", 0)
    .transition().delay(ms).duration(ms ? 400 : 0).style("opacity", 1);
}

function origem(el, cands) {
  const max = Math.max(1, ...cands.map((c) => c.receita ?? 0));
  el.innerHTML = `<div class="legenda">${CATEGORIAS_RECEITA.map((k, i) => `<span><span class="chip" style="background:var(${CORES_CATS[i]})"></span>${esc(k)}</span>`).join("")}</div>` +
    cands.map((c) => `
      <div class="empilhada">
        <span class="rot">${esc(c.nm)}</span>
        <span class="trilho">${CATEGORIAS_RECEITA.map((k, i) => {
          const v = c.receitaPorOrigem?.[k];
          return v ? `<span title="${esc(k)}: ${reais(v, 0)}" style="width:${(100 * v) / max}%;background:var(${CORES_CATS[i]})"></span>` : "";
        }).join("")}</span>
        <span class="val">${reais(c.receita, 0)}</span>
      </div>`).join("");
}

export function montar(el, { D, params, navegar, interno }) {
  const eixo = params.eixo === "despesa" ? "despesa" : "receita";
  const grupo = D.candidatos.filter((c) => c.sg === PARTIDO || RIVAIS_IGREJA.includes(c.n));
  const comValor = grupo.filter((c) => c[eixo] != null);
  const andre = D.porNumero.get(FOCO);
  const gi = interno?.andre?.gastoInterno;
  el.innerHTML = `
    <div class="aviso">Valores declarados ao TSE na prestação de contas parcial (arquivo gerado em ${esc(D.meta.fontes.contas)}). A prestação final sai em novembro e os números podem subir. As despesas contratadas ainda estão bem abaixo das receitas; por isso o custo principal usa a <b>receita</b>.</div>
    <div class="controles espaco">
      <span class="seg"><button data-eixo="receita" class="${eixo === "receita" ? "on" : ""}">Receita</button><button data-eixo="despesa" class="${eixo === "despesa" ? "on" : ""}">Despesa contratada</button></span>
      ${gi ? `<small>Gasto do André no módulo financeiro: <b>${reais(gi)}</b> (${reais(rsPorVoto(gi, andre.votos))} por voto) — ${esc(interno.andre.fonte)}, ${esc(interno.andre.data)}</small>` : ""}
    </div>
    <div class="grade g2">
      <div class="cartao"><h2>${eixo === "receita" ? "Receita" : "Despesa contratada"} × votos · NOVO + rivais</h2><div id="cu-disp"></div>
        <small>${grupo.length - comValor.length ? `${grupo.length - comValor.length} candidato(s) sem ${eixo} declarada ficaram fora do gráfico.` : ""}</small></div>
      <div class="cartao"><h2>De onde veio o dinheiro</h2><div id="cu-origem"></div></div>
    </div>
    <div class="cartao espaco"><h2>Chapa do NOVO + rivais da igreja · clique no cabeçalho para ordenar</h2><div id="cu-tab"></div></div>`;
  el.querySelectorAll("[data-eixo]").forEach((b) => { b.onclick = () => navegar({ eixo: b.dataset.eixo }); });
  dispersao(el.querySelector("#cu-disp"), comValor, eixo);
  origem(el.querySelector("#cu-origem"), [FOCO, ...RIVAIS_IGREJA].map((n) => D.porNumero.get(n)));
  tabela(el.querySelector("#cu-tab"), {
    linhas: grupo, ordem: 2, classe: (c) => (c.n === FOCO ? "foco" : ""),
    colunas: [
      { rotulo: "Candidato", valor: (c) => c.nm },
      { rotulo: "Partido", valor: (c) => c.sg },
      { rotulo: "Votos", valor: (c) => c.votos, formato: inteiro, num: true },
      { rotulo: "Receita", valor: (c) => c.receita, formato: (v) => reais(v, 0), num: true },
      { rotulo: "R$/voto (receita)", valor: (c) => rsPorVoto(c.receita, c.votos), formato: porVoto, num: true },
      { rotulo: "Despesa contratada", valor: (c) => c.despesa, formato: (v) => reais(v, 0), num: true },
      { rotulo: "R$/voto (despesa)", valor: (c) => rsPorVoto(c.despesa, c.votos), formato: porVoto, num: true },
      { rotulo: "Situação", valor: (c) => c.st },
    ],
  });
}
```
CSS: as partes da barra empilhada são `<span>` dentro de `.empilhada .trilho` (flex). Acrescentar ao `estilo.css`:
```css
.empilhada .trilho span { display: block; height: 100%; }
```

Em `main.mjs`:
```js
import * as custo from "./telas/custo.mjs";
```
```js
  { id: "custo", nome: "Custo do voto", mod: custo },
```

- [ ] **Step 2: Verificar no Chrome**

Run: `analise-2026/verificar.sh custo "custo?eixo=despesa"`
Expected: duas linhas `ok`.
Abrir `/tmp/analise-2026-telas/custo.png`: tabela com André R$ 92.064 / R$ 9,71 por voto; Mara R$ 954.014 / R$ 23,19; Fabio R$ 794.000 / R$ 35,50; Dirlete R$ 495.000 / R$ 93,43. Dispersão com os 4 pontos coloridos e rotulados; barras empilhadas de origem.

- [ ] **Step 3: Commit**

```bash
git add analise-2026/public/js/telas/custo.mjs analise-2026/public/js/main.mjs analise-2026/public/css/estilo.css
git commit -m "feat(analise-2026): tela de custo do voto (receita e despesa por voto, origem do dinheiro)"
git push
```

---

### Task 11: Comparador

**Files:**
- Create: `analise-2026/public/js/telas/comparador.mjs`
- Modify: `analise-2026/public/js/main.mjs`

**Interfaces:**
- Consumes: `serie`, `percentuais`, `comparaveis`, `escolherB` (Task 7); `concentracao`, `sobreposicao`, `pearson`, `diferenca`, `rsPorVoto` (Task 7); `criarMapa`, `legenda`, `cor`, `escalaSeq`, `escalaDiv` (Task 8); `tabela` (Task 8); `dicaLocal`, `dicaMunicipio` (Task 9).
- Produces: `montar(el, ctx)`; parâmetros `b=<número>`, `nivel=mun|loc`, `modo=lado|dif`.

- [ ] **Step 1: Implementação**

`analise-2026/public/js/telas/comparador.mjs`:
```js
import { FOCO } from "../config.mjs";
import { comparaveis, escolherB, percentuais, serie } from "../dados.mjs";
import { concentracao, diferenca, pearson, rsPorVoto, sobreposicao } from "../calc.mjs";
import { cor, criarMapa, escalaDiv, escalaSeq, legenda } from "../mapa.mjs";
import { tabela } from "../tabela.mjs";
import { esc, inteiro, pct, reais } from "../fmt.mjs";
import { dicaLocal, dicaMunicipio } from "./andre.mjs";

export function montar(el, { D, geo, params, navegar }) {
  const a = D.porNumero.get(FOCO);
  const b = escolherB(D, params.b);
  const nivel = params.nivel === "loc" ? "loc" : "mun";
  const modo = params.modo === "dif" ? "dif" : "lado";
  const un = nivel === "loc" ? "locais" : "municípios";
  const va = serie(a, nivel), vb = serie(b, nivel);
  const pa = percentuais(D, a, nivel), pb = percentuais(D, b, nivel);
  const sob = sobreposicao(va, vb);
  const r = pearson(pa, pb);
  const ca = concentracao([...va.values()]), cb = concentracao([...vb.values()]);
  const linha = (rot, x, y) => `<tr><td>${rot}</td><td class="n destaque">${x}</td><td class="n">${y}</td></tr>`;
  const rpv = (c) => (!c.votos ? "—" : reais(rsPorVoto(c.receita, c.votos)));

  el.innerHTML = `
    <div class="controles">
      <label>Comparar André com <select id="cp-b">${comparaveis(D).map((c) =>
        `<option value="${c.n}" ${c.n === b.n ? "selected" : ""}>${esc(c.nm)} (${esc(c.sg)}) — ${inteiro(c.votos)}</option>`).join("")}</select></label>
      <span class="seg"><button data-nivel="mun" class="${nivel === "mun" ? "on" : ""}">Municípios</button><button data-nivel="loc" class="${nivel === "loc" ? "on" : ""}">Locais de votação</button></span>
      <span class="seg"><button data-modo="lado" class="${modo === "lado" ? "on" : ""}">Lado a lado</button><button data-modo="dif" class="${modo === "dif" ? "on" : ""}">Diferença</button></span>
    </div>
    <div class="grade g2">
      <div class="cartao">${modo === "lado"
        ? `<div class="grade" style="grid-template-columns:1fr 1fr"><div><h2 class="destaque">${esc(a.nm)}</h2><div id="cp-ma"></div></div><div><h2>${esc(b.nm)}</h2><div id="cp-mb"></div></div></div>`
        : `<h2>Diferença de % · laranja = André mais forte · azul = ${esc(b.nm)} mais forte</h2><div id="cp-md"></div>`}
        <div id="cp-leg"></div></div>
      <div class="cartao"><h2>Números</h2>
        <table><thead><tr><th></th><th class="n">${esc(a.nm)}</th><th class="n">${esc(b.nm)}</th></tr></thead><tbody>
          ${linha("Votos", inteiro(a.votos), inteiro(b.votos))}
          ${linha("Partido", esc(a.sg), esc(b.sg))}
          ${linha("Situação", esc(a.st), esc(b.st))}
          ${linha("Receita declarada", reais(a.receita, 0), reais(b.receita, 0))}
          ${linha("R$ por voto (receita)", rpv(a), rpv(b))}
          ${linha(`${un} com voto`, inteiro(va.size), inteiro(vb.size))}
          ${linha(`${un} que fazem 80% dos votos`, inteiro(ca.p80), inteiro(cb.p80))}
          ${linha(`% dos votos em ${un} onde o outro também teve voto`, pct(sob.fracA, 1), pct(sob.fracB, 1))}
        </tbody></table>
        <p class="espaco">${inteiro(sob.areas)} ${un} com voto dos dois. Correlação geográfica do % por ${nivel === "loc" ? "local" : "município"}:
          <b>${r == null ? "—" : r.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</b> <small>(1 = mesma base; 0 = sem relação; negativo = bases opostas)</small></p>
      </div>
    </div>
    <div class="grade g2 espaco">
      <div class="cartao"><h2>Onde ${esc(b.nm)} foi forte e André fraco</h2><div id="cp-tb" class="rolagem"></div></div>
      <div class="cartao"><h2>Onde André foi forte e ${esc(b.nm)} fraco</h2><div id="cp-ta" class="rolagem"></div></div>
    </div>`;
  el.querySelector("#cp-b").onchange = (e) => navegar({ b: e.target.value });
  el.querySelectorAll("[data-nivel]").forEach((x) => { x.onclick = () => navegar({ nivel: x.dataset.nivel }); });
  el.querySelectorAll("[data-modo]").forEach((x) => { x.onclick = () => navegar({ modo: x.dataset.modo }); });

  const linhasDica = [{ nm: a.nm, v: va, p: pa, destaque: true }, { nm: b.nm, v: vb, p: pb }];
  const dicaMunSimples = (i) => `<b>${esc(D.municipios[i].nm)}</b><small>dê zoom para ver os locais</small>`;
  const ligarDicas = (m) => (nivel === "mun"
    ? m.dicas((i) => dicaMunicipio(D, i, linhasDica), null)
    : m.dicas(dicaMunSimples, (j) => dicaLocal(D, j, linhasDica)));

  if (modo === "lado") {
    const max = Math.max(1e-9, ...pa.values(), ...pb.values());
    const s = escalaSeq(max, "--laranja");
    const pintar = (m, v, p) => {
      if (nivel === "mun") m.colorir((i) => (p.get(i) ? s(p.get(i)) : null));
      else {
        m.colorir(() => null);
        const maxV = Math.max(1, ...va.values(), ...vb.values());
        m.pontos([...v].map(([j, x]) => ({ j, raio: 1.5 + 9 * Math.sqrt(x / maxV), cor: s(p.get(j)) })), { semLimiar: true });
      }
      ligarDicas(m);
    };
    const ma = criarMapa(el.querySelector("#cp-ma"), { geo, D });
    const mb = criarMapa(el.querySelector("#cp-mb"), { geo, D });
    pintar(ma, va, pa);
    pintar(mb, vb, pb);
    ma.aoZoom((t) => mb.aplicarZoom(t));
    mb.aoZoom((t) => ma.aplicarZoom(t));
    legenda(el.querySelector("#cp-leg"), { cores: [cor("--mapa-vazio"), cor("--laranja")], min: "0%", max: pct(max), titulo: `% ${nivel === "loc" ? "no local" : "dos válidos"} (mesma escala nos dois mapas)` });
  } else {
    const dd = new Map(diferenca(pa, pb).map((l) => [l.k, l.d]));
    const lim = Math.max(1e-9, ...[...dd.values()].map(Math.abs));
    const s = escalaDiv(lim);
    const m = criarMapa(el.querySelector("#cp-md"), { geo, D });
    if (nivel === "mun") m.colorir((i) => (dd.has(i) ? s(dd.get(i)) : null));
    else {
      m.colorir(() => null);
      m.pontos([...dd].map(([j, d]) => ({ j, raio: 1.5 + 9 * Math.sqrt(Math.abs(d) / lim), cor: s(d) })), { semLimiar: true });
    }
    ligarDicas(m);
    legenda(el.querySelector("#cp-leg"), { cores: [cor("--azul"), cor("--mapa-vazio"), cor("--laranja")], min: `${b.nm} +${pct(lim, 1)}`, max: `André +${pct(lim, 1)}`, titulo: "diferença de %" });
  }

  const nomeArea = (k) => (nivel === "loc" ? D.locais[k].nm : D.municipios[k].nm);
  const htmlArea = (v, l) => (nivel === "loc"
    ? `${esc(v)}<br><small>${esc(D.locais[l.k].bairro ?? "")} · ${esc(D.municipios[D.locais[l.k].mun].nm)}</small>`
    : esc(v));
  const tabelaDif = (alvo, x, y, vx, vy, nx, ny) => tabela(alvo, {
    linhas: diferenca(x, y).filter((l) => l.d > 0), ordem: 1, limite: 30,
    colunas: [
      { rotulo: nivel === "loc" ? "Local" : "Município", valor: (l) => nomeArea(l.k), formato: htmlArea },
      { rotulo: "Diferença", valor: (l) => l.d, formato: (v) => `${pct(v)}`, num: true },
      { rotulo: `% ${nx}`, valor: (l) => l.x, formato: (v) => pct(v), num: true },
      { rotulo: `% ${ny}`, valor: (l) => l.y, formato: (v) => pct(v), num: true },
      { rotulo: `Votos ${nx}`, valor: (l) => vx.get(l.k) ?? 0, formato: inteiro, num: true },
      { rotulo: `Votos ${ny}`, valor: (l) => vy.get(l.k) ?? 0, formato: inteiro, num: true },
    ],
  });
  const curto = (c) => c.nm.split(" ")[0];
  tabelaDif(el.querySelector("#cp-tb"), pb, pa, vb, va, curto(b), "André");
  tabelaDif(el.querySelector("#cp-ta"), pa, pb, va, vb, "André", curto(b));
}
```

Em `main.mjs`:
```js
import * as comparador from "./telas/comparador.mjs";
```
```js
  { id: "comparador", nome: "Comparador", mod: comparador },
```

- [ ] **Step 2: Verificar no Chrome (inclui URLs inválidas da Review Focus)**

Run: `analise-2026/verificar.sh comparador "comparador?b=10456&nivel=loc" "comparador?b=30300&modo=dif" "comparador?b=30300&nivel=loc&modo=dif" "comparador?b=30777" "comparador?b=99999&nivel=xyz"`
Expected: seis linhas `ok` (as duas últimas caem no Fabio Oliveira, nível município).
Abrir `/tmp/analise-2026-telas/comparador.png`: dois mapas lado a lado (André × Fabio), tabela de números com Fabio 22.365 votos, R$ 35,50/voto; duas tabelas de diferença preenchidas. Abrir `comparador_b_30300_modo_dif.png`: um mapa azul/laranja.

- [ ] **Step 3: Commit**

```bash
git add analise-2026/public/js/telas/comparador.mjs analise-2026/public/js/main.mjs
git commit -m "feat(analise-2026): comparador do André com qualquer candidato da chapa ou rival"
git push
```

---

### Task 12: Rivais da igreja

**Files:**
- Create: `analise-2026/public/js/telas/igreja.mjs`
- Modify: `analise-2026/public/js/main.mjs`

**Interfaces:**
- Consumes: `serie`, `percentuais`, `porRegiao` (Task 7); `vencedor`, `sobreposicao` (Task 7); `criarMapa` (Task 8); `barras`, `tabela` (Task 8); `dicaLocal`, `dicaMunicipio` (Task 9); `CORES_IGREJA`, `RIVAIS_IGREJA`, `FOCO` (Task 1).
- Produces: `montar(el, ctx)`; parâmetro `nivel=mun|loc`.

- [ ] **Step 1: Implementação**

`analise-2026/public/js/telas/igreja.mjs`:
```js
import { CORES_IGREJA, FOCO, RIVAIS_IGREJA } from "../config.mjs";
import { percentuais, porRegiao, serie } from "../dados.mjs";
import { sobreposicao, vencedor } from "../calc.mjs";
import { criarMapa } from "../mapa.mjs";
import { barras } from "../animar.mjs";
import { tabela } from "../tabela.mjs";
import { esc, inteiro, pct } from "../fmt.mjs";
import { dicaLocal, dicaMunicipio } from "./andre.mjs";

export function montar(el, { D, geo, params, navegar }) {
  const nivel = params.nivel === "loc" ? "loc" : "mun";
  const un = nivel === "loc" ? "locais" : "municípios";
  const cands = [FOCO, ...RIVAIS_IGREJA].map((n) => D.porNumero.get(n));
  const series = cands.map((c) => ({ n: c.n, mapa: serie(c, nivel) }));
  const venc = vencedor(series);
  const vitorias = (n) => [...venc.values()].filter((w) => w.n === n).length;
  const curto = (c) => (c.n === FOCO ? "André" : c.nm.replace("CANTORA ", "").split(" ")[0]);

  el.innerHTML = `
    <div class="controles">
      <span class="seg"><button data-nivel="mun" class="${nivel === "mun" ? "on" : ""}">Municípios</button><button data-nivel="loc" class="${nivel === "loc" ? "on" : ""}">Locais de votação</button></span>
      ${cands.map((c) => `<span><span class="chip" style="background:${CORES_IGREJA[c.n]}"></span>${esc(c.nm)} (${esc(c.sg)}) · ${inteiro(c.votos)} votos · lidera em ${inteiro(vitorias(c.n))} ${un}</span>`).join("")}
    </div>
    <div class="grade g2">
      <div class="cartao"><h2>Quem teve mais votos em cada ${nivel === "loc" ? "local" : "município"}, entre os quatro</h2><div id="ig-mapa"></div>
        <small>Sem cor: nenhum dos quatro teve voto. Cinza: empate no primeiro lugar.</small></div>
      <div class="grade" style="align-content:start">
        <div class="cartao"><h2>Votos por região</h2><div id="ig-reg"></div></div>
        <div class="cartao"><h2>Sobreposição de bases (locais de votação)</h2><div id="ig-sob"></div>
          <small>Cada linha: % dos votos daquele candidato que estão em locais onde o da coluna também teve voto.</small></div>
      </div>
    </div>
    <div class="grade g3 espaco">${RIVAIS_IGREJA.map((n) =>
      `<div class="cartao"><h2>Onde ${esc(D.porNumero.get(n).nm)} foi mais forte</h2><div id="ig-top-${n}" class="rolagem"></div></div>`).join("")}</div>`;
  el.querySelectorAll("[data-nivel]").forEach((x) => { x.onclick = () => navegar({ nivel: x.dataset.nivel }); });

  const corVenc = (w) => (!w ? null : w.n ? CORES_IGREJA[w.n] : "var(--barra)");
  const linhasDica = cands.map((c) => ({ nm: c.nm, v: serie(c, nivel), p: percentuais(D, c, nivel), destaque: c.n === FOCO }));
  const mapa = criarMapa(el.querySelector("#ig-mapa"), { geo, D });
  if (nivel === "mun") {
    mapa.colorir((i) => corVenc(venc.get(i)));
    mapa.dicas((i) => dicaMunicipio(D, i, linhasDica), null);
  } else {
    mapa.colorir(() => null);
    const soma = (j) => series.reduce((s, x) => s + (x.mapa.get(j) ?? 0), 0);
    const maxS = Math.max(1, ...[...venc.keys()].map(soma));
    mapa.pontos([...venc].map(([j, w]) => ({ j, raio: 1.5 + 9 * Math.sqrt(soma(j) / maxS), cor: corVenc(w) })), { semLimiar: true });
    mapa.dicas((i) => `<b>${esc(D.municipios[i].nm)}</b>`, (j) => dicaLocal(D, j, linhasDica));
  }

  const regioes = cands.map((c) => porRegiao(D, c));
  const maxReg = Math.max(1, ...regioes.flatMap((r) => Object.values(r)));
  barras(el.querySelector("#ig-reg"), Object.keys(regioes[0]).flatMap((reg) => cands.map((c, k) => ({
    rotulo: `${reg} · ${curto(c)}`, valor: regioes[k][reg], cor: CORES_IGREJA[c.n], titulo: `${c.nm} em ${reg}`,
  }))), { formato: inteiro, max: maxReg });

  const sl = cands.map((c) => serie(c, "loc"));
  el.querySelector("#ig-sob").innerHTML = `<table><thead><tr><th></th>${cands.map((c) => `<th class="n">${esc(curto(c))}</th>`).join("")}</tr></thead><tbody>${
    cands.map((c, i) => `<tr><td><span class="chip" style="background:${CORES_IGREJA[c.n]}"></span>${esc(curto(c))}</td>${
      cands.map((_, j) => `<td class="n">${i === j ? "—" : pct(sobreposicao(sl[i], sl[j]).fracA, 0)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  const vAndre = serie(D.porNumero.get(FOCO), "loc");
  for (const n of RIVAIS_IGREJA) {
    const c = D.porNumero.get(n);
    const p = percentuais(D, c, "loc");
    tabela(el.querySelector(`#ig-top-${n}`), {
      linhas: [...serie(c, "loc")].map(([j, v]) => ({ j, v, p: p.get(j), a: vAndre.get(j) ?? 0 })), ordem: 1, limite: 15,
      colunas: [
        { rotulo: "Local", valor: (l) => D.locais[l.j].nm, formato: (v, l) => `${esc(v)}<br><small>${esc(D.locais[l.j].bairro ?? "")} · ${esc(D.municipios[D.locais[l.j].mun].nm)}</small>` },
        { rotulo: `Votos ${curto(c)}`, valor: (l) => l.v, formato: inteiro, num: true },
        { rotulo: "% no local", valor: (l) => l.p, formato: (v) => pct(v), num: true },
        { rotulo: "Votos André", valor: (l) => l.a, formato: inteiro, num: true },
      ],
    });
  }
}
```

Em `main.mjs`:
```js
import * as igreja from "./telas/igreja.mjs";
```
```js
  { id: "igreja", nome: "Rivais da igreja", mod: igreja },
```

- [ ] **Step 2: Verificar no Chrome**

Run: `analise-2026/verificar.sh igreja "igreja?nivel=loc"`
Expected: duas linhas `ok`.
Abrir `/tmp/analise-2026-telas/igreja.png`: mapa com 4 cores (rosa = Mara deve dominar boa parte), barras por região em 4 cores, matriz 4×4 preenchida com "—" na diagonal, 3 tabelas de top 15 locais.

- [ ] **Step 3: Commit**

```bash
git add analise-2026/public/js/telas/igreja.mjs analise-2026/public/js/main.mjs
git commit -m "feat(analise-2026): tela dos rivais da igreja (quem lidera onde, sobreposição de bases)"
git push
```

---

### Task 13: README, gasto interno e verificação final

**Files:**
- Create: `analise-2026/README.md`
- Create (local, gitignored): `analise-2026/public/interno.json`

**Interfaces:**
- Consumes: tudo.

- [ ] **Step 1: README**

`analise-2026/README.md`:
````markdown
# Análise da eleição 2026 — Paraná (Deputado Estadual)

Painel interno para entender o resultado do André Santos (30777): de onde vieram os votos
(do município ao local de votação), quanto custou cada voto e como ele se compara à chapa do NOVO
e aos rivais da igreja (Fabio Oliveira 30300, Mara Lima 10456, Dirlete Pinheiro 22622).
Roda só neste Mac; não depende do sistema em produção.

## Abrir

Dois cliques em `analise-2026/analise.command`. Abre no Chrome em `http://localhost:4330`.

Teclas: `1`–`5` trocam de tela · `T` tema claro/escuro. O endereço guarda a tela e as escolhas
(ex.: `#comparador?b=10456&nivel=loc`), então dá para salvar nos favoritos.

| Tela | O que mostra |
|---|---|
| 1 Panorama | Quociente, cadeiras por partido, chapa do NOVO, posição do André |
| 2 Votos do André | Mapa por município (zoom mostra os locais de votação), regiões, concentração, top municípios/locais, bairros de Curitiba |
| 3 Custo do voto | Receita e despesa declaradas ao TSE por voto, origem do dinheiro |
| 4 Comparador | André × qualquer estadual do NOVO ou rival, por município ou local, lado a lado ou diferença |
| 5 Rivais da igreja | Quem lidera onde entre os quatro, sobreposição de bases, onde cada rival foi forte |

## Atualizar os dados

    node analise-2026/coletar/coletar.mjs            # usa o que já está em analise-2026/coletar/cache/
    node analise-2026/coletar/coletar.mjs --refazer  # baixa tudo de novo do TSE

A coleta só grava se a soma de cada candidato no arquivo de seções bater exatamente com o resultado
oficial. Se não bater, ela mostra quem divergiu e para.

A prestação de contas usada é parcial (arquivo do TSE de 04/10). Quando o TSE publicar a final
(novembro), rode com `--refazer`.

## Gasto interno (opcional)

`public/interno.json` (fora do git) acrescenta na tela 3 o gasto do André registrado no módulo financeiro:

    { "andre": { "gastoInterno": 90861, "fonte": "módulo financeiro", "data": "04/10/2026" } }

Sem esse arquivo a nota simplesmente não aparece.

## Desenvolvimento

    node --test analise-2026/test/*.teste.mjs
    analise-2026/verificar.sh                 # abre as 5 telas no Chrome headless e salva capturas

Fontes: TSE (dados abertos: votação por seção, locais de votação, prestação de contas; resultado oficial)
e IBGE (malha municipal). Spec: `docs/superpowers/specs/2026-10-05-analise-eleicao-2026-design.md`.
````

- [ ] **Step 2: Gasto interno local**

`analise-2026/public/interno.json`:
```json
{ "andre": { "gastoInterno": 90861, "fonte": "módulo financeiro", "data": "04/10/2026" } }
```
Run: `git status --short analise-2026/public/interno.json`
Expected: nenhuma saída (o arquivo está ignorado).

- [ ] **Step 3: Verificação completa**

Run:
```bash
node --test analise-2026/test/*.teste.mjs
analise-2026/verificar.sh
```
Expected: todos os testes PASS; cinco linhas `ok`.
Abrir `/tmp/analise-2026-telas/custo.png` e confirmar a nota "Gasto do André no módulo financeiro: R$ 90.861,00 (R$ 9,58 por voto)".
Tema claro (o `verificar.sh` só captura o escuro): abrir `analise-2026/analise.command`, apertar `T` em cada tela e conferir que mapa, barras e textos continuam legíveis.

- [ ] **Step 4: Commit**

```bash
git add analise-2026/README.md
git commit -m "docs(analise-2026): README de uso e atualização dos dados"
git push
```
