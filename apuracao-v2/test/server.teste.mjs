import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarServidor } from "../server.mjs";
import { criarStore } from "../lib/store.mjs";
import { CHAVES } from "../lib/estado.mjs";
import { criarSimulador } from "../lib/simulador.mjs";
import { fx } from "./fx.mjs";

const brutosReais = () => Object.fromEntries(CHAVES.map((k) => [k, fx(`${k}.json`)]));

async function subir(opcoes) {
  const store = criarStore(mkdtempSync(join(tmpdir(), "apuracao-srv-")));
  const app = criarServidor({ store, ...opcoes });
  await new Promise((ok) => app.server.listen(0, "127.0.0.1", ok));
  app.server.unref(); // um teste que falha antes de parar() não prende o processo
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
  app.parar();
});

test("antes de a apuração começar (tudo zerado) nada entra no histórico", async () => {
  const { app, store } = await subir({ obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }) });
  const e = await app.ciclo();
  assert.deepEqual(e.andre.historico, []);
  assert.equal(store.historico().length, 0);
  app.parar();
});

test("com a apuração em andamento o ponto entra no histórico", async () => {
  const sim = criarSimulador(brutosReais(), { passos: 10 });
  const { app, store } = await subir({ obterBrutos: async () => ({ brutos: sim.proximo(), erros: [] }), relogio: () => 5000 });
  const e = await app.ciclo();
  assert.equal(e.andre.historico.length, 1);
  assert.equal(e.andre.historico[0].t, 5000);
  assert.equal(e.andre.historico[0].secoesPct, 10);
  assert.ok(e.andre.historico[0].votos > 0);
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

test("coletas de municípios não se sobrepõem", async () => {
  let chamadas = 0;
  const pendentes = [];
  const { app } = await subir({
    obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }),
    obterMunicipios: () => {
      chamadas++;
      return new Promise((ok) => pendentes.push(() => ok({ atualizadoEm: 1, comVotos: 0, total: 0, falhas: 0, lista: [] })));
    },
  });
  const a = app.cicloMunicipios();
  const b = app.cicloMunicipios();
  for (const liberar of pendentes) liberar();
  await Promise.all([a, b]);
  assert.equal(chamadas, 1);
  app.parar();
});

test("falha ao gravar em disco não derruba o ciclo", async () => {
  const store = { historico: () => [], registrar: () => { throw new Error("disco cheio"); }, salvarEstado: () => { throw new Error("disco cheio"); } };
  const app = criarServidor({ store, obterBrutos: async () => ({ brutos: criarSimulador(brutosReais(), { passos: 2 }).proximo(), erros: [] }) });
  const e = await app.ciclo();
  assert.equal(e.andre.nome, "ANDRÉ SANTOS");
  assert.ok(e.andre.votos > 0);
});

test("requisição com URL malformada não derruba o servidor", async () => {
  const { app, url } = await subir({ obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }) });
  const porta = app.server.address().port;
  const net = await import("node:net");
  const resposta = await new Promise((ok) => {
    const c = net.connect(porta, "127.0.0.1", () => c.write("GET // HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n"));
    let dados = "";
    c.on("data", (d) => (dados += d)).on("close", () => ok(dados)).on("error", () => ok(dados));
  });
  assert.match(resposta, /^HTTP\/1\.1 4\d\d/);
  assert.equal((await fetch(`${url}/`)).status, 200);
  app.parar();
});

test("servidor aceita outro candidato em foco e rótulo de simulação", async () => {
  const { app } = await subir({
    obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }),
    foco: "30010", simulacao: "SIMULAÇÃO — TESTE",
  });
  const e = await app.ciclo();
  assert.equal(e.andre.n, "30010");
  assert.equal(e.simulacao, "SIMULAÇÃO — TESTE");
  app.parar();
});

test("V2: ciclo de presidente atualiza só o presidente, no próprio ritmo", async () => {
  const sim = criarSimulador(brutosReais(), { passos: 4 });
  const avancado = sim.proximo();
  let t = 1000;
  const { app } = await subir({
    obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }),
    obterPresidente: async () => ({ brutos: { presBr: avancado.presBr, presPr: avancado.presPr }, erros: [] }),
    intervaloPresMs: 30000,
    relogio: () => t,
  });
  await app.ciclo();
  t = 31000;
  const e = await app.cicloPresidente();
  assert.ok(e.presidente.br.candidatos[0].votos > 0);
  assert.ok(e.presidente.pr.candidatos[0].votos > 0);
  assert.equal(e.estadual.candidatos[0].votos, 0);
  assert.equal(e.presidenteAtualizadoEm, 31000);
  assert.equal(e.proximaPresEm, 61000);
  assert.equal(e.geradoEm, 1000);
  app.parar();
});

test("V2: falha no ciclo de presidente mantém os números anteriores", async () => {
  const { app } = await subir({
    obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }),
    obterPresidente: async () => { throw new Error("fora do ar"); },
  });
  await app.ciclo();
  const e = await app.cicloPresidente();
  assert.equal(e.presidente.br.candidatos.length, 13);
  app.parar();
});

test("V2: /api/municipios devolve a lista completa, não só os 30 da tela", async () => {
  const lista = Array.from({ length: 40 }, (_, i) => ({ cd: String(i), nome: `M${i}`, votos: 40 - i, validos: 100, pctValidos: 1, secoesPct: 50 }));
  const { app, url } = await subir({
    obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }),
    obterMunicipios: async () => ({ atualizadoEm: 9, comVotos: 40, total: 40, falhas: 0, lista }),
    resumir: (m) => ({ ...m, lista: m.lista.slice(0, 30) }),
  });
  assert.equal((await fetch(`${url}/api/municipios`)).status, 503);
  await app.ciclo();
  await app.cicloMunicipios();
  const r = await (await fetch(`${url}/api/municipios`)).json();
  assert.equal(r.lista.length, 40);
  assert.equal(r.atualizadoEm, 9);
  app.parar();
});

test("V2: /municipios.pdf entrega o PDF gerado a partir da página de relatório", async () => {
  let pedido;
  const { app, url } = await subir({
    obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }),
    gerarPdf: async (endereco) => { pedido = endereco; return Buffer.from("%PDF-1.4 teste"); },
  });
  const r = await fetch(`${url}/municipios.pdf`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /application\/pdf/);
  assert.match(r.headers.get("content-disposition"), /attachment; filename="votos-por-municipio-\d{4}-\d{2}-\d{2}-\d{4}\.pdf"/);
  assert.equal(await r.text(), "%PDF-1.4 teste");
  assert.match(pedido, /\/municipios\.html$/);
  app.parar();
});

test("V2: sem Chrome para gerar o PDF, explica e aponta a página de relatório", async () => {
  const { app, url } = await subir({ obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }) });
  const r = await fetch(`${url}/municipios.pdf`);
  assert.equal(r.status, 501);
  assert.match(await r.text(), /municipios\.html/);
  app.parar();
});

test("V2: falha do gerador de PDF vira erro 500 sem derrubar o servidor", async () => {
  const { app, url } = await subir({
    obterBrutos: async () => ({ brutos: brutosReais(), erros: [] }),
    gerarPdf: async () => { throw new Error("chrome travou"); },
  });
  assert.equal((await fetch(`${url}/municipios.pdf`)).status, 500);
  assert.equal((await fetch(`${url}/`)).status, 200);
  app.parar();
});
