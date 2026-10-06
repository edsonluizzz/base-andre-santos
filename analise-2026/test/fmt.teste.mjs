import test from "node:test";
import assert from "node:assert/strict";
import { esc, inteiro, pct, pp, reais, reaisCurto } from "../public/js/fmt.mjs";

test("formatos pt-BR", () => {
  assert.equal(inteiro(9481), "9.481");
  assert.equal(inteiro(0), "0");
  assert.equal(reais(9.7104), "R$ 9,71");
  assert.equal(reais(92064, 0), "R$ 92.064");
  assert.equal(reais(null), "sem dado");
  assert.equal(reais(undefined), "sem dado");
  assert.equal(pct(0.0037), "0,37%");
  assert.equal(pct(0.395, 1), "39,5%");
  assert.equal(pct(null), "—");
  assert.equal(reaisCurto(954014), "R$ 954 mil");
  assert.equal(reaisCurto(1500000), "R$ 1,5 mi");
  assert.equal(reaisCurto(350), "R$ 350,00");
  assert.equal(reaisCurto(null), "sem dado");
  assert.equal(esc('<a "b">&'), "&lt;a &quot;b&quot;&gt;&amp;");
  assert.equal(esc(null), "");
});

test("pp: diferença entre percentuais em pontos percentuais", () => {
  assert.equal(pp(0.0588), "5,88 p.p.");
  assert.equal(pp(-0.012, 1), "-1,2 p.p.");
  assert.equal(pp(null), "—");
});
