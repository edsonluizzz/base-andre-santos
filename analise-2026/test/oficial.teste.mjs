import test from "node:test";
import assert from "node:assert/strict";
import { parseMunicipiosCfg, parseOficial } from "../coletar/oficial.mjs";

const json = {
  dg: "04/10/2026", hg: "23:59:59",
  v: { vv: "1000", vnom: "900", vl: "100", vb: "40", tvn: "20" },
  carg: [{ nv: "54", qe: "114449", agr: [
    { nm: "PARTIDO NOVO", tp: "i", com: "NOVO", vag: "3", par: [{ n: "30", dvt: "Válido (legenda)", sg: "NOVO", tvtn: "371998", tvtl: "35192", cand: [
      { n: "30777", sqcand: "160002542346", nmu: "ANDRÉ SANTOS", st: "Suplente", e: "n", dvt: "Válido", vap: "9481" },
      { n: "30123", sqcand: "1", nmu: "ELEITO", st: "Eleito por QP", e: "s", dvt: "Válido", vap: "80000" },
    ] }] },
    { nm: "FEDERAÇÃO X", tp: "f", com: "PT / PV", vag: "8", par: [
      { n: "13", dvt: "Válido (legenda)", sg: "PT", tvtn: "500", tvtl: "50", cand: [{ n: "13000", sqcand: "2", nmu: "FULANO", st: "Não eleito", e: "n", dvt: "Anulado sub judice", vap: "120" }] },
      { n: "43", dvt: "Anulado sub judice", sg: "PV", tvtn: "100", tvtl: "10", cand: [] },
    ] },
  ] }],
};

test("parseOficial: cargo, agremiações e candidatos", () => {
  const r = parseOficial(json);
  assert.equal(r.geradoEm, "04/10/2026 23:59:59");
  assert.deepEqual(r.cargo, { vagas: 54, qe: 114449, validos: 1000, nominais: 900, legenda: 100, brancos: 40, nulos: 20 });
  assert.deepEqual(r.agremiacoes[0], { nm: "PARTIDO NOVO", rotulo: "NOVO", federacao: false, siglas: ["NOVO"], vagas: 3, nominais: 371998, legenda: 35192 });
  assert.deepEqual(r.agremiacoes[1], { nm: "FEDERAÇÃO X", rotulo: "PT / PV", federacao: true, siglas: ["PT", "PV"], vagas: 8, nominais: 600, legenda: 60 });
  assert.deepEqual(r.candidatos.map((c) => c.n), ["30123", "30777", "13000"]);
  const andre = r.candidatos[1];
  assert.deepEqual(andre, { n: "30777", sq: "160002542346", nm: "ANDRÉ SANTOS", sg: "NOVO", fed: null, st: "Suplente", eleito: false, valido: true, votos: 9481 });
  assert.equal(r.candidatos[2].fed, "FEDERAÇÃO X");
  assert.equal(r.candidatos[2].valido, false);
  assert.deepEqual(r.legendasValidas, ["30", "13"]);
});

test("parseOficial sem cargo: erro claro", () => {
  assert.throws(() => parseOficial({}), /sem cargo/);
});

test("parseMunicipiosCfg: só PR, com código IBGE", () => {
  const cfg = { abr: [{ cd: "SC", mu: [{ cd: "1", cdi: "2", nm: "X" }] }, { cd: "PR", mu: [{ cd: "75353", cdi: "4106902", nm: "CURITIBA", c: "s", z: ["1"] }] }] };
  assert.deepEqual(parseMunicipiosCfg(cfg), [{ cd: "75353", ibge: "4106902", nm: "CURITIBA" }]);
  assert.throws(() => parseMunicipiosCfg({ abr: [] }), /PR não encontrada/);
});
