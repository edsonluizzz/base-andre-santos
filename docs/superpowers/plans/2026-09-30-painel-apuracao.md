# Painel de Apuração PR 2026 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mini-app local que exibe numa TV a apuração oficial do TSE no Paraná em 04/10/2026, com destaque para André Santos (Dep. Estadual, NOVO, 30777), atualizando sozinho a cada minuto com animações.

**Architecture:** Um servidor Node sem dependências (`apuracao/server.mjs`) baixa os JSON oficiais do TSE em ciclos, converte num estado enxuto com funções puras (`apuracao/lib/`), grava o histórico em disco e empurra o estado para uma página única via Server-Sent Events. A página (`apuracao/public/`, HTML/CSS/JS puro) anima a transição entre estados. Um simulador gera arquivos no formato do TSE para validar tudo antes de domingo.

**Tech Stack:** Node 24 (ESM `.mjs`, `fetch`, `node:test`, `node:http`), HTML/CSS/JavaScript puro, SVG. Nenhuma dependência npm.

**Spec:** `docs/superpowers/specs/2026-09-30-painel-apuracao-design.md`

## Global Constraints

- Tudo dentro de `apuracao/`. Nada em `apuracao/` importa de `src/`, e nada em `src/` importa de `apuracao/`.
- Zero dependências npm; sem build; sem CDN (a página só depende de internet para o TSE, via servidor local).
- Arquivos de código em `.mjs` (o `package.json` da raiz não declara `"type": "module"`).
- Testes se chamam `*.teste.mjs` (não `*.test.mjs`): o `npm test` da raiz roda Vitest, que capturaria `*.test.mjs`. Rodar com `node --test apuracao/test/*.teste.mjs`.
- Porta `4310`. Ciclo principal 60 s; ciclo de municípios 300 s; simulação 10 s e 20 s.
- Candidato em destaque: número `30777`, partido `NOVO`. Eleições TSE: `6259` (estadual) e `6257` (federal), ciclo `ele2026`.
- O navegador nunca chama o TSE (requisição com `Origin` recebe 403); só o servidor.
- Total do partido = `tvtn` (nominais) + `tvtl` (legenda).
- Textos da interface em português com acentuação correta; números no formato `pt-BR` (`38.412`, `63,40`).
- Dados do TSE entram no DOM só por `textContent`, nunca por `innerHTML`.
- Commit e push ao fim de cada tarefa (regra deste repositório), direto na `main`.

## Review Focus

1. **Primeiro ciclo com arquivo falhando** (sem leitura anterior daquele cargo): a seção correspondente fica "aguardando", o resto da tela funciona, nada quebra. → teste na Task 3.
2. **Antes das 17h de domingo, votos válidos = 0:** quociente 0, vagas 0, `faltamProxima` nulo, sem `NaN`/divisão por zero na tela. → testes nas Tasks 2 e 3.
3. **TSE devolve 200 com HTML ou 403 (bloqueio/WAF):** tratado como falha do arquivo, não como dado. → teste na Task 5.
4. **Servidor morto no meio de uma gravação** (última linha do `historico.jsonl` truncada): a linha ruim é ignorada e as próximas gravações não colam nela. → teste na Task 4.
5. **André fora do arquivo de Dep. Estadual** (candidatura retirada do arquivo, ou André fora dos 10 primeiros da chapa): `andre` nulo sem quebrar; e quando fora dos 10, continua visível na lista. → testes nas Tasks 3 e 7.

---

## File Structure

```
apuracao/
  server.mjs               HTTP, SSE, ciclos, arquivos estáticos, ponto de entrada
  lib/parse.mjs            JSON do TSE (um cargo) → bloco enxuto
  lib/quociente.mjs        quociente eleitoral e vagas diretas
  lib/estado.mjs           blocos → estado enviado à página
  lib/store.mjs            histórico em disco
  lib/tse.mjs              URLs e download
  lib/simulador.mjs        apuração fictícia no formato do TSE
  lib/municipios.mjs       fase 2: coleta por município
  public/index.html
  public/styles.css
  public/util.mjs          formatação e seleção de linhas (puro, testado)
  public/app.mjs           renderização e animações
  test/fx.mjs              carregador de fixtures
  test/fixtures/*.json     arquivos reais do TSE
  test/*.teste.mjs
  iniciar.command          sobe servidor + Chrome em tela cheia
  iniciar-simulacao.command
  README.md
  data/                    histórico (ignorado pelo git)
```

---

### Task 1: Fixtures e `parse.mjs`

**Files:**
- Create: `apuracao/test/fixtures/*.json`, `apuracao/test/fx.mjs`, `apuracao/lib/parse.mjs`
- Modify: `.gitignore`, `.vercelignore`
- Test: `apuracao/test/parse.teste.mjs`

**Interfaces:**
- Produces: `num(s): number`, `pct(s): number`, `parseCargo(json): Bloco` onde
  `Bloco = { tseGeradoEm: string, secoesPct: number, comparecimentoPct: number, validos: number, vagas: number, qeOficial: number, candidatos: Candidato[], partidos: Partido[] }`,
  `Candidato = { n: string, nome: string, partido: string, votos: number, pct: number, situacao: string, eleito: boolean }` (ordenado por votos desc, depois nome),
  `Partido = { sg: string, nominais: number, legenda: number, total: number }`.
- Produces (teste): `fx(nome): any` lê `apuracao/test/fixtures/<nome>`.

- [ ] **Step 1: Baixar as fixtures reais e ignorar pastas**

```bash
mkdir -p apuracao/test/fixtures apuracao/lib apuracao/public
B=https://resultados.tse.jus.br/oficial
F=apuracao/test/fixtures
curl -sf $B/ele2026/6259/dados/pr/pr-c0007-e006259-u.json -o $F/estadual.json
curl -sf $B/ele2026/6259/dados/pr/pr-c0006-e006259-u.json -o $F/federal.json
curl -sf $B/ele2026/6259/dados/pr/pr-c0005-e006259-u.json -o $F/senador.json
curl -sf $B/ele2026/6259/dados/pr/pr-c0003-e006259-u.json -o $F/governador.json
curl -sf $B/ele2026/6257/dados/br/br-c0001-e006257-u.json -o $F/presBr.json
curl -sf $B/ele2026/6257/dados/pr/pr-c0001-e006257-u.json -o $F/presPr.json
curl -sf $B/ele2026/6259/dados/pr/pr-e006259-ab.json -o $F/andamento.json
curl -sf $B/ele2026/6259/dados/pr/pr75353-c0007-e006259-u.json -o $F/mun-curitiba.json
curl -sf $B/ele2024/619/dados/pr/pr75353-c0011-e000619-u.json -o $F/curitiba-2024.json
curl -sf $B/ele2026/6259/config/mun-e006259-cm.json | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const d=JSON.parse(s);
d.abr=d.abr.filter(a=>a.cd.toLowerCase()==="pr");process.stdout.write(JSON.stringify(d))})' > $F/municipios-pr.json
ls -la $F
printf '\n# painel de apuração: histórico local\napuracao/data/\n' >> .gitignore
printf '\napuracao/\n' >> .vercelignore
```

Esperado: 10 arquivos, todos com tamanho > 0 (`estadual.json` ≈ 133 KB).

- [ ] **Step 2: Escrever o carregador de fixtures e o teste que falha**

`apuracao/test/fx.mjs`:
```js
import { readFileSync } from "node:fs";

export const fx = (nome) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${nome}`, import.meta.url), "utf8"));
```

`apuracao/test/parse.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { num, pct, parseCargo } from "../lib/parse.mjs";
import { fx } from "./fx.mjs";

test("num e pct convertem texto do TSE", () => {
  assert.equal(num("313347"), 313347);
  assert.equal(num(""), 0);
  assert.equal(num(undefined), 0);
  assert.equal(pct("33,51"), 33.51);
  assert.equal(pct("100,00"), 100);
  assert.equal(pct(undefined), 0);
});

test("Curitiba 2024: votos reais, ordenação e 2º turno não é eleito", () => {
  const b = parseCargo(fx("curitiba-2024.json"));
  assert.equal(b.candidatos.length, 10);
  assert.deepEqual(b.candidatos[0], {
    n: "55", nome: "EDUARDO PIMENTEL", partido: "PSD",
    votos: 313347, pct: 33.51, situacao: "2º turno", eleito: false,
  });
  assert.equal(b.candidatos[1].nome, "CRISTINA GRAEML");
  assert.equal(b.secoesPct, 100);
  assert.equal(b.comparecimentoPct, 72.26);
  assert.equal(b.validos, 935169);
  assert.equal(b.vagas, 1);
});

test("Dep. Estadual PR 2026: 592 candidatos, 54 vagas, André presente", () => {
  const b = parseCargo(fx("estadual.json"));
  assert.equal(b.candidatos.length, 592);
  assert.equal(b.vagas, 54);
  assert.equal(b.qeOficial, 0);
  assert.equal(b.candidatos.filter((c) => c.partido === "NOVO").length, 41);
  const andre = b.candidatos.find((c) => c.n === "30777");
  assert.equal(andre.nome, "ANDRÉ SANTOS");
  assert.equal(andre.votos, 0);
  assert.deepEqual(b.partidos.find((p) => p.sg === "NOVO"),
    { sg: "NOVO", nominais: 0, legenda: 0, total: 0 });
});

test("demais cargos de 2026 são lidos", () => {
  assert.equal(parseCargo(fx("federal.json")).vagas, 30);
  assert.equal(parseCargo(fx("federal.json")).candidatos.length, 404);
  assert.equal(parseCargo(fx("senador.json")).vagas, 2);
  assert.equal(parseCargo(fx("governador.json")).candidatos.length, 8);
  assert.equal(parseCargo(fx("presBr.json")).candidatos.length, 13);
  assert.equal(parseCargo(fx("presPr.json")).candidatos.length, 13);
});

