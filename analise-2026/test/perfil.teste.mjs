import test from "node:test";
import assert from "node:assert/strict";
import { PERFIL_CATS, posCat } from "../public/js/config.mjs";
import { destaques, distancia, fracoes, indexarPerfil, lugaresParecidos, perfilDosVotos } from "../public/js/perfil.mjs";

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

test("distância: perfis iguais = 0; diferença medida em desvios-padrão", () => {
  assert.equal(distancia([0.5, 0.5], [0.5, 0.5], [0.1, 0.1]), 0);
  assert.ok(Math.abs(distancia([0.6, 0.4], [0.5, 0.5], [0.1, 0.1]) - 1) < 1e-12);
});

test("lugares parecidos: perfil dos melhores locais e, abaixo da média, os mais parecidos primeiro", () => {
  // candidato forte onde há muitas mulheres; fraco nos demais
  const locais = [], loc = [], perfis = {};
  const add = (f, votos) => {
    const j = locais.length, id = `1-1-${j}`;
    locais.push({ id, mun: 0, bairro: `B${j}`, total: 1000 });
    perfis[id] = vet(1000, { f: f * 1000, m: (1 - f) * 1000, i35: 1000, e3: 1000 });
    if (votos) loc.push([j, votos]);
  };
  add(0.8, 100); add(0.75, 90);   // fortes (10% e 9%)
  add(0.78, 5);                    // fraco e parecido com os fortes
  add(0.3, 2);                     // fraco e diferente
  add(0.7, 0);                     // sem voto, parecido
  add(0.5, 60);                    // acima da média, não entra como "parecido"
  const D = { locais, municipios: [{ cd: "1" }] };
  const r = lugaresParecidos(D, { loc }, indexarPerfil({ locais: perfis }), { fortes: 2 });
  assert.deepEqual(r.fortes.map((x) => x.j), [0, 1]);
  assert.ok(Math.abs(r.media - 257 / 6000) < 1e-12);
  assert.ok(Math.abs(r.perfil[posCat("f") - 1] - (0.8 * 100 + 0.75 * 90) / 190) < 1e-12);
  assert.deepEqual(r.parecidos.map((x) => x.j), [2, 4, 3]);
});

test("destaques: categorias mais distantes da média, ignorando diferenças pequenas", () => {
  const base = PERFIL_CATS.map(() => 0.2), fr = PERFIL_CATS.map(() => 0.2);
  fr[posCat("e4") - 1] = 0.3; fr[posCat("i60") - 1] = 0.15; fr[posCat("f") - 1] = 0.205;
  assert.deepEqual(destaques(fr, base).map((x) => [x.id, Math.round(x.indice)]), [["e4", 150], ["i60", 75]]);
});
