import test from "node:test";
import assert from "node:assert/strict";
import { classificarVotavel, criarAgregador, idLocal } from "../coletar/agregar.mjs";

test("idLocal normaliza zeros à esquerda", () => {
  assert.equal(idLocal("75353", "0003", "01155"), "75353-3-1155");
});

test("classificarVotavel", () => {
  const validos = new Set(["30777"]);
  const legendas = new Set(["30"]);
  assert.equal(classificarVotavel("30777", validos, legendas), "nominal");
  assert.equal(classificarVotavel("12345", validos, legendas), "anulado");
  assert.equal(classificarVotavel("30", validos, legendas), "legenda");
  assert.equal(classificarVotavel("29", validos, legendas), "descartado"); // legenda de partido anulado
  for (const nr of ["95", "96", "97"]) assert.equal(classificarVotavel(nr, validos, legendas), "descartado");
});

test("agregador: município, local, válidos e anulados", () => {
  const ag = criarAgregador({ validos: new Set(["30777", "10456"]), legendas: new Set(["30"]), focoLocal: new Set(["30777"]) });
  const s = (mun, zona, local, votavel, votos) => ag.adicionar({ mun, zona, local, votavel, votos });
  s("75353", "3", "1155", "30777", 4);
  s("75353", "3", "1155", "30777", 1); // outra seção do mesmo local
  s("75353", "3", "1155", "10456", 2);
  s("75353", "4", "1392", "30777", 3);
  s("75353", "4", "1392", "30", 5);     // legenda
  s("75353", "4", "1392", "95", 7);     // branco
  s("75353", "4", "1392", "29", 9);     // legenda de partido anulado
  s("78255", "59", "1244", "12345", 6); // anulado sub judice
  const r = ag.resultado();
  assert.deepEqual([...r.votosMun.get("30777")], [["75353", 8]]);
  assert.deepEqual([...r.votosMun.get("12345")], [["78255", 6]]);
  assert.deepEqual([...r.votosLocal.get("30777")], [["75353-3-1155", 5], ["75353-4-1392", 3]]);
  assert.equal(r.votosLocal.has("10456"), false); // fora do foco
  assert.deepEqual([...r.totalLocal], [["75353-3-1155", 7], ["75353-4-1392", 3]]);
  assert.deepEqual([...r.validosMun], [["75353", 15]]); // 8 + 2 + 5; anulado e branco fora
});
