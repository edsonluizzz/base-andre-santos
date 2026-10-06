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

import { quantil } from "../public/js/calc.mjs";

test("quantil: valor de corte que ignora pontos extremos", () => {
  assert.equal(quantil([1, 2, 3, 4, 100], 0.5), 3);
  assert.equal(quantil([5], 0.98), 5);
  assert.equal(quantil([], 0.98), 0);
  assert.ok(quantil([...Array(99).fill(1), 1000], 0.98) < 1000);
});

import { afinidade, projetar, regressaoLog } from "../public/js/calc.mjs";

test("regressaoLog: y = 2·x^0,5 dá elasticidade 0,5", () => {
  const r = regressaoLog([1, 4, 9, 16, 100].map((x) => ({ x, y: 2 * Math.sqrt(x) })));
  assert.ok(Math.abs(r.b - 0.5) < 1e-9);
  assert.ok(Math.abs(Math.exp(r.a) - 2) < 1e-9);
  assert.ok(Math.abs(r.r2 - 1) < 1e-9);
  assert.equal(r.n, 5);
  assert.equal(regressaoLog([{ x: 0, y: 1 }, { x: 1, y: 0 }]), null); // valores não positivos são ignorados
});

test("projetar: votos crescem pela elasticidade", () => {
  assert.equal(projetar(1000, 100, 400, 0.5), 2000);
  assert.equal(projetar(1000, 100, 100, 0.7), 1000);
});

test("afinidade: correlação dos % por local e lift nos locais do André", () => {
  const ids = ["a", "b", "c", "d"];
  const M = (o) => new Map(Object.entries(o));
  // André forte em a e b; X igual; Y forte onde André não está
  const andre = M({ a: 30, b: 20 }), totA = M({ a: 100, b: 100, c: 100, d: 100 });
  const tot = M({ a: 200, b: 200, c: 200, d: 200 });
  const x = M({ a: 60, b: 40 }), y = M({ c: 50, d: 50 });
  const rx = afinidade(ids, andre, totA, x, tot);
  const ry = afinidade(ids, andre, totA, y, tot);
  assert.ok(Math.abs(rx.r - 1) < 1e-9);
  assert.ok(ry.r < 0);
  // X: 100 votos em 800 = 12,5% no estado; nos locais do André pesa (30·0,3 + 20·0,2)/50 = 26% → lift 2,08
  assert.ok(Math.abs(rx.lift - 0.26 / 0.125) < 1e-9);
  assert.equal(ry.lift, 0);
});
