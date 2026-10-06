import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Toda a lista de módulos precisa estar pré-carregada no index.html (senão volta o carregamento em cascata).
test("index.html pré-carrega todos os módulos e os dados", () => {
  const raiz = join(import.meta.dirname, "..", "public");
  const html = readFileSync(join(raiz, "index.html"), "utf8");
  const mods = [
    ...readdirSync(join(raiz, "js")).filter((f) => f.endsWith(".mjs")).map((f) => `js/${f}`),
    ...readdirSync(join(raiz, "js", "telas")).map((f) => `js/telas/${f}`),
  ];
  for (const m of mods) assert.ok(html.includes(`<link rel="modulepreload" href="${m}">`), `faltou modulepreload de ${m}`);
  assert.ok(html.includes('<link rel="preload" href="dados.json" as="fetch" crossorigin>'));
});
