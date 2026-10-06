import test from "node:test";
import assert from "node:assert/strict";
import { montarDados } from "../coletar/montar.mjs";

const entrada = () => ({
  oficial: {
    geradoEm: "x",
    cargo: { vagas: 54, qe: 100, validos: 18, nominais: 15, legenda: 3, brancos: 0, nulos: 0 },
    agremiacoes: [{ nm: "PARTIDO NOVO", rotulo: "NOVO", federacao: false, siglas: ["NOVO"], vagas: 1, nominais: 7, legenda: 0 }],
    candidatos: [
      { n: "30777", sq: "1", nm: "ANDRÉ SANTOS", sg: "NOVO", fed: null, st: "Suplente", eleito: false, valido: true, votos: 7 },
      { n: "10456", sq: "2", nm: "MARA", sg: "REPUBLICANOS", fed: null, st: "Suplente", eleito: false, valido: true, votos: 5 },
      { n: "55555", sq: "3", nm: "OUTRO", sg: "PSD", fed: null, st: "Eleito", eleito: true, valido: true, votos: 3 },
    ],
  },
  municipios: [{ cd: "75353", ibge: "4106902", nm: "CURITIBA" }, { cd: "74934", ibge: "4108304", nm: "FOZ DO IGUAÇU" }],
  agregado: {
    votosMun: new Map([["30777", new Map([["74934", 2], ["75353", 5]])], ["10456", new Map([["75353", 5]])], ["55555", new Map([["74934", 3]])]]),
    votosLocal: new Map([["30777", new Map([["74934-2-20", 2], ["75353-1-10", 5]])], ["10456", new Map([["75353-1-10", 5]])]]),
    totalLocal: new Map([["75353-1-10", 10], ["74934-2-20", 5]]),
    validosMun: new Map([["75353", 12], ["74934", 6]]),
  },
  locais: new Map([["75353-1-10", { nm: "ESCOLA A", bairro: "CENTRO", lat: -25.4312345678, lon: -49.2, aptos: 300 }]]),
  contas: { receitas: new Map([["1", { total: 100.254, porOrigem: { FEFC: 100.254 } }]]), despesas: new Map([["1", 50]]) },
  focoLocal: new Set(["30777", "10456"]),
  meta: { geradoEm: "agora" },
});

test("monta municípios, locais e candidatos esparsos", () => {
  const d = montarDados(entrada());
  assert.equal(d.meta.geradoEm, "agora");
  assert.deepEqual(d.municipios, [
    { cd: "75353", ibge: "4106902", nm: "CURITIBA", regiao: "Curitiba", validos: 12 },
    { cd: "74934", ibge: "4108304", nm: "FOZ DO IGUAÇU", regiao: "Interior", validos: 6 },
  ]);
  assert.deepEqual(d.locais.map((l) => l.id), ["74934-2-20", "75353-1-10"]);
  assert.deepEqual(d.locais[0], { id: "74934-2-20", mun: 1, nm: "Local 74934-2-20", bairro: null, lat: null, lon: null, aptos: 0, total: 5 });
  assert.deepEqual(d.locais[1], { id: "75353-1-10", mun: 0, nm: "ESCOLA A", bairro: "CENTRO", lat: -25.43123, lon: -49.2, aptos: 300, total: 10 });
  const [andre, mara, outro] = d.candidatos;
  assert.deepEqual(andre.mun, [[0, 5], [1, 2]]);
  assert.deepEqual(andre.loc, [[1, 5], [0, 2]]);
  assert.equal(andre.receita, 100.25);
  assert.equal(andre.despesa, 50);
  assert.deepEqual(andre.receitaPorOrigem, { FEFC: 100.25 });
  assert.equal(mara.receita, null);
  assert.equal(mara.despesa, null);
  assert.equal(mara.receitaPorOrigem, null);
  assert.deepEqual(mara.loc, [[1, 5]]);
  assert.equal(outro.loc, null);
  assert.equal("valido" in andre, false);
});

test("município da votação fora da lista do TSE: erro com o código", () => {
  const e = entrada();
  e.agregado.votosMun.get("55555").set("99999", 1);
  assert.throws(() => montarDados(e), /Município 99999/);
});

