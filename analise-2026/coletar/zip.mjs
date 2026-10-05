import { spawn } from "node:child_process";
import { indices, linhasCsv } from "./csv.mjs";

// Lê um CSV de dentro do zip sem extrair para o disco (o de seção tem 830 MB).
export async function* linhasDoZip(zip, entrada) {
  const p = spawn("unzip", ["-p", zip, entrada], { stdio: ["ignore", "pipe", "pipe"] });
  let erro = "";
  p.stderr.on("data", (d) => (erro += d));
  const saida = new Promise((resolve, reject) => {
    p.on("error", reject);
    p.on("close", resolve);
  });
  yield* linhasCsv(p.stdout);
  const codigo = await saida;
  if (codigo !== 0) throw new Error(`unzip falhou (código ${codigo}) lendo ${entrada} de ${zip}: ${erro.trim()}`);
}

export async function percorrerCsvDoZip(zip, entrada, colunas, fn) {
  let idx = null;
  let n = 0;
  for await (const c of linhasDoZip(zip, entrada)) {
    if (!idx) { idx = indices(c, colunas, entrada); continue; }
    fn(c, idx);
    n++;
  }
  if (!idx) throw new Error(`${entrada} veio vazio de ${zip}`);
  return n;
}
