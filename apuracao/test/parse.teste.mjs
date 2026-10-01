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
