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
