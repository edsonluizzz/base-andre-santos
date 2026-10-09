import test from "node:test";
import assert from "node:assert/strict";
import { garantirLocais, indexar, ondeLocal, porRegiao, unidade } from "../public/js/dados.mjs";
import { disputa } from "../public/js/telas/panorama.mjs";
import { estaLiberado } from "../public/js/oferta.mjs";
import { dadosMini } from "./fx.mjs";

// Eleição municipal em miniatura: a lista "municipios" são os bairros da cidade.
const municipal = () => {
  const d = dadosMini();
  d.cargo = { ...d.cargo, id: "vereador-2024", nome: "Vereador", ano: 2024, escopo: "municipio", majoritario: false, municipio: { cd: "75353", nm: "CURITIBA", ibge: "4106902" } };
  d.municipios = d.municipios.map((m) => ({ ...m, ibge: null, regiao: null }));
  for (const c of d.candidatos) c.loc = undefined;
  return indexar(d);
};

test("unidade: municípios no estado, bairros na cidade", () => {
  assert.equal(unidade(indexar(dadosMini())).uns, "municípios");
  const U = unidade(municipal());
  assert.deepEqual([U.municipal, U.um, U.uns, U.area, U.naArea, U.ano], [true, "bairro", "bairros", "Curitiba", "em Curitiba", 2024]);
});

test("nas municipais não há regiões e o local mostra só o bairro", () => {
  const D = municipal();
  assert.deepEqual(porRegiao(D, D.candidatos[0]), {});
  assert.equal(ondeLocal(D, D.locais[0]), "CENTRO");
  assert.equal(ondeLocal(indexar(dadosMini()), indexar(dadosMini()).locais[0]), "CENTRO · CURITIBA");
});

test("municipais: votos por local da cidade inteira num arquivo só", async () => {
  const D = municipal();
  const pedidos = [];
  await garantirLocais(D, ["30777"], async (u) => { pedidos.push(u); return { 30777: [[0, 5]], 30300: [[1, 2]] }; });
  await garantirLocais(D, ["30300"], async (u) => { pedidos.push(u); return {}; });
  assert.deepEqual(pedidos, ["dados/2024/vereador/75353/loc.json"]); // segunda chamada não busca de novo
  assert.deepEqual(D.porNumero.get("30777").loc, [[0, 5]]);
  assert.deepEqual(D.porNumero.get("30300").loc, [[1, 2]]);
  assert.deepEqual(D.porNumero.get("55555").loc, []);
});

test("majoritário: posição e distâncias", () => {
  const D = municipal();
  const x = disputa(D, D.porNumero.get("30300"));
  assert.equal(x.pos, 4);
  assert.equal(x.faltaPrimeiro, 160);
  assert.equal(x.faltaAcima, 10);
});

test("liberação municipal usa cidade-número", () => {
  const acesso = { todos: false, liberados: ["vereador-2024:75353-30300"] };
  assert.equal(estaLiberado(acesso, "vereador-2024", "75353-30300"), true);
  assert.equal(estaLiberado(acesso, "vereador-2024", "76678-30300"), false); // mesmo número, outra cidade
});
