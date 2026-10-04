import test from "node:test";
import assert from "node:assert/strict";
import { calcularQuociente, vagasPartido } from "../lib/quociente.mjs";

test("quociente = válidos ÷ vagas; fração até meio desce, acima de meio sobe", () => {
  assert.deepEqual(calcularQuociente({ validos: 5400, vagas: 54, qeOficial: 0 }), { quociente: 100, oficial: false });
  assert.equal(calcularQuociente({ validos: 5427, vagas: 54, qeOficial: 0 }).quociente, 100); // resto = meio exato
  assert.equal(calcularQuociente({ validos: 5428, vagas: 54, qeOficial: 0 }).quociente, 101);
});

test("usa o quociente oficial quando o TSE informa", () => {
  assert.deepEqual(calcularQuociente({ validos: 5400, vagas: 54, qeOficial: 112345 }), { quociente: 112345, oficial: true });
});

test("sem votos válidos o quociente é zero, sem NaN", () => {
  assert.deepEqual(calcularQuociente({ validos: 0, vagas: 54, qeOficial: 0 }), { quociente: 0, oficial: false });
  assert.deepEqual(calcularQuociente({ validos: 100, vagas: 0, qeOficial: 0 }), { quociente: 0, oficial: false });
  assert.deepEqual(vagasPartido(0, 0), { vagasDiretas: 0, faltamProxima: null });
});

test("vagas diretas e quanto falta para a próxima", () => {
  assert.deepEqual(vagasPartido(250, 100), { vagasDiretas: 2, faltamProxima: 50 });
  assert.deepEqual(vagasPartido(99, 100), { vagasDiretas: 0, faltamProxima: 1 });
  assert.deepEqual(vagasPartido(300, 100), { vagasDiretas: 3, faltamProxima: 100 });
});
