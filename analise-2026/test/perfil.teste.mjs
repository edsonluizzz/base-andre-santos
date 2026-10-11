import test from "node:test";
import assert from "node:assert/strict";
import { PERFIL_CATS, posCat } from "../public/js/config.mjs";
import { ajustarModelo, fracoes, indexarPerfil, perfilDosVotos, porUnidade, resolver, volatilidade } from "../public/js/perfil.mjs";

const TAM = 1 + PERFIL_CATS.length;
// vetor de um local: aptos e as contagens pedidas ({ f: 30, m: 70, … })
function vet(aptos, cont) {
  const v = new Array(TAM).fill(0);
  v[0] = aptos;
  for (const [k, q] of Object.entries(cont)) v[posCat(k)] = q;
  return v;
}

test("frações somam 1 dentro de cada dimensão; dimensão vazia fica null", () => {
  const f = fracoes(vet(100, { f: 30, m: 70, i16: 50, i60: 50 }));
  assert.equal(f[posCat("f") - 1], 0.3);
  assert.equal(f[posCat("m") - 1], 0.7);
  assert.equal(f[posCat("i16") - 1], 0.5);
  assert.equal(f[posCat("i25") - 1], 0);
  assert.equal(f[posCat("e1") - 1], null);
});

test("indexarPerfil soma por município e no estado", () => {
  const PI = indexarPerfil({ locais: { "75353-1-1": vet(10, { f: 4, m: 6 }), "75353-2-5": vet(20, { f: 10, m: 10 }), "74128-9-1": vet(5, { f: 5 }) } });
  assert.equal(PI.porLocal.get("75353-2-5")[0], 20);
  assert.deepEqual(PI.porMun.get("75353").slice(0, 3), [30, 14, 16]);
  assert.deepEqual(PI.total.slice(0, 3), [35, 19, 16]);
});

// Três locais, candidato forte onde há mais mulheres.
function cenario() {
  const D = {
    locais: [
      { id: "1-1-1", mun: 0, bairro: "A", total: 100 },
      { id: "1-1-2", mun: 0, bairro: "B", total: 100 },
      { id: "2-1-1", mun: 1, bairro: "C", total: 200 },
      { id: "2-1-9", mun: 1, bairro: "C", total: 50 }, // sem perfil
    ],
    municipios: [{ cd: "1" }, { cd: "2" }],
  };
  const PI = indexarPerfil({ locais: {
    "1-1-1": vet(100, { f: 80, m: 20 }),
    "1-1-2": vet(100, { f: 50, m: 50 }),
    "2-1-1": vet(200, { f: 40, m: 160 }),
  } });
  return { D, PI };
}

test("perfil dos votos pondera cada local pelos votos do candidato", () => {
  const { D, PI } = cenario();
  const c = { loc: [[0, 30], [1, 10], [2, 0], [3, 7]] };
  const r = perfilDosVotos(D, c, PI);
  assert.equal(r.votos, 40); // o local sem perfil fica de fora
  assert.equal(r.semPerfil, 7);
  assert.ok(Math.abs(r.fr[posCat("f") - 1] - (30 * 0.8 + 10 * 0.5) / 40) < 1e-12);
});

test("resolver acha a solução de um sistema linear", () => {
  const x = resolver([[2, 1], [1, 3]], [5, 10]);
  assert.ok(Math.abs(x[0] - 1) < 1e-9 && Math.abs(x[1] - 3) < 1e-9);
});

test("modelo recupera uma relação exata e aponta o espaço para crescer", () => {
  // % do candidato = 0,02 + 0,1 × (fração de mulheres), exatamente; idade e escolaridade constantes
  const locais = [], loc = [], perfis = {};
  const fem = [0.2, 0.35, 0.5, 0.65, 0.8, 0.3, 0.7, 0.45];
  fem.forEach((f, j) => {
    const id = `9-1-${j + 1}`, total = 1000;
    locais.push({ id, mun: j % 2, bairro: null, total });
    perfis[id] = vet(1000, { f: f * 1000, m: (1 - f) * 1000, i35: 1000, e3: 1000 });
    loc.push([j, Math.round(total * (0.02 + 0.1 * f) * 1000) / 1000]);
  });
  const D = { locais, municipios: [{ cd: "9" }, { cd: "8" }] };
  const m = ajustarModelo(D, { loc }, indexarPerfil({ locais: perfis }), { minLocais: 5 });
  assert.equal(m.n, fem.length);
  assert.ok(m.r2 > 0.999, `r2 = ${m.r2}`);
  const j = 4;
  assert.ok(Math.abs(m.esperado.get(j) - loc[j][1]) < 0.01);
  const porMun = porUnidade(D, m.esperado);
  assert.ok(Math.abs(porMun.get(0) - [0, 2, 4, 6].reduce((s, k) => s + loc[k][1], 0)) < 0.05);
});

test("modelo compara dentro do município: nível da cidade e cidade sem voto não viram 'espaço'", () => {
  // cidade 0: % = 0,01 + 0,1·f; cidade 1: mesmo efeito, nível 5× maior; cidade 2: mesmo perfil, candidato sem voto
  const locais = [], loc = [], perfis = {};
  const fem = [0.2, 0.4, 0.6, 0.8];
  [[0, 0.01], [1, 0.05], [2, null]].forEach(([mun, a]) => fem.forEach((f, k) => {
    const j = locais.length, id = `${mun}-1-${k}`;
    locais.push({ id, mun, total: 1000 });
    perfis[id] = vet(1000, { f: f * 1000, m: (1 - f) * 1000, i35: 1000, e3: 1000 });
    if (a != null) loc.push([j, 1000 * (a + 0.1 * f)]);
  }));
  const D = { locais, municipios: [{ cd: "0" }, { cd: "1" }, { cd: "2" }] };
  const m = ajustarModelo(D, { loc }, indexarPerfil({ locais: perfis }), { minLocais: 5 });
  assert.ok(m.r2 > 0.999, `r2 = ${m.r2}`);
  assert.equal(m.unidades, 2);
  assert.ok(Math.abs(m.coef[m.vars.indexOf("f")] - 0.1) < 1e-6);
  assert.equal([...m.esperado.keys()].some((j) => locais[j].mun === 2), false);
  for (const [j, v] of loc) assert.ok(Math.abs(m.esperado.get(j) - v) < 1e-6);
});

test("modelo com poucos locais não ajusta", () => {
  const { D, PI } = cenario();
  assert.equal(ajustarModelo(D, { loc: [[0, 30], [1, 10], [2, 5]] }, PI, { minLocais: 5 }), null);
});

test("volatilidade = metade da soma das variações de participação dos partidos", () => {
  const D = { municipios: [{ cd: "1" }, { cd: "2" }], candidatos: [
    { sg: "AA", mun: [[0, 60], [1, 50]] }, { sg: "BB", mun: [[0, 40], [1, 50]] }] };
  const O = { municipios: [{ cd: "2" }, { cd: "1" }], candidatos: [
    { sg: "AA", mun: [[1, 40], [0, 50]] }, { sg: "CC", mun: [[1, 60], [0, 50]] }] };
  const v = volatilidade(D, O);
  assert.ok(Math.abs(v.porMun.get(0) - 0.6) < 1e-12); // AA 0,6→0,4; BB 0,4→0; CC 0→0,6 → (0,2+0,4+0,6)/2
  assert.ok(Math.abs(v.porMun.get(1) - 0.5) < 1e-12);  // AA 0,5→0,5; BB 0,5→0; CC 0→0,5
  assert.ok(Math.abs(v.estado - 0.55) < 1e-12);
});
