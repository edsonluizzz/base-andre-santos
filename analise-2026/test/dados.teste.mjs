import test from "node:test";
import assert from "node:assert/strict";
import { buscarCandidato, chapa, comparaveis, coresDe, escolherB, garantirLocais, indexar, lerComparados, nomeCurto, sugerirConcorrentes, percentuais, porBairro, porRegiao, posicaoGeral, serie } from "../public/js/dados.mjs";
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
  assert.deepEqual(chapa(D, andre).map((c) => c.n), ["30123", "30777", "30300"]);
  assert.equal(posicaoGeral(D, "30777"), 3);
  assert.deepEqual(comparaveis(D, andre).map((c) => c.n), ["55555", "30123", "30300", "10456", "22622"]);
});

test("escolherB: pedido, senão o 1º comparado, senão o mais votado", () => {
  const fabio = D.porNumero.get("30300");
  assert.equal(escolherB(D, andre, [fabio], "10456").n, "10456");
  assert.equal(escolherB(D, andre, [fabio], "30777").n, "30300");
  assert.equal(escolherB(D, andre, [fabio], undefined).n, "30300");
  assert.equal(escolherB(D, andre, [], "00000").n, "55555");
});

test("nome curto e busca de candidato", () => {
  assert.equal(nomeCurto(andre), "André Santos");
  assert.equal(nomeCurto({ nm: "JOÃO DA SILVA" }), "João da Silva");
  assert.equal(buscarCandidato(D, "30777").n, "30777");
  assert.equal(buscarCandidato(D, "ANDRÉ SANTOS · 30777 · NOVO").n, "30777");
  assert.equal(buscarCandidato(D, "andre santos").n, "30777");
  assert.equal(buscarCandidato(D, "mara").n, "10456");
  assert.equal(buscarCandidato(D, "o"), null); // vários
  assert.equal(buscarCandidato(D, ""), null);
});

test("comparados: da URL, sugeridos ou nenhum", () => {
  assert.deepEqual(lerComparados(D, andre, "10456,30777,xx,10456").map((c) => c.n), ["10456"]);
  assert.deepEqual(lerComparados(D, andre, "-"), []);
  assert.deepEqual(lerComparados(D, andre, "55555,30123,30300,10456").map((c) => c.n), ["55555", "30123", "30300"]);
  const sug = sugerirConcorrentes(D, andre).map((c) => c.n);
  assert.equal(sug.length, 3);
  assert.ok(!sug.includes("30777") && !sug.includes("22622")); // ele mesmo e quem tem menos de ¼ dos votos ficam fora
  assert.deepEqual(lerComparados(D, andre, undefined).map((c) => c.n), sug);
  assert.deepEqual([...coresDe(andre, [D.porNumero.get("10456")])], [["30777", "var(--laranja)"], ["10456", "var(--azul)"]]);
});

test("garantirLocais busca só quem falta e só quem teve voto", async () => {
  const E = indexar(dadosMini());
  for (const c of E.candidatos) c.loc = undefined;
  E.cargo.id = "estadual";
  const pedidos = [];
  await garantirLocais(E, ["30777", "22622", "nao-existe", "30777"], async (u) => { pedidos.push(u); return [[0, 1]]; });
  assert.deepEqual(pedidos, ["dados/estadual/30777.json"]);
  assert.deepEqual(E.porNumero.get("30777").loc, [[0, 1]]);
  assert.deepEqual(E.porNumero.get("22622").loc, []);
});

test("região e bairro", () => {
  assert.deepEqual(porRegiao(D, andre), { Curitiba: 30, RMC: 0, Litoral: 20, Interior: 0 });
  assert.deepEqual(porBairro(D, andre), [{ bairro: "CENTRO", votos: 20, total: 300 }, { bairro: "CAJURU", votos: 10, total: 200 }]);
});

import { acharMunicipio, idxMunicipio, lerSelecao, locaisDoMunicipio, rankingNoMunicipio, restringir } from "../public/js/dados.mjs";

test("acharMunicipio: nome exato sem acento ou prefixo único", () => {
  assert.equal(acharMunicipio(D, "paranagua"), 2);
  assert.equal(acharMunicipio(D, "São José"), 1);
  assert.equal(acharMunicipio(D, "CURITIBA"), 0);
  assert.equal(acharMunicipio(D, "xyz"), null);
  assert.equal(acharMunicipio(D, "  "), null);
});

test("idxMunicipio pelo código TSE da URL", () => {
  assert.equal(idxMunicipio(D, "77771"), 2);
  assert.equal(idxMunicipio(D, "0"), null);
  assert.equal(idxMunicipio(D, undefined), null);
});

test("locais e ranking de um município", () => {
  assert.deepEqual(locaisDoMunicipio(D, 0), [0, 1]);
  assert.deepEqual(locaisDoMunicipio(D, 9), []);
  assert.deepEqual(rankingNoMunicipio(D, 0).map((x) => [x.c.n, x.v]), [["55555", 200], ["30123", 60], ["30300", 40], ["30777", 30]]);
});

test("lerSelecao: só opções válidas, na ordem das opções; vazio = todas", () => {
  const ops = ["30777", "30300", "10456", "22622"];
  assert.deepEqual(lerSelecao("10456,30777", ops), ["30777", "10456"]);
  assert.deepEqual(lerSelecao("xx", ops), ops);
  assert.deepEqual(lerSelecao(undefined, ops), ops);
});

test("restringir mantém só as chaves pedidas", () => {
  assert.deepEqual([...restringir(new Map([[0, 1], [1, 2], [3, 4]]), new Set([1, 3]))], [[1, 2], [3, 4]]);
  assert.deepEqual([...restringir(new Map([[0, 1]]), null)], [[0, 1]]);
});
