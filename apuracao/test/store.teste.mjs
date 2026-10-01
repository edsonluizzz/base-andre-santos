import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarStore } from "../lib/store.mjs";

const novaPasta = () => mkdtempSync(join(tmpdir(), "apuracao-"));

test("registra só quando muda e relê depois de reiniciar", () => {
  const dir = novaPasta();
  const s = criarStore(dir);
  assert.equal(s.registrar({ t: 1, votos: 0, secoesPct: 0 }), true);
  assert.equal(s.registrar({ t: 2, votos: 0, secoesPct: 0 }), false);
  assert.equal(s.registrar({ t: 3, votos: 120, secoesPct: 1.5 }), true);
  assert.equal(s.historico().length, 2);

  const s2 = criarStore(dir);
  assert.deepEqual(s2.historico(), [
    { t: 1, votos: 0, secoesPct: 0 },
    { t: 3, votos: 120, secoesPct: 1.5 },
  ]);
});

test("linha truncada por queda é ignorada e não contamina a próxima gravação", () => {
  const dir = novaPasta();
  writeFileSync(join(dir, "historico.jsonl"), '{"t":1,"votos":10,"secoesPct":1}\n{"t":2,"vot');
  const s = criarStore(dir);
  assert.deepEqual(s.historico(), [{ t: 1, votos: 10, secoesPct: 1 }]);
  s.registrar({ t: 3, votos: 30, secoesPct: 2 });
  assert.deepEqual(criarStore(dir).historico(), [
    { t: 1, votos: 10, secoesPct: 1 },
    { t: 3, votos: 30, secoesPct: 2 },
  ]);
});

test("salvarEstado grava o último e acumula", () => {
  const dir = novaPasta();
  const s = criarStore(dir);
  s.salvarEstado({ geradoEm: 1 });
  s.salvarEstado({ geradoEm: 2 });
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "ultimo.json"), "utf8")), { geradoEm: 2 });
  assert.equal(readFileSync(join(dir, "estados.jsonl"), "utf8").trim().split("\n").length, 2);
});
