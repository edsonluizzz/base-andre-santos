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
