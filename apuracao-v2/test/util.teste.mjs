import test from "node:test";
import assert from "node:assert/strict";
import { fmtInt, fmtPct, fmtDelta, fmtPos, semContato, selecionarChapa, pontosSparkline, areaSparkline } from "../public/util.mjs";

test("formatação pt-BR", () => {
  assert.equal(fmtInt(38412), "38.412");
  assert.equal(fmtInt(0), "0");
  assert.equal(fmtInt(undefined), "0");
  assert.equal(fmtPct(63.4), "63,40");
  assert.equal(fmtPct(null), "0,00");
  assert.equal(fmtDelta(1207), "▲ +1.207");
  assert.equal(fmtDelta(0), "");
  assert.equal(fmtDelta(-5), "▼ -5");
});

const cands = Array.from({ length: 20 }, (_, i) => ({ n: String(i + 1), votos: 100 - i }));

test("selecionarChapa: topo simples quando o fixo já está dentro", () => {
  assert.deepEqual(selecionarChapa(cands, 10, "3").map((c) => c.n), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
});

test("selecionarChapa: fixo fora do topo entra na última linha", () => {
  const r = selecionarChapa(cands, 10, "17").map((c) => c.n);
  assert.equal(r.length, 10);
  assert.deepEqual(r.slice(0, 9), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  assert.equal(r[9], "17");
});

test("selecionarChapa: sem fixo ou fixo inexistente devolve o topo", () => {
  assert.equal(selecionarChapa(cands, 8, null).length, 8);
  assert.equal(selecionarChapa(cands, 8, "999").at(-1).n, "8");
  assert.deepEqual(selecionarChapa([], 8, "1"), []);
});

test("pontosSparkline", () => {
  assert.equal(pontosSparkline([], 100, 40), "");
  assert.equal(pontosSparkline([{ t: 0, votos: 5 }], 100, 40), "");
  assert.equal(
    pontosSparkline([{ t: 0, votos: 0 }, { t: 10, votos: 50 }, { t: 20, votos: 100 }], 100, 40),
    "0.0,40.0 50.0,20.0 100.0,0.0",
  );
  assert.equal(pontosSparkline([{ t: 0, votos: 0 }, { t: 0, votos: 0 }], 100, 40), "0.0,40.0 0.0,40.0");
});

test("posição só aparece para quem já tem voto", () => {
  assert.equal(fmtPos(3, 120), "3º");
  assert.equal(fmtPos(1, 0), "–");
});

test("semContato: estado mais velho que 2,5 intervalos", () => {
  const e = { geradoEm: 1000, proximaBuscaEm: 61000 };
  assert.equal(semContato(e, 61000), false);
  assert.equal(semContato(e, 150000), false);
  assert.equal(semContato(e, 151001), true);
  assert.equal(semContato(null, 5), false);
});

test("areaSparkline fecha a linha até a base do gráfico", () => {
  assert.equal(areaSparkline("", 40), "");
  assert.equal(areaSparkline("0.0,40.0 50.0,20.0 100.0,0.0", 40), "0.0,40 0.0,40.0 50.0,20.0 100.0,0.0 100.0,40");
});

test("V2: selo de situação legível", async () => {
  const { seloSituacao } = await import("../public/util.mjs");
  assert.equal(seloSituacao("Eleito por QP", true), "ELEITO QP");
  assert.equal(seloSituacao("Eleito por média", true), "ELEITO MÉDIA");
  assert.equal(seloSituacao("Eleito", true), "ELEITO");
  assert.equal(seloSituacao("Suplente", false), "SUPLENTE");
  assert.equal(seloSituacao("2º turno", false), "2º TURNO");
  assert.equal(seloSituacao("Não eleito", false), "");
  assert.equal(seloSituacao("", false), "");
  assert.equal(seloSituacao(undefined, false), "");
});

test("V2: eleitos e o fixo entram na lista mesmo fora do topo", async () => {
  const { selecionarLinhas } = await import("../public/util.mjs");
  const cands = Array.from({ length: 20 }, (_, i) => ({ n: String(i + 1), votos: 100 - i, eleito: false }));
  assert.deepEqual(selecionarLinhas(cands, 5, null).map((c) => c.n), ["1", "2", "3", "4", "5"]);
  cands[14].eleito = true; // "15"
  assert.deepEqual(selecionarLinhas(cands, 5, "18").map((c) => c.n), ["1", "2", "3", "15", "18"]);
  cands[0].eleito = true;
  assert.deepEqual(selecionarLinhas(cands, 5, "2").map((c) => c.n), ["1", "2", "3", "4", "15"]);
  const todos = cands.map((c) => ({ ...c, eleito: true }));
  assert.equal(selecionarLinhas(todos, 5, "18").length, 5);
  assert.ok(selecionarLinhas(todos, 5, "18").some((c) => c.n === "18"));
});
