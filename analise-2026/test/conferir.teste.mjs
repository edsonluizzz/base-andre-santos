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
