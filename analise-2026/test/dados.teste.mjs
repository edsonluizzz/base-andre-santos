import test from "node:test";
import assert from "node:assert/strict";
import { chapa, comparaveis, escolherB, indexar, percentuais, porBairro, porRegiao, posicaoGeral, serie } from "../public/js/dados.mjs";
import { dadosMini } from "./fx.mjs";

const D = indexar(dadosMini());
const andre = D.porNumero.get("30777");

test("índices", () => {
  assert.equal(andre.nm, "ANDRÉ SANTOS");
  assert.equal(D.munPorIbge.get("4106902"), 0);
});

test("séries e percentuais", () => {
  assert.deepEqual([...serie(andre, "mun")], [[0, 30], [2, 20]]);
  assert.deepEqual([...serie(D.porNumero.get("55555"), "loc")], []);
  assert.deepEqual([...percentuais(D, andre, "mun")], [[0, 30 / 600], [2, 20 / 100]]);
  assert.deepEqual([...percentuais(D, andre, "loc")], [[0, 20 / 300], [3, 20 / 80], [1, 10 / 200]]);
});

test("chapa, posição geral e comparáveis", () => {
  assert.deepEqual(chapa(D, "NOVO").map((c) => c.n), ["30123", "30777", "30300"]);
  assert.equal(posicaoGeral(D, "30777"), 3);
  assert.deepEqual(comparaveis(D).map((c) => c.n), ["30123", "30300", "10456", "22622"]);
});

test("escolherB cai no padrão quando o pedido não serve", () => {
  assert.equal(escolherB(D, "10456").n, "10456");
  assert.equal(escolherB(D, "30777").n, "30300");
  assert.equal(escolherB(D, "55555").n, "30300");
  assert.equal(escolherB(D, "00000").n, "30300");
  assert.equal(escolherB(D, undefined).n, "30300");
});

test("região e bairro", () => {
  assert.deepEqual(porRegiao(D, andre), { Curitiba: 30, RMC: 0, Litoral: 20, Interior: 0 });
  assert.deepEqual(porBairro(D, andre), [{ bairro: "CENTRO", votos: 20, total: 300 }, { bairro: "CAJURU", votos: 10, total: 200 }]);
});
