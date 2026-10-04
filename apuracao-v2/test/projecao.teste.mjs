import test from "node:test";
import assert from "node:assert/strict";
import { projetarProporcional, projetarMajoritario } from "../lib/projecao.mjs";
import { carregarDados2022, criarSimulador2022 } from "../lib/simulador2022.mjs";
import { parseCargo } from "../lib/parse.mjs";

const cand = (n, partido, votos, extra = {}) => ({ n, nome: n, partido, votos, entidade: extra.entidade ?? partido, valido: extra.valido ?? true });
const part = (sg, nominais, legenda = 0, entidade = sg) => ({ sg, nominais, legenda, total: nominais + legenda, entidade });
const comoMapa = (r) => Object.fromEntries(r.map((x) => [x.n, x.via]));

test("quociente partidário, depois sobras por maior média com 80/20", () => {
  // QE = 1000 / 5 = 200; 10% = 20; 20% = 40; 80% = 160
  const r = projetarProporcional({
    vagas: 5, validos: 1000, qeOficial: 0,
    partidos: [part("A", 520), part("B", 300), part("C", 170), part("D", 10)],
    candidatos: [cand("A1", "A", 300), cand("A2", "A", 150), cand("A3", "A", 50), cand("A4", "A", 20),
      cand("B1", "B", 250), cand("B2", "B", 50), cand("C1", "C", 120), cand("C2", "C", 50), cand("D1", "D", 10)],
  });
  assert.deepEqual(comoMapa(r), { A1: "QP", A2: "QP", B1: "QP", A3: "MÉDIA", C1: "MÉDIA" });
});

test("sem quem cumpra 80/20, a última fase abre para todos os partidos", () => {
  // QE = 100; A tem 2 QP e mais ninguém; a vaga restante vai para B pela maior média entre todos
  const r = projetarProporcional({
    vagas: 3, validos: 300, qeOficial: 0,
    partidos: [part("A", 250), part("B", 50)],
    candidatos: [cand("A1", "A", 240), cand("A2", "A", 10), cand("B1", "B", 50)],
  });
  assert.deepEqual(comoMapa(r), { A1: "QP", A2: "QP", B1: "MÉDIA" });
});

test("candidato abaixo de 10% do quociente não entra pelo quociente partidário", () => {
  // QE = 100; A tem QP 2, mas só A1 tem 10 votos ou mais
  const r = projetarProporcional({
    vagas: 3, validos: 300, qeOficial: 0,
    partidos: [part("A", 230, 50), part("B", 70)],
    candidatos: [cand("A1", "A", 220), cand("A2", "A", 9), cand("B1", "B", 70)],
  });
  assert.equal(comoMapa(r).A1, "QP");
  assert.notEqual(comoMapa(r).A2, "QP");
  assert.equal(r.length, 3);
});

test("federação soma os votos dos partidos e conta como um só", () => {
  // QE = 100. Separados, X e Y teriam 0 QP cada; juntos (F) têm 1 QP
  const r = projetarProporcional({
    vagas: 2, validos: 200, qeOficial: 0,
    partidos: [part("X", 60, 0, "F"), part("Y", 50, 0, "F"), part("Z", 90)],
    candidatos: [cand("X1", "X", 60, { entidade: "F" }), cand("Y1", "Y", 50, { entidade: "F" }), cand("Z1", "Z", 90)],
  });
  assert.equal(comoMapa(r).X1, "QP");
  assert.equal(r.length, 2);
});

test("candidato com voto anulado não é projetado", () => {
  const r = projetarProporcional({
    vagas: 1, validos: 100, qeOficial: 0,
    partidos: [part("A", 100)],
    candidatos: [cand("A1", "A", 90, { valido: false }), cand("A2", "A", 10)],
  });
  assert.deepEqual(comoMapa(r), { A2: "QP" });
});

test("sem votos válidos não há projeção", () => {
  assert.deepEqual(projetarProporcional({ vagas: 54, validos: 0, qeOficial: 0, partidos: [], candidatos: [] }), []);
});

test("2022: com os votos finais, a projeção acerta todos os eleitos oficiais", () => {
  const dados = carregarDados2022(new URL("../dados-2022/pr-2022.json.gz", import.meta.url));
  const final = criarSimulador2022(dados, { passos: 1 }).proximo();
  for (const [cargo, vagas] of [["estadual", 54], ["federal", 30]]) {
    const b = parseCargo(final[cargo]);
    const projetados = projetarProporcional({ ...b, qeOficial: 0 });
    const oficiais = b.candidatos.filter((c) => c.eleito);
    assert.equal(oficiais.length, vagas, `${cargo}: oficiais`);
    assert.deepEqual(projetados.map((x) => x.n).sort(), oficiais.map((c) => c.n).sort(), cargo);
    const viaOficial = Object.fromEntries(oficiais.map((c) => [c.n, /qp/i.test(c.situacao) ? "QP" : "MÉDIA"]));
    assert.deepEqual(comoMapa(projetados), viaOficial, `${cargo}: QP x média`);
  }
});

test("majoritário: maioria absoluta elege; senão os dois primeiros vão ao 2º turno", () => {
  const c = (n, votos) => ({ n, votos });
  assert.deepEqual(projetarMajoritario({ vagas: 1, validos: 1000, candidatos: [c("1", 510), c("2", 490)], segundoTurno: true }), [{ n: "1", via: "ELEITO" }]);
  assert.deepEqual(projetarMajoritario({ vagas: 1, validos: 1000, candidatos: [c("1", 450), c("2", 400), c("3", 150)], segundoTurno: true }),
    [{ n: "1", via: "2º TURNO" }, { n: "2", via: "2º TURNO" }]);
  assert.deepEqual(projetarMajoritario({ vagas: 2, validos: 1000, candidatos: [c("1", 300), c("2", 290), c("3", 280)], segundoTurno: false }),
    [{ n: "1", via: "ELEITO" }, { n: "2", via: "ELEITO" }]);
  assert.deepEqual(projetarMajoritario({ vagas: 1, validos: 0, candidatos: [c("1", 0)], segundoTurno: true }), []);
});
