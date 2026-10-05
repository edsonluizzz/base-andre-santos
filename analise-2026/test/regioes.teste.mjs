import test from "node:test";
import assert from "node:assert/strict";
import { conferirRegioes, regiaoDe, REGIOES } from "../coletar/regioes.mjs";

test("classifica por nome, ignorando acento e caixa", () => {
  assert.equal(regiaoDe("CURITIBA"), "Curitiba");
  assert.equal(regiaoDe("SÃO JOSÉ DOS PINHAIS"), "RMC");
  assert.equal(regiaoDe("PARANAGUÁ"), "Litoral");
  assert.equal(regiaoDe("Pontal do Paraná"), "Litoral");
  assert.equal(regiaoDe("LONDRINA"), "Interior");
  assert.deepEqual(REGIOES, ["Curitiba", "RMC", "Litoral", "Interior"]);
});

test("conferirRegioes aponta nomes das listas que não existem no TSE", () => {
  const faltam = conferirRegioes(["CURITIBA", "PARANAGUÁ"]);
  assert.ok(faltam.includes("COLOMBO"));
  assert.ok(!faltam.includes("PARANAGUA"));
  assert.equal(faltam.length, 28 + 6);
});
