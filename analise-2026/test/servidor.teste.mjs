import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarServidor } from "../servidor.mjs";

test("serve arquivos de public com o tipo certo e bloqueia fuga da pasta", async () => {
  const base = mkdtempSync(join(tmpdir(), "analise-srv-"));
  const raiz = join(base, "public");
  mkdirSync(join(raiz, "js"), { recursive: true });
  writeFileSync(join(raiz, "index.html"), "<h1>oi</h1>");
  writeFileSync(join(raiz, "js", "a.mjs"), "export {}");
  writeFileSync(join(raiz, "dados.json"), "{}");
  writeFileSync(join(base, "segredo.txt"), "não");
  const srv = criarServidor(raiz).listen(0);
  await new Promise((r) => srv.once("listening", r));
  const url = `http://127.0.0.1:${srv.address().port}`;
  try {
    let r = await fetch(`${url}/`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /text\/html/);
    r = await fetch(`${url}/js/a.mjs`);
    assert.match(r.headers.get("content-type"), /text\/javascript/);
    r = await fetch(`${url}/dados.json`);
    assert.match(r.headers.get("content-type"), /application\/json/);
    assert.equal((await fetch(`${url}/..%2Fsegredo.txt`)).status, 404);
    assert.equal((await fetch(`${url}/nao-existe.json`)).status, 404);
  } finally {
    srv.close();
  }
});
