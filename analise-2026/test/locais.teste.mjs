import test from "node:test";
import assert from "node:assert/strict";
import { criarLeitorLocais } from "../coletar/locais.mjs";

test("soma eleitores das seções e converte coordenadas", () => {
  const l = criarLeitorLocais();
  l.adicionar({ mun: "75353", zona: "3", local: "1155", nome: "ESCOLA ESTADUAL SANTA ROSA", bairro: "CAJURU", lat: "-25,4759288", lon: "-49,1950276", eleitores: "378" });
  l.adicionar({ mun: "75353", zona: "003", local: "1155", nome: "ESCOLA ESTADUAL SANTA ROSA", bairro: "CAJURU", lat: "-25,4759288", lon: "-49,1950276", eleitores: "300" });
  l.adicionar({ mun: "75353", zona: "4", local: "9", nome: "X", bairro: "#NULO#", lat: "-1", lon: "", eleitores: "10" });
  const r = l.resultado();
  assert.deepEqual(r.get("75353-3-1155"), { nm: "ESCOLA ESTADUAL SANTA ROSA", bairro: "CAJURU", lat: -25.4759288, lon: -49.1950276, aptos: 678 });
  assert.deepEqual(r.get("75353-4-9"), { nm: "X", bairro: null, lat: null, lon: null, aptos: 10 });
});