test("arquivo sem cargo lança erro", () => {
  assert.throws(() => parseCargo({}), /sem cargo/);
  assert.throws(() => parseCargo({ carg: [] }), /sem cargo/);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test apuracao/test/*.teste.mjs`
Expected: FAIL com `Cannot find module ... lib/parse.mjs`

- [ ] **Step 4: Implementar `apuracao/lib/parse.mjs`**

```js
// Converte um arquivo de resultado do TSE (um cargo, uma abrangência) num bloco enxuto.
// No TSE todo número vem como texto e percentual usa vírgula.

export function num(s) {
  const n = Number(s ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function pct(s) {
  const n = Number(String(s ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function parseCargo(json) {
  const cargo = json?.carg?.[0];
  if (!cargo || !Array.isArray(cargo.agr)) throw new Error("arquivo do TSE sem cargo");

  const candidatos = [];
  const partidos = [];
  for (const agr of cargo.agr) {
    for (const par of agr.par ?? []) {
      const nominais = num(par.tvtn);
      const legenda = num(par.tvtl);
      partidos.push({ sg: par.sg, nominais, legenda, total: nominais + legenda });
      for (const c of par.cand ?? []) {
        const situacao = c.st ?? "";
        candidatos.push({
          n: c.n,
          nome: c.nmu,
          partido: par.sg,
          votos: num(c.vap),
          pct: pct(c.pvap),
          situacao,
          // "e":"s" também marca quem vai ao 2º turno; isso não é eleito.
          eleito: c.e === "s" && !/turno/i.test(situacao),
        });
      }
    }
  }
  candidatos.sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"));

  return {
    tseGeradoEm: `${json.dg ?? ""} ${json.hg ?? ""}`.trim(),
    secoesPct: pct(json.s?.pst),
    comparecimentoPct: pct(json.e?.pc),
    validos: num(json.v?.vv),
    vagas: num(cargo.nv),
    qeOficial: num(cargo.qe),
    candidatos,
    partidos,
  };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test apuracao/test/*.teste.mjs`
Expected: PASS, 5 testes.

- [ ] **Step 6: Commit**

```bash
git add apuracao .gitignore .vercelignore
git commit -m "feat(apuracao): leitura dos arquivos de resultado do TSE"
git push
```

---

### Task 2: `quociente.mjs`

**Files:**
- Create: `apuracao/lib/quociente.mjs`
- Test: `apuracao/test/quociente.teste.mjs`

**Interfaces:**
- Produces: `calcularQuociente({ validos, vagas, qeOficial }): { quociente: number, oficial: boolean }`
- Produces: `vagasPartido(total, quociente): { vagasDiretas: number, faltamProxima: number | null }`

- [ ] **Step 1: Escrever o teste que falha**

`apuracao/test/quociente.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { calcularQuociente, vagasPartido } from "../lib/quociente.mjs";

test("quociente = válidos ÷ vagas; fração até meio desce, acima de meio sobe", () => {
  assert.deepEqual(calcularQuociente({ validos: 5400, vagas: 54, qeOficial: 0 }), { quociente: 100, oficial: false });
  assert.equal(calcularQuociente({ validos: 5427, vagas: 54, qeOficial: 0 }).quociente, 100); // resto = meio exato
  assert.equal(calcularQuociente({ validos: 5428, vagas: 54, qeOficial: 0 }).quociente, 101);
});

test("usa o quociente oficial quando o TSE informa", () => {
  assert.deepEqual(calcularQuociente({ validos: 5400, vagas: 54, qeOficial: 112345 }), { quociente: 112345, oficial: true });
});

test("sem votos válidos o quociente é zero, sem NaN", () => {
  assert.deepEqual(calcularQuociente({ validos: 0, vagas: 54, qeOficial: 0 }), { quociente: 0, oficial: false });
  assert.deepEqual(calcularQuociente({ validos: 100, vagas: 0, qeOficial: 0 }), { quociente: 0, oficial: false });
  assert.deepEqual(vagasPartido(0, 0), { vagasDiretas: 0, faltamProxima: null });
});

test("vagas diretas e quanto falta para a próxima", () => {
  assert.deepEqual(vagasPartido(250, 100), { vagasDiretas: 2, faltamProxima: 50 });
  assert.deepEqual(vagasPartido(99, 100), { vagasDiretas: 0, faltamProxima: 1 });
  assert.deepEqual(vagasPartido(300, 100), { vagasDiretas: 3, faltamProxima: 100 });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test apuracao/test/quociente.teste.mjs`
Expected: FAIL com `Cannot find module`

- [ ] **Step 3: Implementar `apuracao/lib/quociente.mjs`**

```js
// Quociente eleitoral (Código Eleitoral, art. 106): válidos ÷ vagas, desprezada a
// fração igual ou inferior a meio, equivalente a um se superior.
// Durante a apuração o valor é parcial. Não calcula sobras.

export function calcularQuociente({ validos, vagas, qeOficial }) {
  if (qeOficial > 0) return { quociente: qeOficial, oficial: true };
  if (!(validos > 0) || !(vagas > 0)) return { quociente: 0, oficial: false };
  const inteiro = Math.floor(validos / vagas);
  const resto = validos % vagas;
  return { quociente: resto * 2 > vagas ? inteiro + 1 : inteiro, oficial: false };
}

export function vagasPartido(total, quociente) {
  if (!(quociente > 0)) return { vagasDiretas: 0, faltamProxima: null };
  const vagasDiretas = Math.floor(total / quociente);
  return { vagasDiretas, faltamProxima: (vagasDiretas + 1) * quociente - total };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test apuracao/test/quociente.teste.mjs`
Expected: PASS, 4 testes.

- [ ] **Step 5: Commit**

```bash
git add apuracao
git commit -m "feat(apuracao): quociente eleitoral e vagas diretas"
git push
```

---

### Task 3: `estado.mjs`

**Files:**
- Create: `apuracao/lib/estado.mjs`
- Test: `apuracao/test/estado.teste.mjs`

**Interfaces:**
- Consumes: `parseCargo` (Task 1), `calcularQuociente`, `vagasPartido` (Task 2).
- Produces: `ANDRE = "30777"`, `PARTIDO = "NOVO"`, `CHAVES = ["estadual","federal","senador","governador","presBr","presPr"]`.
- Produces: `mesclarBlocos(anteriores: Record<chave, Bloco|null> | null, novos: Record<chave, Bloco|null>): { blocos, falhas: string[] }`
- Produces: `montarEstado({ blocos, falhas, erros, anterior, agora, proximaBuscaEm, simulacao, municipios }): Estado`

```
Estado = {
  geradoEm: number, proximaBuscaEm: number, simulacao: boolean,
  fonte: { ok: boolean, ultimaLeituraOk: number|null, erro?: string },
  pr: { secoesPct, comparecimentoPct, tseGeradoEm } | null,
  andre: { n, nome, votos, delta, posChapa, posGeral, totalCandidatos, situacao, eleito, historico: [] } | null,
  estadual: Chapa | null, federal: Chapa | null,
  governador: Major | null, senador: Major | null,
  presidente: { br: Major | null, pr: Major | null },
  municipios: object | null,
}
Chapa = { vagas, validos, secoesPct, quociente, quocienteOficial,
          novo: { nominais, legenda, total, vagasDiretas, faltamProxima },
          candidatos: (Candidato & { pos: number })[] }      // só NOVO
Major = { vagas, secoesPct, candidatos: Candidato[] }       // todos
```
`andre.historico` sai como o do estado anterior (ou `[]`); quem preenche é o servidor (Task 6).

- [ ] **Step 1: Escrever o teste que falha**

`apuracao/test/estado.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { parseCargo } from "../lib/parse.mjs";
import { CHAVES, mesclarBlocos, montarEstado } from "../lib/estado.mjs";
import { fx } from "./fx.mjs";

const blocosReais = () => Object.fromEntries(CHAVES.map((k) => [k, parseCargo(fx(`${k}.json`))]));
const base = { agora: 1000, proximaBuscaEm: 61000 };

function comVotos(bloco, votosPorNumero) {
  const b = structuredClone(bloco);
  for (const c of b.candidatos) if (votosPorNumero[c.n] != null) c.votos = votosPorNumero[c.n];
  b.candidatos.sort((x, y) => y.votos - x.votos);
  return b;
}

test("estado com os arquivos zerados de 2026", () => {
  const e = montarEstado({ ...base, blocos: blocosReais(), falhas: [] });
  assert.equal(e.fonte.ok, true);
  assert.equal(e.fonte.ultimaLeituraOk, 1000);
  assert.equal(e.andre.nome, "ANDRÉ SANTOS");
  assert.equal(e.andre.votos, 0);
  assert.equal(e.andre.delta, 0);
  assert.equal(e.andre.posGeral, 1); // todos empatados em zero
  assert.equal(e.andre.totalCandidatos, 592);
  assert.equal(e.estadual.candidatos.length, 41);
  assert.equal(e.federal.candidatos.length, 31);
  assert.equal(e.estadual.quociente, 0);
  assert.deepEqual(e.estadual.novo, { nominais: 0, legenda: 0, total: 0, vagasDiretas: 0, faltamProxima: null });
  assert.equal(e.senador.vagas, 2);
  assert.equal(e.presidente.br.candidatos.length, 13);
  assert.equal(e.presidente.pr.candidatos.length, 13);
  assert.doesNotMatch(JSON.stringify(e), /NaN|Infinity/);
});

test("posição conta quem tem estritamente mais votos", () => {
  const blocos = blocosReais();
  const novo = blocos.estadual.candidatos.filter((c) => c.partido === "NOVO" && c.n !== "30777");
  const outro = blocos.estadual.candidatos.find((c) => c.partido !== "NOVO");
  blocos.estadual = comVotos(blocos.estadual, { 30777: 500, [novo[0].n]: 900, [outro.n]: 700 });
  const e = montarEstado({ ...base, blocos, falhas: [] });
  assert.equal(e.andre.posChapa, 2);
  assert.equal(e.andre.posGeral, 3);
  assert.equal(e.estadual.candidatos[0].pos, 1);
  assert.equal(e.estadual.candidatos[1].n, "30777");
});

test("delta guarda a última variação mesmo em ciclo sem mudança", () => {
  const blocos = blocosReais();
  const e1 = montarEstado({ ...base, blocos, falhas: [] });
  const b2 = { ...blocos, estadual: comVotos(blocos.estadual, { 30777: 150 }) };
  const e2 = montarEstado({ ...base, blocos: b2, falhas: [], anterior: e1 });
  assert.equal(e2.andre.delta, 150);
  const e3 = montarEstado({ ...base, blocos: b2, falhas: [], anterior: e2 });
  assert.equal(e3.andre.delta, 150);
});

test("primeiro ciclo com tudo falhando não quebra", () => {
  const vazio = Object.fromEntries(CHAVES.map((k) => [k, null]));
  const { blocos, falhas } = mesclarBlocos(null, vazio);
  assert.deepEqual(falhas, CHAVES);
  const e = montarEstado({ ...base, blocos, falhas, erros: ["TSE respondeu 403"] });
  assert.equal(e.fonte.ok, false);
  assert.equal(e.fonte.ultimaLeituraOk, null);
  assert.equal(e.fonte.erro, "TSE respondeu 403");
  assert.equal(e.andre, null);
  assert.equal(e.pr, null);
  assert.equal(e.estadual, null);
  assert.deepEqual(e.presidente, { br: null, pr: null });
});

test("falha de um arquivo preserva o bloco anterior e marca a fonte", () => {
  const anteriores = blocosReais();
  const e1 = montarEstado({ ...base, blocos: anteriores, falhas: [] });
  const novos = { ...blocosReais(), federal: null };
  const { blocos, falhas } = mesclarBlocos(anteriores, novos);
  assert.deepEqual(falhas, ["federal"]);
  assert.equal(blocos.federal, anteriores.federal);
  const e2 = montarEstado({ ...base, agora: 61000, blocos, falhas, anterior: e1 });
  assert.equal(e2.fonte.ok, false);
  assert.equal(e2.fonte.ultimaLeituraOk, 1000);
  assert.equal(e2.federal.candidatos.length, 31);
});

test("André ausente do arquivo: andre nulo, resto intacto", () => {
  const blocos = blocosReais();
  blocos.estadual = { ...blocos.estadual, candidatos: blocos.estadual.candidatos.filter((c) => c.n !== "30777") };
  const e = montarEstado({ ...base, blocos, falhas: [] });
  assert.equal(e.andre, null);
  assert.equal(e.estadual.candidatos.length, 40);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test apuracao/test/estado.teste.mjs`
Expected: FAIL com `Cannot find module`

- [ ] **Step 3: Implementar `apuracao/lib/estado.mjs`**

```js
import { calcularQuociente, vagasPartido } from "./quociente.mjs";

export const ANDRE = "30777";
export const PARTIDO = "NOVO";
export const CHAVES = ["estadual", "federal", "senador", "governador", "presBr", "presPr"];

// Bloco que falhou neste ciclo mantém o anterior (ou null se nunca foi lido).
export function mesclarBlocos(anteriores, novos) {
  const blocos = {};
  const falhas = [];
  for (const k of CHAVES) {
    if (novos[k]) blocos[k] = novos[k];
    else {
      blocos[k] = anteriores?.[k] ?? null;
      falhas.push(k);
    }
  }
  return { blocos, falhas };
}

const posicao = (lista, votos) => 1 + lista.filter((c) => c.votos > votos).length;

function chapa(bloco) {
  if (!bloco) return null;
  const { quociente, oficial } = calcularQuociente(bloco);
  const p = bloco.partidos.find((x) => x.sg === PARTIDO) ?? { nominais: 0, legenda: 0, total: 0 };
  const cands = bloco.candidatos.filter((c) => c.partido === PARTIDO);
  return {
    vagas: bloco.vagas,
    validos: bloco.validos,
    secoesPct: bloco.secoesPct,
    quociente,
    quocienteOficial: oficial,
    novo: { nominais: p.nominais, legenda: p.legenda, total: p.total, ...vagasPartido(p.total, quociente) },
    candidatos: cands.map((c) => ({ ...c, pos: posicao(cands, c.votos) })),
  };
}

const majoritario = (bloco) =>
  bloco ? { vagas: bloco.vagas, secoesPct: bloco.secoesPct, candidatos: bloco.candidatos } : null;

function andreDe(est, anterior) {
  const c = est?.candidatos.find((x) => x.n === ANDRE);
  if (!c) return null;
  const ant = anterior?.andre;
  const delta = !ant ? 0 : c.votos === ant.votos ? ant.delta : c.votos - ant.votos;
  return {
    n: c.n,
    nome: c.nome,
    votos: c.votos,
    delta,
    posChapa: posicao(est.candidatos.filter((x) => x.partido === PARTIDO), c.votos),
    posGeral: posicao(est.candidatos, c.votos),
    totalCandidatos: est.candidatos.length,
    situacao: c.situacao,
    eleito: c.eleito,
    historico: ant?.historico ?? [],
  };
}

export function montarEstado({
  blocos, falhas = [], erros = [], anterior = null,
  agora, proximaBuscaEm, simulacao = false, municipios = null,
}) {
  const est = blocos.estadual;
  const ok = falhas.length === 0;
  return {
    geradoEm: agora,
    proximaBuscaEm,
    simulacao,
    fonte: {
      ok,
      ultimaLeituraOk: ok ? agora : anterior?.fonte.ultimaLeituraOk ?? null,
      erro: ok ? undefined : erros[0] ?? `falha em: ${falhas.join(", ")}`,
    },
    pr: est
      ? { secoesPct: est.secoesPct, comparecimentoPct: est.comparecimentoPct, tseGeradoEm: est.tseGeradoEm }
      : null,
    andre: andreDe(est, anterior),
    estadual: chapa(est),
    federal: chapa(blocos.federal),
    governador: majoritario(blocos.governador),
    senador: majoritario(blocos.senador),
    presidente: { br: majoritario(blocos.presBr), pr: majoritario(blocos.presPr) },
    municipios,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test apuracao/test/*.teste.mjs`
Expected: PASS em todos.

- [ ] **Step 5: Commit**

```bash
git add apuracao
git commit -m "feat(apuracao): montagem do estado do painel"
git push
```

---

### Task 4: `store.mjs`

**Files:**
- Create: `apuracao/lib/store.mjs`
- Test: `apuracao/test/store.teste.mjs`

**Interfaces:**
- Produces: `criarStore(dir: string): { historico(): Ponto[], registrar(ponto: Ponto): boolean, salvarEstado(estado): void }`, com `Ponto = { t: number, votos: number, secoesPct: number }`.
  `registrar` só grava se votos ou secoesPct mudaram em relação ao último ponto. `salvarEstado` regrava `ultimo.json` e acrescenta uma linha em `estados.jsonl`.

- [ ] **Step 1: Escrever o teste que falha**

`apuracao/test/store.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarStore } from "../lib/store.mjs";

const novaPasta = () => mkdtempSync(join(tmpdir(), "apuracao-"));

test("registra só quando muda e relê depois de reiniciar", () => {
  const dir = novaPasta();
  const s = criarStore(dir);
  assert.equal(s.registrar({ t: 1, votos: 0, secoesPct: 0 }), true);
  assert.equal(s.registrar({ t: 2, votos: 0, secoesPct: 0 }), false);
  assert.equal(s.registrar({ t: 3, votos: 120, secoesPct: 1.5 }), true);
  assert.equal(s.historico().length, 2);

  const s2 = criarStore(dir);
  assert.deepEqual(s2.historico(), [
    { t: 1, votos: 0, secoesPct: 0 },
    { t: 3, votos: 120, secoesPct: 1.5 },
  ]);
});

test("linha truncada por queda é ignorada e não contamina a próxima gravação", () => {
  const dir = novaPasta();
  writeFileSync(join(dir, "historico.jsonl"), '{"t":1,"votos":10,"secoesPct":1}\n{"t":2,"vot');
  const s = criarStore(dir);
  assert.deepEqual(s.historico(), [{ t: 1, votos: 10, secoesPct: 1 }]);
  s.registrar({ t: 3, votos: 30, secoesPct: 2 });
  assert.deepEqual(criarStore(dir).historico(), [
    { t: 1, votos: 10, secoesPct: 1 },
    { t: 3, votos: 30, secoesPct: 2 },
  ]);
});

test("salvarEstado grava o último e acumula", () => {
  const dir = novaPasta();
  const s = criarStore(dir);
  s.salvarEstado({ geradoEm: 1 });
  s.salvarEstado({ geradoEm: 2 });
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "ultimo.json"), "utf8")), { geradoEm: 2 });
  assert.equal(readFileSync(join(dir, "estados.jsonl"), "utf8").trim().split("\n").length, 2);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test apuracao/test/store.teste.mjs`
Expected: FAIL com `Cannot find module`

- [ ] **Step 3: Implementar `apuracao/lib/store.mjs`**

```js
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function criarStore(dir) {
  mkdirSync(dir, { recursive: true });
  const arqHistorico = join(dir, "historico.jsonl");
  const pontos = [];

  if (existsSync(arqHistorico)) {
    const texto = readFileSync(arqHistorico, "utf8");
    for (const linha of texto.split("\n")) {
      if (!linha.trim()) continue;
      try {
        const p = JSON.parse(linha);
        if (typeof p.votos === "number") pontos.push(p);
      } catch {
        // linha truncada por queda no meio da gravação
      }
    }
    // Garante que a próxima gravação comece em linha nova.
    if (texto && !texto.endsWith("\n")) appendFileSync(arqHistorico, "\n");
  }

  return {
    historico: () => pontos.slice(),
    registrar(ponto) {
      const u = pontos.at(-1);
      if (u && u.votos === ponto.votos && u.secoesPct === ponto.secoesPct) return false;
      pontos.push(ponto);
      appendFileSync(arqHistorico, JSON.stringify(ponto) + "\n");
      return true;
    },
    salvarEstado(estado) {
      const json = JSON.stringify(estado);
      writeFileSync(join(dir, "ultimo.json"), json);
      appendFileSync(join(dir, "estados.jsonl"), json + "\n");
    },
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test apuracao/test/store.teste.mjs`
Expected: PASS, 3 testes.

- [ ] **Step 5: Commit**

```bash
git add apuracao
git commit -m "feat(apuracao): histórico da apuração em disco"
git push
```

---

### Task 5: `tse.mjs` e `simulador.mjs`

**Files:**
- Create: `apuracao/lib/tse.mjs`, `apuracao/lib/simulador.mjs`
- Test: `apuracao/test/tse.teste.mjs`, `apuracao/test/simulador.teste.mjs`

**Interfaces:**
- Consumes: `CHAVES` (Task 3), `parseCargo` (Task 1, só nos testes).
- Produces (`tse.mjs`): `URLS: Record<chave, string>`, `URL_MUNICIPIOS`, `URL_ANDAMENTO`, `urlMunicipio(cd): string`,
  `baixarJson(url, { timeoutMs = 15000, fetchImpl = fetch }): Promise<any>` (lança em status ≠ 2xx ou corpo não-JSON),
  `baixarPrincipais(opts?): Promise<{ brutos: Record<chave, any|null>, erros: string[] }>`.
- Produces (`simulador.mjs`): `criarSimulador(bases: Record<chave, jsonTSE>, { passos = 30, seed = 2026 }): { proximo(): Record<chave, jsonTSE>, terminou: boolean, municipios(lista: {cd,nome}[], agora: number): ResultadoMunicipios }`.
  `ResultadoMunicipios = { atualizadoEm, comVotos, total, falhas, lista: [{ cd, nome, votos, validos, pctValidos, secoesPct }] }` (mesma forma que a Task 8 produz).

- [ ] **Step 1: Escrever os testes que falham**

`apuracao/test/tse.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { URLS, urlMunicipio, baixarJson, baixarPrincipais } from "../lib/tse.mjs";

const resposta = (status, corpo) => async () => ({ ok: status >= 200 && status < 300, status, text: async () => corpo });

test("URLs oficiais de 2026", () => {
  assert.equal(URLS.estadual, "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/pr/pr-c0007-e006259-u.json");
  assert.equal(URLS.presBr, "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json");
  assert.equal(urlMunicipio("75353"), "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/pr/pr75353-c0007-e006259-u.json");
});

test("baixarJson devolve o JSON", async () => {
  assert.deepEqual(await baixarJson("u", { fetchImpl: resposta(200, '{"a":1}') }), { a: 1 });
});

test("403 é falha", async () => {
  await assert.rejects(baixarJson("u", { fetchImpl: resposta(403, "Forbidden") }), /403/);
});

test("200 com HTML (bloqueio) é falha", async () => {
  await assert.rejects(baixarJson("u", { fetchImpl: resposta(200, "<html>bloqueado</html>") }), /não é JSON/);
});

test("baixarPrincipais isola a falha de um arquivo", async () => {
  const fetchImpl = async (url) =>
    url === URLS.federal
      ? { ok: false, status: 500, text: async () => "" }
      : { ok: true, status: 200, text: async () => "{}" };
  const { brutos, erros } = await baixarPrincipais({ fetchImpl });
  assert.equal(brutos.federal, null);
  assert.deepEqual(brutos.estadual, {});
  assert.equal(erros.length, 1);
  assert.match(erros[0], /500/);
});
```

`apuracao/test/simulador.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { criarSimulador } from "../lib/simulador.mjs";
import { parseCargo } from "../lib/parse.mjs";
import { CHAVES } from "../lib/estado.mjs";
import { fx } from "./fx.mjs";

const bases = () => Object.fromEntries(CHAVES.map((k) => [k, fx(`${k}.json`)]));

test("votos só crescem e termina em 100% das seções", () => {
  const sim = criarSimulador(bases(), { passos: 10 });
  let anterior = -1;
  let ultimo;
  for (let i = 0; i < 12; i++) {
    ultimo = sim.proximo();
    const est = parseCargo(ultimo.estadual);
    const andre = est.candidatos.find((c) => c.n === "30777").votos;
    assert.ok(andre >= anterior, `passo ${i}: ${andre} < ${anterior}`);
    anterior = andre;
  }
  assert.equal(sim.terminou, true);
  const est = parseCargo(ultimo.estadual);
  assert.equal(est.secoesPct, 100);
  assert.ok(anterior > 0);
  assert.ok(est.validos > 0);
  const novo = est.partidos.find((p) => p.sg === "NOVO");
  assert.ok(novo.legenda > 0);
  for (const k of CHAVES) assert.ok(parseCargo(ultimo[k]).candidatos[0].votos > 0, k);
});

test("mesma semente gera a mesma apuração", () => {
  const a = criarSimulador(bases(), { passos: 5 }).proximo();
  const b = criarSimulador(bases(), { passos: 5 }).proximo();
  assert.deepEqual(parseCargo(a.federal).candidatos, parseCargo(b.federal).candidatos);
});

test("municípios simulados somam os votos do André e ordenam por votos", () => {
  const sim = criarSimulador(bases(), { passos: 4 });
  sim.proximo();
  sim.proximo();
  const lista = [{ cd: "1", nome: "A" }, { cd: "2", nome: "B" }, { cd: "3", nome: "C" }];
  const m = sim.municipios(lista, 99);
  assert.equal(m.atualizadoEm, 99);
  assert.equal(m.total, 3);
  assert.equal(m.lista.length, 3);
  assert.ok(m.lista[0].votos >= m.lista[1].votos);
  assert.equal(m.lista[0].secoesPct, 50);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test apuracao/test/tse.teste.mjs apuracao/test/simulador.teste.mjs`
Expected: FAIL com `Cannot find module`

- [ ] **Step 3: Implementar `apuracao/lib/tse.mjs`**

```js
export const BASE = "https://resultados.tse.jus.br/oficial/ele2026";

const cargoPr = (ele, cargo) => `${BASE}/${ele}/dados/pr/pr-c${cargo}-e00${ele}-u.json`;

export const URLS = {
  estadual: cargoPr("6259", "0007"),
  federal: cargoPr("6259", "0006"),
  senador: cargoPr("6259", "0005"),
  governador: cargoPr("6259", "0003"),
  presBr: `${BASE}/6257/dados/br/br-c0001-e006257-u.json`,
  presPr: cargoPr("6257", "0001"),
};

export const URL_MUNICIPIOS = `${BASE}/6259/config/mun-e006259-cm.json`;
export const URL_ANDAMENTO = `${BASE}/6259/dados/pr/pr-e006259-ab.json`;
export const urlMunicipio = (cd) => `${BASE}/6259/dados/pr/pr${cd}-c0007-e006259-u.json`;

export async function baixarJson(url, { timeoutMs = 15000, fetchImpl = fetch } = {}) {
  const r = await fetchImpl(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: "application/json" },
  });
  if (!r.ok) throw new Error(`TSE respondeu ${r.status} em ${url}`);
  const texto = await r.text();
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`TSE devolveu conteúdo que não é JSON em ${url}`);
  }
}

export async function baixarPrincipais(opts) {
  const chaves = Object.keys(URLS);
  const resultados = await Promise.allSettled(chaves.map((k) => baixarJson(URLS[k], opts)));
  const brutos = {};
  const erros = [];
  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") brutos[chaves[i]] = r.value;
    else {
      brutos[chaves[i]] = null;
      erros.push(String(r.reason?.message ?? r.reason));
    }
  });
  return { brutos, erros };
}
```

- [ ] **Step 4: Implementar `apuracao/lib/simulador.mjs`**

```js
// Gera uma apuração fictícia no MESMO formato dos arquivos do TSE, para que a
// simulação passe pelo mesmo caminho de leitura do dado real.

const PROPORCIONAIS = new Set(["estadual", "federal"]);
const TOTAL_VOTOS = {
  estadual: 6_000_000, federal: 6_000_000, senador: 11_000_000,
  governador: 6_200_000, presBr: 118_000_000, presPr: 6_300_000,
};
const ALVO_ANDRE = 38_000;

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fmtPct = (x) => x.toFixed(2).replace(".", ",");
const candidatosDe = (json) => json.carg[0].agr.flatMap((a) => a.par.flatMap((p) => p.cand));

function aplicar(base, alvo, p, proporcional) {
  const json = structuredClone(base);
  let validos = 0;
  const todos = [];
  for (const agr of json.carg[0].agr) {
    for (const par of agr.par) {
      let nominais = 0;
      for (const c of par.cand) {
        const v = Math.round((alvo.get(c.n) ?? 0) * p);
        c.vap = String(v);
        nominais += v;
        todos.push(c);
      }
      const legenda = proporcional ? Math.round(nominais * 0.04) : 0;
      par.tvtn = String(nominais);
      par.tvtl = String(legenda);
      validos += nominais + legenda;
    }
  }
  for (const c of todos) c.pvap = fmtPct(validos ? (100 * Number(c.vap)) / validos : 0);
  json.s = { ...json.s, pst: fmtPct(100 * p) };
  json.e = { ...json.e, pc: fmtPct(78 * p) };
  json.v = { ...json.v, vv: String(validos) };
  json.hg = new Date().toTimeString().slice(0, 8);
  return json;
}

export function criarSimulador(bases, { passos = 30, seed = 2026 } = {}) {
  const rand = prng(seed);
  const alvos = {};
  for (const [k, json] of Object.entries(bases)) {
    const cands = candidatosDe(json);
    const pesos = cands.map(() => Math.pow(rand(), 4) + 0.002);
    const soma = pesos.reduce((a, b) => a + b, 0);
    alvos[k] = new Map(cands.map((c, i) => [c.n, Math.round((TOTAL_VOTOS[k] * 0.9 * pesos[i]) / soma)]));
  }
  alvos.estadual?.set("30777", ALVO_ANDRE);
  const pesosMun = Array.from({ length: 500 }, () => Math.pow(rand(), 3) + 0.001);
  let passo = 0;

  return {
    get terminou() {
      return passo >= passos;
    },
    proximo() {
      passo = Math.min(passos, passo + 1);
      const p = passo / passos;
      return Object.fromEntries(
        Object.entries(bases).map(([k, base]) => [k, aplicar(base, alvos[k], p, PROPORCIONAIS.has(k))]),
      );
    },
    municipios(lista, agora) {
      const p = passo / passos;
      const votosAndre = ALVO_ANDRE * p;
      const soma = lista.reduce((a, _, i) => a + pesosMun[i % pesosMun.length], 0);
      const saida = lista.map((m, i) => {
        const votos = Math.round((votosAndre * pesosMun[i % pesosMun.length]) / soma);
        const validos = votos * 25 + Math.round(1000 * p);
        return {
          cd: m.cd, nome: m.nome, votos, validos,
          pctValidos: validos ? (100 * votos) / validos : 0,
          secoesPct: 100 * p,
        };
      });
      saida.sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"));
      return {
        atualizadoEm: agora,
        comVotos: saida.filter((m) => m.votos > 0).length,
        total: saida.length,
        falhas: 0,
        lista: saida,
      };
    },
  };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test apuracao/test/*.teste.mjs`
Expected: PASS em todos.

- [ ] **Step 6: Conferir o download real**

Run: `node -e 'import("./apuracao/lib/tse.mjs").then(async m=>{const r=await m.baixarPrincipais();console.log(Object.entries(r.brutos).map(([k,v])=>k+":"+(v?"ok":"FALHOU")).join(" "),r.erros)})'`
Expected: `estadual:ok federal:ok senador:ok governador:ok presBr:ok presPr:ok []`

- [ ] **Step 7: Commit**

```bash
git add apuracao
git commit -m "feat(apuracao): download do TSE e simulador de apuração"
git push
```

---

### Task 6: `server.mjs`

**Files:**
- Create: `apuracao/server.mjs`, `apuracao/public/index.html` (provisório, substituído na Task 7)
- Test: `apuracao/test/server.teste.mjs`

**Interfaces:**
- Consumes: `parseCargo`; `CHAVES`, `mesclarBlocos`, `montarEstado`; `criarStore`; `baixarPrincipais`, `baixarJson`, `URL_MUNICIPIOS`; `criarSimulador`.
- Produces: `criarServidor({ obterBrutos, obterMunicipios = null, store, intervaloMs = 60000, intervaloMunMs = 300000, simulacao = false, relogio = Date.now, resumir = (m) => m }): { server: http.Server, ciclo(): Promise<Estado>, cicloMunicipios(): Promise<void>, iniciar(): void, parar(): void, estado(): Estado|null }`
  - `obterBrutos(): Promise<{ brutos, erros }>`
  - `obterMunicipios(anterior): Promise<ResultadoMunicipios>`; `resumir(resultado)` reduz o que vai para o estado (a Task 8 passa `resumirMunicipios`).
- Rotas: `GET /api/state` (JSON do estado; 503 `{"erro":"aguardando primeira leitura"}` antes do primeiro ciclo), `GET /events` (SSE; envia o estado atual ao conectar e a cada ciclo), demais caminhos servem `apuracao/public/`.

- [ ] **Step 1: Escrever o teste que falha**

`apuracao/test/server.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarServidor } from "../server.mjs";
import { criarStore } from "../lib/store.mjs";
import { CHAVES } from "../lib/estado.mjs";
import { fx } from "./fx.mjs";

const brutosReais = () => Object.fromEntries(CHAVES.map((k) => [k, fx(`${k}.json`)]));

async function subir(opcoes) {
  const store = criarStore(mkdtempSync(join(tmpdir(), "apuracao-srv-")));
  const app = criarServidor({ store, ...opcoes });
  await new Promise((ok) => app.server.listen(0, "127.0.0.1", ok));
  const url = `http://127.0.0.1:${app.server.address().port}`;
  return { app, url, store };
}

test("antes do primeiro ciclo /api/state responde 503", async () => {
  const { app, url } = await subir({ obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }) });
  const r = await fetch(`${url}/api/state`);
  assert.equal(r.status, 503);
  app.parar();
});

test("ciclo monta o estado, grava histórico e serve em /api/state", async () => {
  const { app, url, store } = await subir({
    obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }),
    relogio: () => 5000, intervaloMs: 60000,
  });
  await app.ciclo();
  const e = await (await fetch(`${url}/api/state`)).json();
  assert.equal(e.geradoEm, 5000);
  assert.equal(e.proximaBuscaEm, 65000);
  assert.equal(e.andre.nome, "ANDRÉ SANTOS");
  assert.equal(e.estadual.candidatos.length, 41);
  assert.deepEqual(e.andre.historico, [{ t: 5000, votos: 0, secoesPct: 0 }]);
  assert.equal(store.historico().length, 1);
  app.parar();
});

test("ciclo seguinte com falha total preserva os números e marca a fonte", async () => {
  let falhar = false;
  const { app } = await subir({
    obterBrutos: async () => {
      if (falhar) throw new Error("sem internet");
      return { brutos: brutosReais(), erros: [] };
    },
  });
  await app.ciclo();
  falhar = true;
  const e = await app.ciclo();
  assert.equal(e.fonte.ok, false);
  assert.equal(e.fonte.erro, "sem internet");
  assert.equal(e.estadual.candidatos.length, 41);
  app.parar();
});

test("JSON com formato inesperado conta como falha daquele cargo", async () => {
  const { app } = await subir({
    obterBrutos: async () => ({ brutos: { ...brutosReais(), senador: { foo: 1 } }, erros: [] }),
  });
  const e = await app.ciclo();
  assert.equal(e.fonte.ok, false);
  assert.equal(e.senador, null);
  assert.equal(e.governador.candidatos.length, 8);
  app.parar();
});

test("SSE entrega o estado atual ao conectar", async () => {
  const { app, url } = await subir({ obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }) });
  await app.ciclo();
  const r = await fetch(`${url}/events`);
  assert.match(r.headers.get("content-type"), /text\/event-stream/);
  const { value } = await r.body.getReader().read();
  const texto = new TextDecoder().decode(value);
  assert.match(texto, /^data: \{/);
  assert.equal(JSON.parse(texto.slice(6).split("\n\n")[0]).andre.n, "30777");
  app.parar();
});

test("estáticos: serve index e bloqueia saída da pasta public", async () => {
  const { app, url } = await subir({ obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }) });
  const idx = await fetch(`${url}/`);
  assert.equal(idx.status, 200);
  assert.match(idx.headers.get("content-type"), /text\/html/);
  assert.equal((await fetch(`${url}/..%2Fserver.mjs`)).status, 404);
  assert.equal((await fetch(`${url}/nao-existe.css`)).status, 404);
  app.parar();
});

test("ciclo de municípios entra no estado já resumido", async () => {
  const { app } = await subir({
    obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }),
    obterMunicipios: async () => ({ atualizadoEm: 1, comVotos: 1, total: 2, falhas: 0, lista: [{ cd: "1" }, { cd: "2" }] }),
    resumir: (m) => ({ ...m, lista: m.lista.slice(0, 1) }),
  });
  await app.ciclo();
  await app.cicloMunicipios();
  assert.equal(app.estado().municipios.lista.length, 1);
  const e = await app.ciclo();
  assert.equal(e.municipios.total, 2);
  app.parar();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test apuracao/test/server.teste.mjs`
Expected: FAIL com `Cannot find module ... server.mjs`

- [ ] **Step 3: Criar a página provisória `apuracao/public/index.html`**

```html
<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Apuração Paraná 2026</title></head>
<body><pre id="saida">aguardando…</pre>
<script>
  new EventSource("/events").onmessage = (ev) => {
    document.getElementById("saida").textContent = JSON.stringify(JSON.parse(ev.data), null, 1);
  };
</script>
</body>
</html>
```

- [ ] **Step 4: Implementar `apuracao/server.mjs`**

```js
import http from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync, rmSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCargo } from "./lib/parse.mjs";
import { CHAVES, mesclarBlocos, montarEstado } from "./lib/estado.mjs";
import { criarStore } from "./lib/store.mjs";
import { baixarPrincipais } from "./lib/tse.mjs";
import { criarSimulador } from "./lib/simulador.mjs";

const RAIZ = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(RAIZ, "public");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

export function criarServidor({
  obterBrutos, obterMunicipios = null, store,
  intervaloMs = 60000, intervaloMunMs = 300000,
  simulacao = false, relogio = Date.now, resumir = (m) => m,
}) {
  let blocos = null;
  let estado = null;
  let municipiosCompleto = null;
  let municipios = null;
  let rodando = false;
  const clientes = new Set();
  const timers = [];

  function publicar() {
    const dados = `data: ${JSON.stringify(estado)}\n\n`;
    for (const c of clientes) c.write(dados);
  }

  async function ciclo() {
    if (rodando) return estado;
    rodando = true;
    try {
      const agora = relogio();
      let brutos = {};
      let erros = [];
      try {
        ({ brutos, erros } = await obterBrutos());
      } catch (e) {
        erros = [String(e?.message ?? e)];
      }
      const novos = {};
      for (const k of CHAVES) {
        try {
          novos[k] = brutos[k] ? parseCargo(brutos[k]) : null;
        } catch (e) {
          novos[k] = null;
          erros.push(`${k}: ${e.message}`);
        }
      }
      const m = mesclarBlocos(blocos, novos);
      blocos = m.blocos;
      estado = montarEstado({
        blocos, falhas: m.falhas, erros, anterior: estado,
        agora, proximaBuscaEm: agora + intervaloMs, simulacao, municipios,
      });
      if (estado.andre && estado.pr) {
        store.registrar({ t: agora, votos: estado.andre.votos, secoesPct: estado.pr.secoesPct });
        estado.andre.historico = store.historico();
      }
      store.salvarEstado(estado);
      publicar();
      return estado;
    } finally {
      rodando = false;
    }
  }

  async function cicloMunicipios() {
    if (!obterMunicipios) return;
    try {
      municipiosCompleto = await obterMunicipios(municipiosCompleto);
      municipios = resumir(municipiosCompleto);
      if (estado) {
        estado = { ...estado, municipios };
        publicar();
      }
    } catch (e) {
      console.error("[municípios]", e?.message ?? e);
    }
  }

  async function estatico(req, res) {
    const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const arquivo = resolve(PUBLICO, "." + (caminho === "/" ? "/index.html" : caminho));
    if (arquivo !== PUBLICO && !arquivo.startsWith(PUBLICO + sep)) {
      res.writeHead(404).end();
      return;
    }
    try {
      const corpo = await readFile(arquivo);
      res.writeHead(200, {
        "content-type": MIME[extname(arquivo)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(corpo);
    } catch {
      res.writeHead(404).end();
    }
  }

  const server = http.createServer((req, res) => {
    const caminho = new URL(req.url, "http://x").pathname;
    if (caminho === "/api/state") {
      res.writeHead(estado ? 200 : 503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify(estado ?? { erro: "aguardando primeira leitura" }));
      return;
    }
    if (caminho === "/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      if (estado) res.write(`data: ${JSON.stringify(estado)}\n\n`);
      else res.write(": aguardando\n\n");
      clientes.add(res);
      req.on("close", () => clientes.delete(res));
      return;
    }
    estatico(req, res).catch(() => res.writeHead(500).end());
  });

  return {
    server,
    ciclo,
    cicloMunicipios,
    estado: () => estado,
    iniciar() {
      ciclo().then(() => cicloMunicipios());
      timers.push(setInterval(ciclo, intervaloMs));
      if (obterMunicipios) timers.push(setInterval(cicloMunicipios, intervaloMunMs));
      // Mantém a conexão SSE viva em proxies e no próprio Chrome.
      timers.push(setInterval(() => { for (const c of clientes) c.write(": ping\n\n"); }, 20000));
    },
    parar() {
      for (const t of timers) clearInterval(t);
      for (const c of clientes) c.end();
      server.close();
      server.closeAllConnections?.();
    },
  };
}

function principal() {
  const simular = process.argv.includes("--simular");
  const porta = Number(process.env.PORTA ?? 4310);
  const fixture = (nome) => JSON.parse(readFileSync(join(RAIZ, "test", "fixtures", nome), "utf8"));
  let opcoes;

  if (simular) {
    const dir = join(RAIZ, "data", "sim");
    rmSync(dir, { recursive: true, force: true });
    const sim = criarSimulador(Object.fromEntries(CHAVES.map((k) => [k, fixture(`${k}.json`)])));
    opcoes = {
      store: criarStore(dir),
      simulacao: true,
      intervaloMs: 10000,
      intervaloMunMs: 20000,
      obterBrutos: async () => ({ brutos: sim.proximo(), erros: [] }),
    };
  } else {
    opcoes = {
      store: criarStore(join(RAIZ, "data", "real")),
      obterBrutos: () => baixarPrincipais(),
    };
  }

  const app = criarServidor(opcoes);
  app.server.listen(porta, "127.0.0.1", () => {
    console.log(`Painel de apuração em http://localhost:${porta}${simular ? "  (SIMULAÇÃO)" : ""}`);
    app.iniciar();
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test apuracao/test/*.teste.mjs`
Expected: PASS em todos (os processos de teste encerram sozinhos; se algum ficar pendurado, falta `app.parar()`).

- [ ] **Step 6: Verificar de ponta a ponta com o TSE real**

Run: `node apuracao/server.mjs & sleep 4; curl -s localhost:4310/api/state | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const e=JSON.parse(s);console.log(e.fonte,e.andre.nome,e.andre.votos,e.estadual.candidatos.length,e.pr)})'; kill %1`
Expected: `{ ok: true, ultimaLeituraOk: <número> } ANDRÉ SANTOS 0 41 { secoesPct: 0, ... }`

- [ ] **Step 7: Commit**

```bash
git add apuracao
git commit -m "feat(apuracao): servidor local com ciclo de busca e SSE"
git push
```

---

### Task 7: Tela principal com animações

**Files:**
- Create: `apuracao/public/util.mjs`, `apuracao/public/styles.css`, `apuracao/public/app.mjs`
- Modify: `apuracao/public/index.html` (substitui a provisória)
- Test: `apuracao/test/util.teste.mjs`

**Interfaces:**
- Consumes: `Estado` (Task 3) via `EventSource("/events")`.
- Produces (`util.mjs`): `fmtInt(n): string`, `fmtPct(n, casas = 2): string`, `fmtHora(ms): string`, `fmtDelta(d): string`, `selecionarChapa(candidatos, limite, fixo): Candidato[]`, `pontosSparkline(historico, largura, altura): string`.
- Produces (`app.mjs`, usado pela Task 8): função `renderLista(ul, itens, montar)` e `montarLinha(li, dados)` no mesmo arquivo; elemento `#tela-2` já existe no HTML, vazio de lógica.

- [ ] **Step 1: Escrever o teste que falha**

`apuracao/test/util.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { fmtInt, fmtPct, fmtDelta, selecionarChapa, pontosSparkline } from "../public/util.mjs";

test("formatação pt-BR", () => {
  assert.equal(fmtInt(38412), "38.412");
  assert.equal(fmtInt(0), "0");
  assert.equal(fmtInt(undefined), "0");
  assert.equal(fmtPct(63.4), "63,40");
  assert.equal(fmtPct(null), "0,00");
  assert.equal(fmtDelta(1207), "▲ +1.207");
  assert.equal(fmtDelta(0), "");
  assert.equal(fmtDelta(-5), "▼ -5");
});

const cands = Array.from({ length: 20 }, (_, i) => ({ n: String(i + 1), votos: 100 - i }));

test("selecionarChapa: topo simples quando o fixo já está dentro", () => {
  assert.deepEqual(selecionarChapa(cands, 10, "3").map((c) => c.n), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
});

test("selecionarChapa: fixo fora do topo entra na última linha", () => {
  const r = selecionarChapa(cands, 10, "17").map((c) => c.n);
  assert.equal(r.length, 10);
  assert.deepEqual(r.slice(0, 9), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  assert.equal(r[9], "17");
});

test("selecionarChapa: sem fixo ou fixo inexistente devolve o topo", () => {
  assert.equal(selecionarChapa(cands, 8, null).length, 8);
  assert.equal(selecionarChapa(cands, 8, "999").at(-1).n, "8");
  assert.deepEqual(selecionarChapa([], 8, "1"), []);
});

test("pontosSparkline", () => {
  assert.equal(pontosSparkline([], 100, 40), "");
  assert.equal(pontosSparkline([{ t: 0, votos: 5 }], 100, 40), "");
  assert.equal(
    pontosSparkline([{ t: 0, votos: 0 }, { t: 10, votos: 50 }, { t: 20, votos: 100 }], 100, 40),
    "0.0,40.0 50.0,20.0 100.0,0.0",
  );
  assert.equal(pontosSparkline([{ t: 0, votos: 0 }, { t: 0, votos: 0 }], 100, 40), "0.0,40.0 0.0,40.0");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test apuracao/test/util.teste.mjs`
Expected: FAIL com `Cannot find module`

- [ ] **Step 3: Implementar `apuracao/public/util.mjs`**

```js
const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export const fmtInt = (n) => inteiro.format(Math.round(n ?? 0));

export const fmtPct = (n, casas = 2) =>
  (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const fmtHora = (ms) => (ms ? new Date(ms).toLocaleTimeString("pt-BR") : "--:--:--");

export const fmtDelta = (d) => (d > 0 ? `▲ +${fmtInt(d)}` : d < 0 ? `▼ ${fmtInt(d)}` : "");

// Primeiras `limite` linhas; se o candidato fixo ficou de fora, ocupa a última.
export function selecionarChapa(candidatos, limite, fixo) {
  const topo = candidatos.slice(0, limite);
  if (!fixo || topo.some((c) => c.n === fixo)) return topo;
  const alvo = candidatos.find((c) => c.n === fixo);
  return alvo ? [...topo.slice(0, limite - 1), alvo] : topo;
}

export function pontosSparkline(historico, largura, altura) {
  if (historico.length < 2) return "";
  const t0 = historico[0].t;
  const dt = Math.max(1, historico.at(-1).t - t0);
  const max = Math.max(1, ...historico.map((p) => p.votos));
  return historico
    .map((p) => `${(((p.t - t0) / dt) * largura).toFixed(1)},${(altura - (p.votos / max) * altura).toFixed(1)}`)
    .join(" ");
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test apuracao/test/util.teste.mjs`
Expected: PASS, 5 testes.

- [ ] **Step 5: Substituir `apuracao/public/index.html`**

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Apuração Paraná 2026</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
<div id="palco">
  <header>
    <h1>APURAÇÃO <b>PARANÁ 2026</b></h1>
    <div class="secoes">
      <div class="trilho"><div id="secoes-barra"></div></div>
      <span><b id="secoes-pct">0,00</b>% das seções totalizadas</span>
    </div>
    <div class="relogio">
      <svg id="anel" viewBox="0 0 44 44">
        <circle class="fundo" cx="22" cy="22" r="19"/>
        <circle id="anel-arco" cx="22" cy="22" r="19"/>
      </svg>
      <span id="contagem">--</span>
      <div><div id="hora">--:--:--</div><small id="ultima">aguardando primeira leitura</small></div>
    </div>
  </header>
  <div id="aviso" hidden></div>

  <main id="tela-1" class="tela ativa">
    <section id="andre" class="cartao">
      <small class="rotulo">DEPUTADO ESTADUAL · NOVO</small>
      <h2 id="andre-nome">ANDRÉ SANTOS</h2>
      <div class="numero-urna">30777</div>
      <div id="andre-votos" class="votos-grande">0</div>
      <div class="legenda-votos">votos</div>
      <div id="andre-delta" class="delta"></div>
      <div class="posicoes">
        <div><b id="andre-pos-chapa">–</b><span>na chapa do NOVO</span></div>
        <div><b id="andre-pos-geral">–</b><span id="andre-pos-geral-txt">no geral</span></div>
      </div>
      <svg id="andre-grafico" viewBox="0 0 400 110" preserveAspectRatio="none"><polyline id="andre-linha" points=""/></svg>
      <small class="rotulo">evolução dos votos na noite</small>
      <div id="andre-situacao" class="situacao">em apuração</div>
    </section>

    <div class="coluna">
      <section id="est" class="cartao chapa">
        <h3>CHAPA NOVO · DEPUTADO ESTADUAL</h3>
        <ul class="lista"></ul>
        <footer></footer>
      </section>
      <section id="fed" class="cartao chapa">
        <h3>CHAPA NOVO · DEPUTADO FEDERAL</h3>
        <ul class="lista"></ul>
        <footer></footer>
      </section>
    </div>

    <div class="coluna">
      <section id="gov" class="cartao"><h3>GOVERNADOR</h3><ul class="lista"></ul></section>
      <section id="sen" class="cartao"><h3>SENADOR · 2 VAGAS</h3><ul class="lista"></ul></section>
      <section id="pres" class="cartao"><h3>PRESIDENTE · BRASIL <em>e no Paraná</em></h3><ul class="lista"></ul></section>
    </div>
  </main>

  <main id="tela-2" class="tela">
    <section class="cartao" id="mun-resumo">
      <small class="rotulo">ANDRÉ SANTOS · 30777</small>
      <div id="mun-andre-votos" class="votos-grande">0</div>
      <div class="legenda-votos">votos</div>
      <div class="posicoes">
        <div><b id="mun-com-votos">–</b><span id="mun-com-votos-txt">municípios com voto</span></div>
      </div>
      <small id="mun-atualizado" class="rotulo"></small>
    </section>
    <section class="cartao" id="mun">
      <h3>ANDRÉ POR MUNICÍPIO · 15 MAIORES VOTAÇÕES</h3>
      <ul class="lista"></ul>
    </section>
  </main>
</div>
<div id="tarja-sim" hidden>SIMULAÇÃO — DADOS FICTÍCIOS</div>
<script type="module" src="app.mjs"></script>
</body>
</html>
```

- [ ] **Step 6: Criar `apuracao/public/styles.css`**

```css
:root {
  --fundo: #0b0f17; --cartao: #141a26; --borda: #232c3d;
  --texto: #f2f5fa; --suave: #8b97ad; --laranja: #ff6a13; --verde: #2ecc71; --ambar: #f5b301;
}
* { box-sizing: border-box; margin: 0; }
html, body { height: 100%; background: var(--fundo); overflow: hidden; }
body { color: var(--texto); font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; font-variant-numeric: tabular-nums; }

#palco { position: absolute; width: 1920px; height: 1080px; transform-origin: 0 0; padding: 24px 32px; display: flex; flex-direction: column; gap: 16px; }

header { display: flex; align-items: center; gap: 40px; height: 84px; }
h1 { font-size: 34px; font-weight: 300; letter-spacing: 3px; white-space: nowrap; }
h1 b { font-weight: 800; color: var(--laranja); }
.secoes { flex: 1; display: flex; align-items: center; gap: 20px; font-size: 24px; color: var(--suave); }
.secoes b { color: var(--texto); font-size: 34px; }
.trilho { flex: 1; height: 16px; border-radius: 8px; background: var(--borda); overflow: hidden; }
#secoes-barra { height: 100%; width: 0; background: linear-gradient(90deg, var(--laranja), #ffb074); border-radius: 8px; transition: width 1.2s cubic-bezier(.2,.8,.2,1); }
.relogio { display: flex; align-items: center; gap: 14px; position: relative; }
#anel { width: 68px; height: 68px; transform: rotate(-90deg); }
#anel circle { fill: none; stroke-width: 4; }
#anel .fundo { stroke: var(--borda); }
#anel-arco { stroke: var(--laranja); stroke-linecap: round; stroke-dasharray: 119.38; stroke-dashoffset: 0; }
#anel.buscando { animation: pulsar .7s ease-in-out infinite; }
#contagem { position: absolute; left: 0; width: 68px; text-align: center; font-size: 22px; font-weight: 700; }
#hora { font-size: 30px; font-weight: 700; }
small, .rotulo { font-size: 15px; color: var(--suave); letter-spacing: 1px; }

#aviso { background: var(--ambar); color: #201800; font-size: 22px; font-weight: 700; padding: 8px 20px; border-radius: 10px; }
#tarja-sim { position: fixed; left: 0; right: 0; bottom: 0; background: #d1001f; color: #fff; text-align: center; font-size: 26px; font-weight: 800; letter-spacing: 6px; padding: 6px; z-index: 9; }

.tela { flex: 1; min-height: 0; display: none; gap: 20px; }
.tela.ativa { display: grid; animation: surgir .6s ease; }
#tela-1 { grid-template-columns: 470px 1fr 560px; }
#tela-2 { grid-template-columns: 470px 1fr; }
.coluna { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.cartao { background: var(--cartao); border: 1px solid var(--borda); border-radius: 18px; padding: 18px 22px; min-height: 0; }
.coluna .cartao { flex: 1 1 auto; }
h3 { font-size: 17px; letter-spacing: 2px; color: var(--suave); font-weight: 700; margin-bottom: 8px; }
h3 em { font-style: normal; font-weight: 400; }

#andre, #mun-resumo { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; border-color: var(--laranja); box-shadow: 0 0 60px -30px var(--laranja); }
#andre h2 { font-size: 46px; font-weight: 800; margin-top: 6px; }
.numero-urna { font-size: 30px; font-weight: 700; color: var(--laranja); letter-spacing: 6px; }
.votos-grande { font-size: 118px; font-weight: 800; line-height: 1; margin-top: 18px; }
.legenda-votos { font-size: 22px; color: var(--suave); }
.delta { height: 34px; font-size: 28px; font-weight: 700; color: var(--verde); }
.posicoes { display: flex; gap: 14px; width: 100%; margin: 14px 0; }
.posicoes div { flex: 1; background: var(--fundo); border-radius: 12px; padding: 12px 6px; }
.posicoes b { display: block; font-size: 52px; line-height: 1; }
.posicoes span { font-size: 16px; color: var(--suave); }
#andre-grafico { width: 100%; height: 110px; margin-top: auto; }
#andre-linha { fill: none; stroke: var(--laranja); stroke-width: 3; vector-effect: non-scaling-stroke; }
.situacao { font-size: 22px; font-weight: 700; padding: 6px 18px; border-radius: 20px; background: var(--fundo); color: var(--suave); }
.situacao.eleito { background: var(--verde); color: #04210f; }
#andre.subiu { animation: subiu 1.6s ease; }

.lista { list-style: none; padding: 0; }
.lista li { display: grid; grid-template-columns: 44px minmax(0, 1.3fr) minmax(0, 1fr) 110px 78px 34px; align-items: center; gap: 10px; height: 38px; font-size: 21px; border-radius: 8px; padding: 0 6px; }
.lista .pos { color: var(--suave); font-weight: 700; }
.lista .nome { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lista .nome small { margin-left: 8px; }
.lista .barra { height: 12px; background: var(--fundo); border-radius: 6px; overflow: hidden; }
.lista .barra i { display: block; height: 100%; width: 0; background: #5b6b8a; border-radius: 6px; transition: width 1.2s cubic-bezier(.2,.8,.2,1); }
.lista .votos, .lista .pct { text-align: right; font-weight: 700; }
.lista .pct { color: var(--suave); font-weight: 400; }
.lista .selo { color: var(--verde); font-weight: 800; white-space: nowrap; }
.lista li.destaque { background: rgba(255,106,19,.16); }
.lista li.destaque .barra i, .lista li.vaga .barra i { background: var(--laranja); }
.lista li.destaque .nome { font-weight: 800; }
.lista li.entrou { animation: surgir .6s ease; }
#pres .lista li { grid-template-columns: 44px minmax(0, 1.3fr) minmax(0, 1fr) 78px 110px; }
#pres .lista .votos { display: none; }
#pres .lista .selo { color: var(--suave); font-weight: 400; font-size: 18px; text-align: right; }
#mun .lista li { height: 54px; font-size: 26px; grid-template-columns: 50px minmax(0, 1.2fr) minmax(0, 1fr) 130px 110px 150px; }
#mun .lista .selo { color: var(--suave); font-weight: 400; font-size: 18px; text-align: right; }

.chapa footer { display: flex; gap: 22px; flex-wrap: wrap; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--borda); font-size: 18px; color: var(--suave); }
.chapa footer b { color: var(--texto); font-size: 22px; }
.chapa footer .vagas b { color: var(--laranja); font-size: 28px; }
.vazio .lista::before { content: "aguardando dados do TSE…"; color: var(--suave); font-size: 20px; }

.piscou { animation: piscar 1.4s ease; }
@keyframes piscar { 0% { color: var(--laranja); text-shadow: 0 0 18px var(--laranja); } 100% { text-shadow: none; } }
@keyframes surgir { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes pulsar { 50% { opacity: .35; } }
@keyframes subiu { 0%, 60% { box-shadow: 0 0 90px 0 var(--laranja); transform: scale(1.02); } 100% { transform: none; } }
```

- [ ] **Step 7: Criar `apuracao/public/app.mjs`**

```js
import { fmtInt, fmtPct, fmtHora, fmtDelta, selecionarChapa, pontosSparkline } from "./util.mjs";

const ANDRE = "30777";
const $ = (id) => document.getElementById(id);
const CIRCUNFERENCIA = 2 * Math.PI * 19;
let estado = null;
let escala = 1;

function escalar() {
  escala = Math.min(innerWidth / 1920, innerHeight / 1080);
  const palco = $("palco");
  palco.style.transform = `scale(${escala})`;
  palco.style.left = `${(innerWidth - 1920 * escala) / 2}px`;
  palco.style.top = `${(innerHeight - 1080 * escala) / 2}px`;
}
addEventListener("resize", escalar);
escalar();

function piscar(el, classe = "piscou") {
  el.classList.remove(classe);
  void el.offsetWidth; // reinicia a animação CSS
  el.classList.add(classe);
}

// Conta do valor exibido até o novo. Devolve true se o valor mudou.
function animarNumero(el, alvo, fmt = fmtInt) {
  const de = el._valor;
  el._valor = alvo;
  if (de === undefined || de === alvo) {
    el.textContent = fmt(alvo);
    return false;
  }
  cancelAnimationFrame(el._raf);
  const t0 = performance.now();
  const passo = (t) => {
    const k = Math.min(1, (t - t0) / 1200);
    el.textContent = fmt(de + (alvo - de) * (1 - Math.pow(1 - k, 3)));
    if (k < 1) el._raf = requestAnimationFrame(passo);
  };
  el._raf = requestAnimationFrame(passo);
  piscar(el);
  return true;
}

function criarLinha(k) {
  const li = document.createElement("li");
  li.dataset.k = k;
  for (const classe of ["pos", "nome", "barra", "votos", "pct", "selo"]) {
    const s = document.createElement("span");
    s.className = classe;
    li.append(s);
  }
  li.querySelector(".barra").append(document.createElement("i"));
  li.classList.add("entrou");
  return li;
}

// Reconciliação por chave + FLIP: a linha desliza da posição antiga para a nova.
function renderLista(ul, itens, montar) {
  const antes = new Map();
  const existentes = new Map();
  for (const li of ul.children) {
    antes.set(li.dataset.k, li.getBoundingClientRect().top);
    existentes.set(li.dataset.k, li);
  }
  const usados = new Set();
  for (const item of itens) {
    const li = existentes.get(item.k) ?? criarLinha(item.k);
    usados.add(item.k);
    ul.append(li);
    montar(li, item);
  }
  for (const [k, li] of existentes) if (!usados.has(k)) li.remove();
  for (const li of ul.children) {
    const topoAntes = antes.get(li.dataset.k);
    if (topoAntes === undefined) continue;
    const d = (topoAntes - li.getBoundingClientRect().top) / escala;
    if (Math.abs(d) < 1) continue;
    li.animate([{ transform: `translateY(${d}px)` }, { transform: "none" }], {
      duration: 900,
      easing: "cubic-bezier(.2,.8,.2,1)",
    });
  }
}

function montarLinha(li, d) {
  li.querySelector(".pos").textContent = `${d.pos}º`;
  const nome = li.querySelector(".nome");
  nome.textContent = d.nome;
  if (d.sub) {
    const s = document.createElement("small");
    s.textContent = d.sub;
    nome.append(s);
  }
  li.querySelector(".barra i").style.width = `${Math.max(0, Math.min(100, d.largura))}%`;
  animarNumero(li.querySelector(".votos"), d.votos);
  li.querySelector(".pct").textContent = d.pct == null ? "" : `${fmtPct(d.pct)}%`;
  li.querySelector(".selo").textContent = d.selo ?? "";
  li.classList.toggle("destaque", !!d.destaque);
  li.classList.toggle("vaga", !!d.vaga);
}

function renderAndre(a) {
  $("andre-situacao").classList.toggle("eleito", !!a?.eleito);
  if (!a) {
    $("andre-situacao").textContent = "aguardando dados do TSE";
    return;
  }
  $("andre-nome").textContent = a.nome;
  animarNumero($("andre-votos"), a.votos);
  animarNumero($("mun-andre-votos"), a.votos);
  $("andre-delta").textContent = fmtDelta(a.delta);
  const chapa = $("andre-pos-chapa");
  if (chapa._pos !== undefined && a.posChapa < chapa._pos) piscar($("andre"), "subiu");
  chapa._pos = a.posChapa;
  chapa.textContent = `${a.posChapa}º`;
  $("andre-pos-geral").textContent = `${a.posGeral}º`;
  $("andre-pos-geral-txt").textContent = `no geral (${fmtInt(a.totalCandidatos)} candidatos)`;
  $("andre-linha").setAttribute("points", pontosSparkline(a.historico, 400, 110));
  $("andre-situacao").textContent = a.eleito ? "ELEITO" : a.situacao || "em apuração";
}

function rodape(footer, c) {
  const item = (rotulo, valor, classe) => {
    const s = document.createElement("span");
    if (classe) s.className = classe;
    const b = document.createElement("b");
    b.textContent = valor;
    s.append(`${rotulo} `, b);
    return s;
  };
  const partes = [
    item("Legenda", fmtInt(c.novo.legenda)),
    item("Total NOVO", fmtInt(c.novo.total)),
    item(c.quocienteOficial ? "Quociente oficial" : "Quociente parcial", fmtInt(c.quociente)),
    item("Vagas diretas", String(c.novo.vagasDiretas), "vagas"),
  ];
  if (c.novo.faltamProxima != null) partes.push(item("Faltam para a próxima", fmtInt(c.novo.faltamProxima)));
  footer.replaceChildren(...partes);
}

function renderChapa(id, c, limite, fixo) {
  const sec = $(id);
  sec.classList.toggle("vazio", !c);
  if (!c) return;
  const linhas = selecionarChapa(c.candidatos, limite, fixo);
  const max = Math.max(1, linhas[0]?.votos ?? 0);
  renderLista(
    sec.querySelector(".lista"),
    linhas.map((x) => ({
      k: x.n, pos: x.pos, nome: x.nome, sub: x.n, votos: x.votos, pct: null,
      largura: (100 * x.votos) / max, destaque: x.n === fixo,
      selo: x.eleito ? "✔" : "",
    })),
    montarLinha,
  );
  rodape(sec.querySelector("footer"), c);
}

function renderMajor(id, m, limite) {
  const sec = $(id);
  sec.classList.toggle("vazio", !m);
  if (!m) return;
  const linhas = m.candidatos.slice(0, limite);
  const max = Math.max(1, linhas[0]?.votos ?? 0);
  renderLista(
    sec.querySelector(".lista"),
    linhas.map((x, i) => ({
      k: x.n, pos: i + 1, nome: x.nome, sub: x.partido, votos: x.votos, pct: x.pct,
      largura: (100 * x.votos) / max, vaga: i < m.vagas && x.votos > 0,
      selo: x.eleito ? "✔" : /turno/i.test(x.situacao) ? "2ºT" : "",
    })),
    montarLinha,
  );
}

function renderPresidente(p) {
  const sec = $("pres");
  sec.classList.toggle("vazio", !p?.br);
  if (!p?.br) return;
  const noPr = new Map((p.pr?.candidatos ?? []).map((c) => [c.n, c.pct]));
  const linhas = p.br.candidatos.slice(0, 4);
  const max = Math.max(1, linhas[0]?.votos ?? 0);
  renderLista(
    sec.querySelector(".lista"),
    linhas.map((x, i) => ({
      k: x.n, pos: i + 1, nome: x.nome, sub: x.partido, votos: x.votos, pct: x.pct,
      largura: (100 * x.votos) / max, vaga: i === 0 && x.votos > 0,
      selo: noPr.has(x.n) ? `PR ${fmtPct(noPr.get(x.n))}%` : "",
    })),
    montarLinha,
  );
}

function render(e) {
  estado = e;
  $("tarja-sim").hidden = !e.simulacao;
  const aviso = $("aviso");
  aviso.hidden = e.fonte.ok;
  if (!e.fonte.ok) {
    aviso.textContent = e.fonte.ultimaLeituraOk
      ? `Sem atualização desde ${fmtHora(e.fonte.ultimaLeituraOk)} — exibindo a última leitura`
      : "Sem resposta do TSE — tentando novamente";
  }
  $("ultima").textContent = e.pr ? `TSE gerou em ${e.pr.tseGeradoEm}` : "aguardando primeira leitura";
  if (e.pr) {
    animarNumero($("secoes-pct"), e.pr.secoesPct, fmtPct);
    $("secoes-barra").style.width = `${e.pr.secoesPct}%`;
  }
  renderAndre(e.andre);
  renderChapa("est", e.estadual, 10, ANDRE);
  renderChapa("fed", e.federal, 8, null);
  renderMajor("gov", e.governador, 4);
  renderMajor("sen", e.senador, 5);
  renderPresidente(e.presidente);
}

function tique() {
  $("hora").textContent = new Date().toLocaleTimeString("pt-BR");
  if (estado) {
    const total = Math.max(1, estado.proximaBuscaEm - estado.geradoEm);
    const resta = Math.max(0, estado.proximaBuscaEm - Date.now());
    $("contagem").textContent = Math.ceil(resta / 1000);
    $("anel-arco").style.strokeDashoffset = CIRCUNFERENCIA * (1 - resta / total);
    $("anel").classList.toggle("buscando", resta === 0);
  }
  requestAnimationFrame(tique);
}

addEventListener("keydown", (ev) => {
  if (ev.key.toLowerCase() === "f") {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }
});

// EventSource reconecta sozinho; o servidor reenvia o estado atual a cada conexão.
new EventSource("/events").onmessage = (ev) => render(JSON.parse(ev.data));
tique();
```

- [ ] **Step 8: Rodar todos os testes**

Run: `node --test apuracao/test/*.teste.mjs`
Expected: PASS em todos.

- [ ] **Step 9: Verificar no navegador em modo simulação**

Run: `node apuracao/server.mjs --simular` e abrir `http://localhost:4310` no Chrome.
Conferir, ao longo de pelo menos 6 ciclos de 10 s:
- tarja vermelha "SIMULAÇÃO — DADOS FICTÍCIOS" no rodapé;
- o anel esvazia de 10 a 0 e a contagem reinicia a cada ciclo;
- os votos do André sobem contando e piscam em laranja; o delta `▲ +N` aparece;
- as barras crescem com transição e linhas trocam de lugar deslizando quando o ranking muda;
- a linha do André fica realçada em laranja na chapa estadual;
- o gráfico de evolução ganha pontos;
- o rodapé das chapas mostra legenda, total, quociente parcial, vagas diretas e "faltam para a próxima";
- presidente mostra `PR xx,xx%` à direita;
- nada transborda em 1920×1080 (DevTools → modo responsivo 1920×1080) e a tela escala em outra janela;
- o console do navegador não mostra erros.
Depois, derrubar o servidor (Ctrl+C) com a página aberta: os números ficam; subir de novo: a página reconecta sozinha.

- [ ] **Step 10: Commit**

```bash
git add apuracao
git commit -m "feat(apuracao): tela principal com animações e contagem regressiva"
git push
```

---

### Task 8: Fase 2 — André por município

**Files:**
- Create: `apuracao/lib/municipios.mjs`
- Modify: `apuracao/server.mjs` (função `principal`), `apuracao/public/app.mjs`
- Test: `apuracao/test/municipios.teste.mjs`

**Interfaces:**
- Consumes: `num`, `pct` (Task 1); `baixarJson`, `URL_MUNICIPIOS`, `URL_ANDAMENTO`, `urlMunicipio` (Task 5); `criarServidor({ obterMunicipios, resumir })` (Task 6); `sim.municipios(lista, agora)` (Task 5); `renderLista`, `montarLinha`, `animarNumero`, `estado` (Task 7).
- Produces: `parseListaMunicipios(cfg, uf = "pr"): { cd, nome }[]`, `parseAndamento(ab): Map<cd, secoesPct>`, `parseMunicipio(json, numero): { votos, validos }`, `emLotes(itens, limite, fn): Promise<({ ok: true, valor } | { ok: false, erro })[]>`,
  `coletarMunicipios({ lista, baixarAndamento, baixarMunicipio, anterior = null, numero = "30777", limite = 8, agora }): Promise<ResultadoMunicipios>`,
  `resumirMunicipios(resultado, n = 15)`.

- [ ] **Step 1: Escrever o teste que falha**

`apuracao/test/municipios.teste.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseListaMunicipios, parseAndamento, parseMunicipio, emLotes, coletarMunicipios, resumirMunicipios,
} from "../lib/municipios.mjs";
import { fx } from "./fx.mjs";

test("lista dos 399 municípios do PR", () => {
  const lista = parseListaMunicipios(fx("municipios-pr.json"));
  assert.equal(lista.length, 399);
  assert.deepEqual(lista.find((m) => m.cd === "75353"), { cd: "75353", nome: "CURITIBA" });
  assert.throws(() => parseListaMunicipios({ abr: [] }), /não encontrada/);
});

test("andamento por município", () => {
  const a = parseAndamento(fx("andamento.json"));
  assert.equal(a.size, 399);
  assert.equal(a.get("75353"), 0);
});

test("votos do candidato num arquivo municipal", () => {
  assert.deepEqual(parseMunicipio(fx("mun-curitiba.json"), "30777"), { votos: 0, validos: 0 });
  assert.deepEqual(parseMunicipio(fx("mun-curitiba.json"), "00000"), { votos: 0, validos: 0 });
  const comVoto = { v: { vv: "1000" }, carg: [{ agr: [{ par: [{ cand: [{ n: "30777", vap: "42" }] }] }] }] };
  assert.deepEqual(parseMunicipio(comVoto, "30777"), { votos: 42, validos: 1000 });
});

test("emLotes respeita o limite e isola erros", async () => {
  let ativos = 0;
  let pico = 0;
  const r = await emLotes([1, 2, 3, 4, 5, 6, 7], 3, async (x) => {
    ativos++;
    pico = Math.max(pico, ativos);
    await new Promise((ok) => setTimeout(ok, 5));
    ativos--;
    if (x === 4) throw new Error("falhou");
    return x * 2;
  });
  assert.ok(pico <= 3, `pico ${pico}`);
  assert.deepEqual(r[0], { ok: true, valor: 2 });
  assert.equal(r[3].ok, false);
  assert.deepEqual(r[6], { ok: true, valor: 14 });
  assert.deepEqual(await emLotes([], 3, async () => 1), []);
});

const lista = [{ cd: "1", nome: "ALFA" }, { cd: "2", nome: "BETA" }, { cd: "3", nome: "GAMA" }];
const arquivo = (votos, validos) => ({ v: { vv: String(validos) }, carg: [{ agr: [{ par: [{ cand: [{ n: "30777", vap: String(votos) }] }] }] }] });
const andamento = { abr: [{ tpabr: "mun", cdabr: "1", s: { pst: "50,00" } }, { tpabr: "mun", cdabr: "2", s: { pst: "100,00" } }, { tpabr: "uf", cdabr: "pr", s: { pst: "70,00" } }] };

test("coleta ordena por votos e calcula percentuais", async () => {
  const dados = { 1: arquivo(10, 1000), 2: arquivo(300, 6000), 3: arquivo(0, 500) };
  const m = await coletarMunicipios({
    lista, agora: 7,
    baixarAndamento: async () => andamento,
    baixarMunicipio: async (cd) => dados[cd],
  });
  assert.equal(m.atualizadoEm, 7);
  assert.equal(m.total, 3);
  assert.equal(m.comVotos, 2);
  assert.equal(m.falhas, 0);
  assert.deepEqual(m.lista.map((x) => x.nome), ["BETA", "ALFA", "GAMA"]);
  assert.deepEqual(m.lista[0], { cd: "2", nome: "BETA", votos: 300, validos: 6000, pctValidos: 5, secoesPct: 100 });
  assert.equal(m.lista[2].secoesPct, 0);
  assert.equal(m.lista[2].pctValidos, 0);
});

test("município que falha mantém o valor anterior", async () => {
  const anterior = await coletarMunicipios({
    lista, agora: 1,
    baixarAndamento: async () => andamento,
    baixarMunicipio: async () => arquivo(50, 1000),
  });
  const m = await coletarMunicipios({
    lista, agora: 2, anterior,
    baixarAndamento: async () => { throw new Error("fora"); },
    baixarMunicipio: async (cd) => { if (cd === "2") throw new Error("fora"); return arquivo(80, 1000); },
  });
  assert.equal(m.falhas, 1);
  assert.equal(m.lista.find((x) => x.cd === "2").votos, 50);
  assert.equal(m.lista.find((x) => x.cd === "1").votos, 80);
  assert.equal(m.lista.find((x) => x.cd === "1").secoesPct, 50); // andamento falhou: mantém
});

test("resumo leva só os N primeiros para a tela", () => {
  const cheio = { atualizadoEm: 1, comVotos: 20, total: 30, falhas: 0, lista: Array.from({ length: 30 }, (_, i) => ({ cd: String(i) })) };
  const r = resumirMunicipios(cheio);
  assert.equal(r.lista.length, 15);
  assert.equal(r.total, 30);
  assert.equal(resumirMunicipios(null), null);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test apuracao/test/municipios.teste.mjs`
Expected: FAIL com `Cannot find module`

- [ ] **Step 3: Implementar `apuracao/lib/municipios.mjs`**

```js
import { num, pct } from "./parse.mjs";

export function parseListaMunicipios(cfg, uf = "pr") {
  const abr = (cfg?.abr ?? []).find((a) => a.cd.toLowerCase() === uf);
  if (!abr) throw new Error(`UF ${uf} não encontrada na lista de municípios do TSE`);
  return abr.mu.map((m) => ({ cd: m.cd, nome: m.nm }));
}

export function parseAndamento(ab) {
  return new Map(ab.abr.filter((a) => a.tpabr === "mun").map((a) => [a.cdabr, pct(a.s?.pst)]));
}

export function parseMunicipio(json, numero) {
  const validos = num(json?.v?.vv);
  for (const agr of json?.carg?.[0]?.agr ?? []) {
    for (const par of agr.par ?? []) {
      for (const c of par.cand ?? []) {
        if (c.n === numero) return { votos: num(c.vap), validos };
      }
    }
  }
  return { votos: 0, validos };
}

// Executa fn sobre os itens com no máximo `limite` chamadas simultâneas.
export async function emLotes(itens, limite, fn) {
  const resultados = new Array(itens.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      try {
        resultados[i] = { ok: true, valor: await fn(itens[i]) };
      } catch (erro) {
        resultados[i] = { ok: false, erro };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

export async function coletarMunicipios({
  lista, baixarAndamento, baixarMunicipio, anterior = null, numero = "30777", limite = 8, agora,
}) {
  const antes = new Map((anterior?.lista ?? []).map((m) => [m.cd, m]));
  let andamento = null;
  try {
    andamento = parseAndamento(await baixarAndamento());
  } catch {
    // mantém o % de seções da coleta anterior
  }
  const res = await emLotes(lista, limite, async (m) => parseMunicipio(await baixarMunicipio(m.cd), numero));
  let falhas = 0;
  const saida = lista.map((m, i) => {
    const ant = antes.get(m.cd);
    const r = res[i];
    if (!r.ok) falhas++;
    const votos = r.ok ? r.valor.votos : ant?.votos ?? 0;
    const validos = r.ok ? r.valor.validos : ant?.validos ?? 0;
    return {
      cd: m.cd,
      nome: m.nome,
      votos,
      validos,
      pctValidos: validos ? (100 * votos) / validos : 0,
      secoesPct: andamento?.get(m.cd) ?? ant?.secoesPct ?? 0,
    };
  });
  saida.sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"));
  return {
    atualizadoEm: agora,
    comVotos: saida.filter((m) => m.votos > 0).length,
    total: saida.length,
    falhas,
    lista: saida,
  };
}

export const resumirMunicipios = (m, n = 15) => (m ? { ...m, lista: m.lista.slice(0, n) } : null);
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test apuracao/test/municipios.teste.mjs`
Expected: PASS, 7 testes.

- [ ] **Step 5: Ligar a coleta no `principal()` de `apuracao/server.mjs`**

Trocar os imports do topo:
```js
import { baixarJson, baixarPrincipais, URL_ANDAMENTO, URL_MUNICIPIOS, urlMunicipio } from "./lib/tse.mjs";
import { coletarMunicipios, parseListaMunicipios, resumirMunicipios } from "./lib/municipios.mjs";
```
(remove o import anterior de `./lib/tse.mjs` que trazia só `baixarPrincipais`).

Substituir a função `principal` inteira por:
```js
async function principal() {
  const simular = process.argv.includes("--simular");
  const porta = Number(process.env.PORTA ?? 4310);
  const fixture = (nome) => JSON.parse(readFileSync(join(RAIZ, "test", "fixtures", nome), "utf8"));
  const listaLocal = () => parseListaMunicipios(fixture("municipios-pr.json"));
  let opcoes;

  if (simular) {
    const dir = join(RAIZ, "data", "sim");
    rmSync(dir, { recursive: true, force: true });
    const sim = criarSimulador(Object.fromEntries(CHAVES.map((k) => [k, fixture(`${k}.json`)])));
    const lista = listaLocal();
    opcoes = {
      store: criarStore(dir),
      simulacao: true,
      intervaloMs: 10000,
      intervaloMunMs: 20000,
      obterBrutos: async () => ({ brutos: sim.proximo(), erros: [] }),
      obterMunicipios: async () => sim.municipios(lista, Date.now()),
    };
  } else {
    let lista;
    try {
      lista = parseListaMunicipios(await baixarJson(URL_MUNICIPIOS));
    } catch (e) {
      console.error("[municípios] lista do TSE indisponível, usando a cópia local:", e.message);
      lista = listaLocal();
    }
    opcoes = {
      store: criarStore(join(RAIZ, "data", "real")),
      obterBrutos: () => baixarPrincipais(),
      obterMunicipios: (anterior) =>
        coletarMunicipios({
          lista, anterior, agora: Date.now(),
          baixarAndamento: () => baixarJson(URL_ANDAMENTO),
          baixarMunicipio: (cd) => baixarJson(urlMunicipio(cd)),
        }),
    };
  }

  const app = criarServidor({ ...opcoes, resumir: resumirMunicipios });
  app.server.listen(porta, "127.0.0.1", () => {
    console.log(`Painel de apuração em http://localhost:${porta}${simular ? "  (SIMULAÇÃO)" : ""}`);
    app.iniciar();
  });
}
```

- [ ] **Step 6: Segunda tela e rotação em `apuracao/public/app.mjs`**

Adicionar antes de `function render(e)`:
```js
function renderMunicipios(m) {
  $("mun").classList.toggle("vazio", !m);
  if (!m) return;
  $("mun-com-votos").textContent = fmtInt(m.comVotos);
  $("mun-com-votos-txt").textContent = `de ${fmtInt(m.total)} municípios com voto`;
  $("mun-atualizado").textContent = `municípios atualizados às ${fmtHora(m.atualizadoEm)}` +
    (m.falhas ? ` · ${m.falhas} sem resposta` : "");
  const max = Math.max(1, m.lista[0]?.votos ?? 0);
  renderLista(
    $("mun").querySelector(".lista"),
    m.lista.map((x, i) => ({
      k: x.cd, pos: i + 1, nome: x.nome, votos: x.votos, pct: x.pctValidos,
      largura: (100 * x.votos) / max, vaga: true,
      selo: `${fmtPct(x.secoesPct, 0)}% apurado`,
    })),
    montarLinha,
  );
}

// Rotação: 40 s na tela principal, 20 s na de municípios. 1/2 fixam, R volta a alternar.
let modo = "auto";
let telaAtual = 1;
let trocaEm = Date.now() + 40000;

function mostrar(n) {
  telaAtual = n;
  $("tela-1").classList.toggle("ativa", n === 1);
  $("tela-2").classList.toggle("ativa", n === 2);
}

function girar() {
  if (modo !== "auto" || !estado?.municipios || Date.now() < trocaEm) return;
  mostrar(telaAtual === 1 ? 2 : 1);
  trocaEm = Date.now() + (telaAtual === 1 ? 40000 : 20000);
}
```

Dentro de `render(e)`, depois de `renderPresidente(e.presidente);`, adicionar:
```js
  renderMunicipios(e.municipios);
```

Dentro de `tique()`, antes de `requestAnimationFrame(tique);`, adicionar:
```js
  girar();
```

Substituir o listener de teclado por:
```js
addEventListener("keydown", (ev) => {
  const k = ev.key.toLowerCase();
  if (k === "f") {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  } else if (k === "1" || k === "2") {
    modo = "fixo";
    mostrar(Number(k));
  } else if (k === "r") {
    modo = "auto";
    trocaEm = Date.now() + 5000;
  }
});
```

- [ ] **Step 7: Rodar todos os testes**

Run: `node --test apuracao/test/*.teste.mjs`
Expected: PASS em todos.

- [ ] **Step 8: Verificar a coleta real e o tempo que ela leva**

Run:
```bash
node -e '
import("./apuracao/lib/tse.mjs").then(async (t) => {
  const m = await import("./apuracao/lib/municipios.mjs");
  const lista = m.parseListaMunicipios(await t.baixarJson(t.URL_MUNICIPIOS));
  const t0 = Date.now();
  const r = await m.coletarMunicipios({ lista, agora: Date.now(),
    baixarAndamento: () => t.baixarJson(t.URL_ANDAMENTO),
    baixarMunicipio: (cd) => t.baixarJson(t.urlMunicipio(cd)) });
  console.log("municípios", r.total, "falhas", r.falhas, "segundos", (Date.now() - t0) / 1000);
});'
```
Expected: `municípios 399 falhas 0` e duração bem abaixo de 300 s. Se passar de 120 s, subir `limite` para 16 em `coletarMunicipios` e repetir; se houver falhas por limite de requisições, baixar para 4.

- [ ] **Step 9: Verificar a segunda tela em simulação**

Run: `node apuracao/server.mjs --simular` e abrir `http://localhost:4310`.
Conferir: após ~40 s a tela troca sozinha para "André por município" com 15 linhas, barras e "% apurado"; volta após ~20 s; tecla `2` fixa a segunda tela, `1` a primeira, `R` retoma a rotação; os votos do André na faixa lateral batem com a tela principal; nada transborda em 1920×1080.

- [ ] **Step 10: Commit**

```bash
git add apuracao
git commit -m "feat(apuracao): votos do André por município e rotação de telas"
git push
```

---

### Task 9: Inicialização em um clique e roteiro da noite

**Files:**
- Create: `apuracao/iniciar.command`, `apuracao/iniciar-simulacao.command`, `apuracao/README.md`

**Interfaces:**
- Consumes: `node apuracao/server.mjs [--simular]`, porta `4310`.

- [ ] **Step 1: Criar `apuracao/iniciar.command`**

```bash
#!/bin/bash
# Sobe o painel de apuração, impede o Mac de dormir e abre o Chrome em tela cheia.
cd "$(dirname "$0")/.." || exit 1
PORTA="${PORTA:-4310}"

caffeinate -dims node apuracao/server.mjs "$@" &
SERVIDOR=$!
trap 'kill $SERVIDOR 2>/dev/null' EXIT INT TERM

for _ in $(seq 1 30); do
  curl -s -o /dev/null "http://localhost:$PORTA/" && break
  sleep 0.5
done

CHROME=""
for c in "/Applications/Google Chrome.app" "$HOME/Applications/Google Chrome.app" "$HOME/Desktop/Google Chrome.app"; do
  [ -d "$c" ] && CHROME="$c/Contents/MacOS/Google Chrome" && break
done

if [ -n "$CHROME" ]; then
  "$CHROME" --kiosk --user-data-dir="$HOME/.apuracao-chrome" --no-first-run "http://localhost:$PORTA/" >/dev/null 2>&1 &
else
  open "http://localhost:$PORTA/"
  echo "Chrome não encontrado: abri no navegador padrão. Aperte F para tela cheia."
fi

echo "Painel rodando. Para encerrar, feche esta janela ou aperte Ctrl+C."
wait $SERVIDOR
```

- [ ] **Step 2: Criar `apuracao/iniciar-simulacao.command`**

```bash
#!/bin/bash
exec "$(dirname "$0")/iniciar.command" --simular
```

- [ ] **Step 3: Tornar executáveis e testar**

Run: `chmod +x apuracao/iniciar.command apuracao/iniciar-simulacao.command && ./apuracao/iniciar-simulacao.command`
Expected: o Chrome abre em modo quiosque com a tarja de simulação e os números se mexendo. `Cmd+Q` fecha o Chrome; `Ctrl+C` no terminal encerra o servidor e `lsof -i :4310` não lista mais nada.

- [ ] **Step 4: Criar `apuracao/README.md`**

```markdown
# Painel de apuração — Paraná 2026

Tela para TV com a apuração oficial do TSE, com destaque para André Santos (30777).
Roda só neste Mac; não depende do sistema em produção.

## Na noite da apuração (domingo, 04/10)

1. Ligue o Mac na TV (HDMI) e deixe a TV como tela principal ou espelhada.
2. Dê dois cliques em `apuracao/iniciar.command`.
   O painel abre no Chrome em tela cheia e o Mac não dorme enquanto ele estiver aberto.
3. Antes das 17h os números ficam zerados. A partir do início da totalização, a tela
   atualiza sozinha a cada minuto.

Teclas: `1` tela principal · `2` André por município · `R` alternar sozinho · `F` tela cheia.
Para sair do Chrome: `Cmd+Q`. Para encerrar o painel: feche a janela do Terminal.

## Para testar antes

Dois cliques em `apuracao/iniciar-simulacao.command`. Aparece uma tarja vermelha
"SIMULAÇÃO — DADOS FICTÍCIOS": são números inventados sobre os candidatos reais,
avançando a cada 10 segundos.

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| Faixa âmbar "Sem atualização desde HH:MM" | O TSE ou a internet falharam. Os números na tela são os últimos lidos. Volta sozinho; confira o Wi-Fi. |
| Tela parada, contagem não anda | Aperte `Cmd+R` no Chrome. |
| Chrome fechou | Abra `http://localhost:4310` em qualquer navegador e aperte `F`. |
| Terminal fechou | Dois cliques em `iniciar.command` de novo. O gráfico de evolução do André continua de onde parou. |
| "address already in use" | Já há um painel rodando. Abra `http://localhost:4310`. |

## O que a tela mostra

- **Quociente parcial:** votos válidos ÷ vagas, com o que já foi apurado. Muda durante a noite.
  Vira "quociente oficial" quando o TSE publicar o dele.
- **Vagas diretas:** quantas cadeiras o NOVO garante só pelo quociente. As sobras não são
  calculadas aqui; o resultado final é o "✔" ao lado de cada eleito, que vem do TSE.
- **Municípios:** atualizam a cada 5 minutos (são 399 arquivos por rodada).

## Dados

- Fonte: `https://resultados.tse.jus.br/oficial/ele2026` (eleições 6259 e 6257).
- Histórico da noite: `apuracao/data/real/` (`historico.jsonl`, `estados.jsonl`). Fica fora do git.

## Desenvolvimento

    node apuracao/server.mjs            # dados reais
    node apuracao/server.mjs --simular  # simulação
    node --test apuracao/test/*.teste.mjs
```

- [ ] **Step 5: Rodar tudo uma última vez**

Run: `node --test apuracao/test/*.teste.mjs && npm run lint`
Expected: todos os testes passam; o lint do sistema continua passando (nada em `src/` mudou).

- [ ] **Step 6: Ensaio com dados reais na TV**

Run: `./apuracao/iniciar.command`
Conferir: sem tarja de simulação; `ANDRÉ SANTOS` com 0 votos; 0,00% das seções; "TSE gerou em <data> <hora>"; contagem regressiva de 60 s; após 5 min sem erros no terminal. Comparar a lista de candidatos da chapa com o site `resultados.tse.jus.br`.

- [ ] **Step 7: Commit**

```bash
git add apuracao
git commit -m "feat(apuracao): inicialização em um clique e roteiro da noite"
git push
```
