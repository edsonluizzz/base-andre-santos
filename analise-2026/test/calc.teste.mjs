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
