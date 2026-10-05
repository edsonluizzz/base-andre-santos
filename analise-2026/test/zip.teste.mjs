import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { percorrerCsvDoZip } from "../coletar/zip.mjs";

function zipCom(arquivos) {
  const dir = mkdtempSync(join(tmpdir(), "analise-zip-"));
  for (const [nome, conteudo] of Object.entries(arquivos)) writeFileSync(join(dir, nome), Buffer.from(conteudo, "latin1"));
  execFileSync("zip", ["-q", "-j", join(dir, "t.zip"), ...Object.keys(arquivos).map((n) => join(dir, n))]);
  return join(dir, "t.zip");
}

test("percorre o CSV dentro do zip pelas colunas pedidas", async () => {
  const zip = zipCom({ "a.csv": '"NOME";"QT";"X"\n"JOS\xc9";10;"a"\n"ANA";5;"b"\n' });
  const vistos = [];
  const n = await percorrerCsvDoZip(zip, "a.csv", ["QT", "NOME"], (c, i) => vistos.push([c[i.NOME], c[i.QT]]));
  assert.equal(n, 2);
  assert.deepEqual(vistos, [["JOSÉ", "10"], ["ANA", "5"]]);
});

test("arquivo ausente no zip: erro, não lista vazia", async () => {
  const zip = zipCom({ "a.csv": '"A"\n1\n' });
  await assert.rejects(percorrerCsvDoZip(zip, "nao-existe.csv", ["A"], () => {}), /unzip falhou|veio vazio/);
});

test("coluna ausente: erro com o nome da coluna", async () => {
  const zip = zipCom({ "a.csv": '"A"\n1\n' });
  await assert.rejects(percorrerCsvDoZip(zip, "a.csv", ["B"], () => {}), /Coluna B ausente em a\.csv/);
});
