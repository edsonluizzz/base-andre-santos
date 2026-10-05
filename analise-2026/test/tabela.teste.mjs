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
