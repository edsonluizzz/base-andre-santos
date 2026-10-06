import test from "node:test";
import assert from "node:assert/strict";
import { calcularDobradas, criarAgregadorCargos } from "../coletar/dobradas.mjs";

test("agregador de outros cargos: só nominais válidos, por local", () => {
  const ag = criarAgregadorCargos(new Map([["6", new Set(["3011", "1300"])], ["5", new Set(["300"])]]));
  const s = (cargo, local, votavel, votos) => ag.adicionar({ cargo, mun: "75353", zona: "1", local, votavel, votos });
  s("6", "10", "3011", 5);
  s("6", "10", "1300", 3);
  s("6", "10", "30", 9);   // legenda: fora
  s("6", "20", "3011", 2);
  s("5", "10", "300", 7);
  s("7", "10", "30777", 1); // cargo não pedido
  const r = ag.resultado();
  assert.deepEqual([...r.get("6").votos.get("3011")], [["75353-1-10", 5], ["75353-1-20", 2]]);
  assert.deepEqual([...r.get("6").total], [["75353-1-10", 8], ["75353-1-20", 2]]);
  assert.deepEqual([...r.get("5").total], [["75353-1-10", 7]]);
  assert.equal(r.has("7"), false);
});

test("calcularDobradas: ordena por afinidade e guarda mapa só de quem foi pedido", () => {
  const ids = ["a", "b", "c"];
  const M = (o) => new Map(Object.entries(o));
  const andre = M({ a: 10, b: 5 }), totA = M({ a: 100, b: 100, c: 100 });
  const agregado = { votos: new Map([["1", M({ a: 50, b: 25 })], ["2", M({ c: 80 })]]), total: M({ a: 100, b: 100, c: 100 }) };
  const candidatos = [
    { n: "2", nm: "LONGE", sg: "X", st: "Eleito", eleito: true, votos: 80 },
    { n: "1", nm: "PERTO", sg: "Y", st: "Suplente", eleito: false, votos: 75 },
  ];
  const r = calcularDobradas({ candidatos, agregado, ids, andre, totAndre: totA, comMapa: (_, k) => k === 0 });
  assert.deepEqual(r.map((c) => c.n), ["1", "2"]);
  assert.ok(r[0].r > 0.99 && r[1].r < 0);
  assert.deepEqual([...r[0].loc], [["a", 50], ["b", 25]]);
  assert.equal(r[1].loc, null);
  assert.equal(r[0].nm, "PERTO");
});
