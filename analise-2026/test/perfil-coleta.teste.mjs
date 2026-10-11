import test from "node:test";
import assert from "node:assert/strict";
import { criarMapaSecoes, criarSomaPerfil, escolaridade, genero, idade } from "../coletar/perfil.mjs";
import { PERFIL_CATS, posCat } from "../public/js/config.mjs";

test("códigos do TSE viram categorias do perfil", () => {
  assert.equal(genero("4"), posCat("f"));
  assert.equal(genero("2"), posCat("m"));
  assert.equal(genero("0"), null);
  assert.equal(idade("1600"), posCat("i16"));
  assert.equal(idade("2124"), posCat("i16"));
  assert.equal(idade("2529"), posCat("i25"));
  assert.equal(idade("4044"), posCat("i35"));
  assert.equal(idade("4549"), posCat("i45"));
  assert.equal(idade("5559"), posCat("i45"));
  assert.equal(idade("6064"), posCat("i60"));
  assert.equal(idade("9999"), posCat("i60"));
  assert.equal(idade("-3"), null);
  assert.equal(escolaridade("1"), posCat("e1"));
  assert.equal(escolaridade("3"), posCat("e1"));
  assert.equal(escolaridade("5"), posCat("e2"));
  assert.equal(escolaridade("6"), posCat("e3"));
  assert.equal(escolaridade("7"), posCat("e4"));
  assert.equal(escolaridade("0"), null);
});

test("perfil vai para o local que a votação usa (número original quando a seção mudou)", () => {
  const s = criarMapaSecoes();
  s.adicionar({ mun: "79774", zona: "097", secao: "10", local: "1090", localOriginal: "1015" });
  s.adicionar({ mun: "79774", zona: "97", secao: "11", local: "1200", localOriginal: "1200" });
  s.adicionar({ mun: "79774", zona: "97", secao: "12", local: "1300", localOriginal: "-1" });
  const p = criarSomaPerfil(s);
  p.adicionar({ mun: "79774", zona: "97", secao: "010", local: "1090", genero: "4", faixa: "2529", escolaridade: "8", qt: "3" });
  p.adicionar({ mun: "79774", zona: "97", secao: "10", local: "1090", genero: "2", faixa: "-3", escolaridade: "0", qt: "2" });
  p.adicionar({ mun: "79774", zona: "97", secao: "11", local: "1200", genero: "4", faixa: "7074", escolaridade: "1", qt: "5" });
  p.adicionar({ mun: "79774", zona: "97", secao: "12", local: "1300", genero: "4", faixa: "1800", escolaridade: "6", qt: "1" });
  p.adicionar({ mun: "79774", zona: "97", secao: "99", local: "1400", genero: "4", faixa: "1800", escolaridade: "6", qt: "4" }); // fora do cadastro
  p.adicionar({ mun: "79774", zona: "97", secao: "11", local: "1200", genero: "4", faixa: "1800", escolaridade: "6", qt: "0" });
  const { locais, foraDoCadastro } = p.resultado();
  assert.deepEqual([...locais.keys()].sort(), ["79774-97-1015", "79774-97-1200", "79774-97-1300", "79774-97-1400"]);
  const v = locais.get("79774-97-1015");
  assert.equal(v.length, 1 + PERFIL_CATS.length);
  assert.equal(v[0], 5);
  assert.equal(v[posCat("f")], 3);
  assert.equal(v[posCat("m")], 2);
  assert.equal(v[posCat("i25")], 3); // faixa inválida fica fora da dimensão
  assert.equal(v[posCat("e4")], 3);
  assert.equal(locais.get("79774-97-1200")[posCat("i60")], 5);
  assert.equal(foraDoCadastro, 4);
});
