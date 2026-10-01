import test from "node:test";
import assert from "node:assert/strict";
import { criarSimulador } from "../lib/simulador.mjs";
import { parseCargo } from "../lib/parse.mjs";
import { CHAVES } from "../lib/estado.mjs";
import { fx } from "./fx.mjs";

const bases = () => Object.fromEntries(CHAVES.map((k) => [k, fx(`${k}.json`)]));

test("votos só crescem e termina em 100% das seções", () => {
  const sim = criarSimulador(bases(), { passos: 10 });
  let anterior = -1;
  let ultimo;
  for (let i = 0; i < 12; i++) {
    ultimo = sim.proximo();
    const est = parseCargo(ultimo.estadual);
    const andre = est.candidatos.find((c) => c.n === "30777").votos;
    assert.ok(andre >= anterior, `passo ${i}: ${andre} < ${anterior}`);
    anterior = andre;
  }
  assert.equal(sim.terminou, true);
  const est = parseCargo(ultimo.estadual);
  assert.equal(est.secoesPct, 100);
  assert.ok(anterior > 0);
  assert.ok(est.validos > 0);
  const novo = est.partidos.find((p) => p.sg === "NOVO");
  assert.ok(novo.legenda > 0);
  for (const k of CHAVES) assert.ok(parseCargo(ultimo[k]).candidatos[0].votos > 0, k);
});

test("mesma semente gera a mesma apuração", () => {
  const a = criarSimulador(bases(), { passos: 5 }).proximo();
  const b = criarSimulador(bases(), { passos: 5 }).proximo();
  assert.deepEqual(parseCargo(a.federal).candidatos, parseCargo(b.federal).candidatos);
});

test("municípios simulados somam os votos do André e ordenam por votos", () => {
  const sim = criarSimulador(bases(), { passos: 4 });
  sim.proximo();
  sim.proximo();
  const lista = [{ cd: "1", nome: "A" }, { cd: "2", nome: "B" }, { cd: "3", nome: "C" }];
  const m = sim.municipios(lista, 99);
  assert.equal(m.atualizadoEm, 99);
  assert.equal(m.total, 3);
  assert.equal(m.lista.length, 3);
  assert.ok(m.lista[0].votos >= m.lista[1].votos);
  assert.equal(m.lista[0].secoesPct, 50);
});
