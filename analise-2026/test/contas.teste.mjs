import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORIAS_RECEITA } from "../public/js/config.mjs";
import { categoriaReceita, criarSomaContas, valorBR } from "../coletar/contas.mjs";

test("valorBR", () => {
  assert.equal(valorBR("1.234,56"), 1234.56);
  assert.equal(valorBR("910,00"), 910);
  assert.equal(valorBR("#NULO"), 0);
  assert.equal(valorBR(""), 0);
});

test("categoriaReceita usa fonte antes da origem", () => {
  assert.equal(categoriaReceita("FUNDO ESPECIAL", "Recursos de partido político"), "FEFC");
  assert.equal(categoriaReceita("FUNDO PARTIDARIO", "Recursos de partido político"), "Fundo Partidário");
  assert.equal(categoriaReceita("OUTROS RECURSOS", "Recursos de partido político"), "Partido (outros recursos)");
  assert.equal(categoriaReceita("OUTROS RECURSOS", "Recursos de pessoas físicas"), "Pessoas físicas");
  assert.equal(categoriaReceita("OUTROS RECURSOS", "Doações pela Internet"), "Pessoas físicas");
  assert.equal(categoriaReceita("OUTROS RECURSOS", "Recursos de Financiamento Coletivo"), "Pessoas físicas");
  assert.equal(categoriaReceita("OUTROS RECURSOS", "Recursos próprios"), "Recursos próprios");
  assert.equal(categoriaReceita("OUTROS RECURSOS", "Recursos de outros candidatos"), "Outros candidatos");
  assert.equal(categoriaReceita("#NULO", "#NULO"), "Outros");
  for (const [f, o] of [["FUNDO ESPECIAL", ""], ["#NULO", "Recursos de origens não identificadas"]]) assert.ok(CATEGORIAS_RECEITA.includes(categoriaReceita(f, o)));
});

test("soma parcelas repetidas e ignora outros cargos", () => {
  const s = criarSomaContas();
  s.receita({ sq: "1", cargo: "Deputado Estadual", fonte: "OUTROS RECURSOS", origem: "Recursos de pessoas físicas", valor: "200,00" });
  s.receita({ sq: "1", cargo: "Deputado Estadual", fonte: "OUTROS RECURSOS", origem: "Recursos de pessoas físicas", valor: "600,00" });
  s.receita({ sq: "1", cargo: "Deputado Estadual", fonte: "FUNDO ESPECIAL", origem: "Recursos de partido político", valor: "1.000,50" });
  s.receita({ sq: "9", cargo: "Deputado Federal", fonte: "FUNDO ESPECIAL", origem: "x", valor: "5,00" });
  s.despesa({ sq: "1", cargo: "Deputado Estadual", valor: "140,00" });
  s.despesa({ sq: "1", cargo: "Deputado Estadual", valor: "60,00" });
  const r = s.resultado();
  assert.deepEqual(r.receitas.get("1"), { total: 1800.5, porOrigem: { "Pessoas físicas": 800, FEFC: 1000.5 } });
  assert.equal(r.receitas.has("9"), false);
  assert.equal(r.despesas.get("1"), 200);
});
