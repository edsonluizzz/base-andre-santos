import test from "node:test";
import assert from "node:assert/strict";
import { campos, indices, linhasCsv } from "../coletar/csv.mjs";

const coletar = async (fonte) => { const out = []; for await (const l of linhasCsv(fonte)) out.push(l); return out; };

test("campos: texto entre aspas, número sem aspas", () => {
  assert.deepEqual(campos('"05/10/2026";2026;"PARANÁ";78255'), ["05/10/2026", "2026", "PARANÁ", "78255"]);
});

test("campos: ; dentro de aspas e aspas duplas escapadas", () => {
  assert.deepEqual(campos('"A;B";"diz ""oi""";3'), ["A;B", 'diz "oi"', "3"]);
});

test("campos: campo vazio no meio e no fim", () => {
  assert.deepEqual(campos('"a";;"c";'), ["a", "", "c", ""]);
});

test("linhasCsv: latin1, CRLF e linha partida entre pedaços", async () => {
  const bytes = Buffer.from('"NOME";"QT"\r\n"JOS\xc9";10\r\n"MAR', "latin1");
  const resto = Buffer.from('IA";20\r\n', "latin1");
  assert.deepEqual(await coletar([bytes, resto]), [["NOME", "QT"], ["JOSÉ", "10"], ["MARIA", "20"]]);
});

test("linhasCsv: quebra de linha dentro de aspas fica no mesmo registro", async () => {
  const txt = '"ID";"DESC"\n1;"linha um\nlinha dois"\n2;"ok"\n';
  assert.deepEqual(await coletar([Buffer.from(txt, "latin1")]), [["ID", "DESC"], ["1", "linha um\nlinha dois"], ["2", "ok"]]);
});

test("linhasCsv: última linha sem \\n e linhas vazias ignoradas", async () => {
  assert.deepEqual(await coletar([Buffer.from('"A"\n\n1', "latin1")]), [["A"], ["1"]]);
});

test("indices: mapeia nomes e acusa coluna ausente", () => {
  assert.deepEqual(indices(["X", "Y", "Z"], ["Z", "X"]), { Z: 2, X: 0 });
  assert.throws(() => indices(["X"], ["W"], "arq.csv"), /Coluna W ausente em arq\.csv/);
});
