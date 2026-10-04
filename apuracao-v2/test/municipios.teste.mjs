import test from "node:test";
import assert from "node:assert/strict";
import {
  parseListaMunicipios, parseAndamento, parseMunicipio, emLotes, coletarMunicipios, resumirMunicipios,
} from "../lib/municipios.mjs";
import { fx } from "./fx.mjs";

test("lista dos 399 municípios do PR", () => {
  const lista = parseListaMunicipios(fx("municipios-pr.json"));
  assert.equal(lista.length, 399);
  assert.deepEqual(lista.find((m) => m.cd === "75353"), { cd: "75353", nome: "CURITIBA" });
  assert.throws(() => parseListaMunicipios({ abr: [] }), /não encontrada/);
});

test("andamento por município", () => {
  const a = parseAndamento(fx("andamento.json"));
  assert.equal(a.size, 399);
  assert.equal(a.get("75353"), 0);
});

test("votos do candidato num arquivo municipal", () => {
  assert.deepEqual(parseMunicipio(fx("mun-curitiba.json"), "30777"), { votos: 0, validos: 0 });
  assert.deepEqual(parseMunicipio(fx("mun-curitiba.json"), "00000"), { votos: 0, validos: 0 });
  const comVoto = { v: { vv: "1000" }, carg: [{ agr: [{ par: [{ cand: [{ n: "30777", vap: "42" }] }] }] }] };
  assert.deepEqual(parseMunicipio(comVoto, "30777"), { votos: 42, validos: 1000 });
});

test("emLotes respeita o limite e isola erros", async () => {
  let ativos = 0;
  let pico = 0;
  const r = await emLotes([1, 2, 3, 4, 5, 6, 7], 3, async (x) => {
    ativos++;
    pico = Math.max(pico, ativos);
    await new Promise((ok) => setTimeout(ok, 5));
    ativos--;
    if (x === 4) throw new Error("falhou");
    return x * 2;
  });
  assert.ok(pico <= 3, `pico ${pico}`);
  assert.deepEqual(r[0], { ok: true, valor: 2 });
  assert.equal(r[3].ok, false);
  assert.deepEqual(r[6], { ok: true, valor: 14 });
  assert.deepEqual(await emLotes([], 3, async () => 1), []);
});

const lista = [{ cd: "1", nome: "ALFA" }, { cd: "2", nome: "BETA" }, { cd: "3", nome: "GAMA" }];
const arquivo = (votos, validos) => ({ v: { vv: String(validos) }, carg: [{ agr: [{ par: [{ cand: [{ n: "30777", vap: String(votos) }] }] }] }] });
const andamento = { abr: [{ tpabr: "mun", cdabr: "1", s: { pst: "50,00" } }, { tpabr: "mun", cdabr: "2", s: { pst: "100,00" } }, { tpabr: "uf", cdabr: "pr", s: { pst: "70,00" } }] };

test("coleta ordena por votos e calcula percentuais", async () => {
  const dados = { 1: arquivo(10, 1000), 2: arquivo(300, 6000), 3: arquivo(0, 500) };
  const m = await coletarMunicipios({
    lista, agora: 7,
    baixarAndamento: async () => andamento,
    baixarMunicipio: async (cd) => dados[cd],
  });
  assert.equal(m.atualizadoEm, 7);
  assert.equal(m.total, 3);
  assert.equal(m.comVotos, 2);
  assert.equal(m.falhas, 0);
  assert.deepEqual(m.lista.map((x) => x.nome), ["BETA", "ALFA", "GAMA"]);
  assert.deepEqual(m.lista[0], { cd: "2", nome: "BETA", votos: 300, validos: 6000, pctValidos: 5, secoesPct: 100 });
  assert.equal(m.lista[2].secoesPct, 0);
  assert.equal(m.lista[2].pctValidos, 0);
});

test("município que falha mantém o valor anterior", async () => {
  const anterior = await coletarMunicipios({
    lista, agora: 1,
    baixarAndamento: async () => andamento,
    baixarMunicipio: async () => arquivo(50, 1000),
  });
  const m = await coletarMunicipios({
    lista, agora: 2, anterior,
    baixarAndamento: async () => { throw new Error("fora"); },
    baixarMunicipio: async (cd) => { if (cd === "2") throw new Error("fora"); return arquivo(80, 1000); },
  });
  assert.equal(m.falhas, 1);
  assert.equal(m.lista.find((x) => x.cd === "2").votos, 50);
  assert.equal(m.lista.find((x) => x.cd === "1").votos, 80);
  assert.equal(m.lista.find((x) => x.cd === "1").secoesPct, 50); // andamento falhou: mantém
});

test("resumo leva só os N primeiros para a tela", () => {
  const cheio = { atualizadoEm: 1, comVotos: 20, total: 30, falhas: 0, lista: Array.from({ length: 30 }, (_, i) => ({ cd: String(i) })) };
  const r = resumirMunicipios(cheio, 15);
  assert.equal(r.lista.length, 15);
  assert.equal(r.total, 30);
  assert.equal(resumirMunicipios(null), null);
});

test("V2: resumo leva 30 municípios por padrão", () => {
  const cheio = { atualizadoEm: 1, comVotos: 40, total: 40, falhas: 0, lista: Array.from({ length: 40 }, (_, i) => ({ cd: String(i) })) };
  assert.equal(resumirMunicipios(cheio).lista.length, 30);
});
