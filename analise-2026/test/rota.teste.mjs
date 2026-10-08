import test from "node:test";
import assert from "node:assert/strict";
import { escreverRota, lerRota } from "../public/js/rota.mjs";

const ids = ["panorama", "candidato", "custo", "comparador", "concorrentes", "relatorio"];

test("lerRota", () => {
  assert.deepEqual(lerRota("#comparador?b=30300&nivel=loc", ids), { tela: "comparador", params: { b: "30300", nivel: "loc" } });
  assert.deepEqual(lerRota("", ids), { tela: "panorama", params: {} });
  assert.deepEqual(lerRota("#nao-existe?b=1", ids), { tela: "panorama", params: { b: "1" } });
});

test("escreverRota omite vazios", () => {
  assert.equal(escreverRota("comparador", { b: "30300", nivel: null, modo: "" }), "#comparador?b=30300");
  assert.equal(escreverRota("candidato", {}), "#candidato");
});
