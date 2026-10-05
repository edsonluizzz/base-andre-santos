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

test("seção que mudou de local: o número original vira apelido; local atual tem prioridade", () => {
  const l = criarLeitorLocais();
  // a votação por seção usa o número original (1015); o cadastro já traz o local novo (1090)
  l.adicionar({ mun: "79774", zona: "97", local: "1090", nome: "CMEI NOVO", bairro: "CENTRO", lat: "-24,06", lon: "-52,1", eleitores: "300",
    localOriginal: "1015", nomeOriginal: "COLEGIO ESTADUAL VICENTE TOMAZINI" });
  // 1200 aparece primeiro como original e depois como local atual de outra seção
  l.adicionar({ mun: "79774", zona: "97", local: "1300", nome: "OUTRO", bairro: "B", lat: "-24,1", lon: "-52,2", eleitores: "5",
    localOriginal: "1200", nomeOriginal: "ANTIGO" });
  l.adicionar({ mun: "79774", zona: "97", local: "1200", nome: "ATUAL", bairro: "C", lat: "-24,2", lon: "-52,3", eleitores: "7",
    localOriginal: "1200", nomeOriginal: "ATUAL" });
  const r = l.resultado();
  assert.deepEqual(r.get("79774-97-1015"), { nm: "COLEGIO ESTADUAL VICENTE TOMAZINI", bairro: "CENTRO", lat: -24.06, lon: -52.1, aptos: 300 });
  assert.equal(r.get("79774-97-1090").nm, "CMEI NOVO");
  assert.deepEqual(r.get("79774-97-1200"), { nm: "ATUAL", bairro: "C", lat: -24.2, lon: -52.3, aptos: 7 });
});
