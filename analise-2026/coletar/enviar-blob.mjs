#!/usr/bin/env node
// Envia os dados das UFs fora do PR (public/dados/uf/<uf>/…) para o Vercel Blob, comprimidos (.gz), sob um
// prefixo secreto. A rota do diagnóstico busca lá o que não está no deploy (ver lerArquivoAnalise em
// src/lib/analise-2026.ts); o endereço nunca chega ao navegador, e os arquivos pagos continuam atrás do token.
// Só sobe o que mudou desde o último envio (manifesto com o hash de cada arquivo em cache/blob-enviados.json).
// Uso (da raiz do repo): BLOB_READ_WRITE_TOKEN=… DIAGNOSTICO_BLOB_PREFIXO=diagnostico-<segredo> node analise-2026/coletar/enviar-blob.mjs [uf…]
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { put } from "@vercel/blob";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PUBLICO = join(AQUI, "..", "public");
const RAIZ_UF = join(PUBLICO, "dados", "uf");
const MANIFESTO = join(AQUI, "cache", "blob-enviados.json");
const PREFIXO = process.env.DIAGNOSTICO_BLOB_PREFIXO;
if (!PREFIXO || !/^diagnostico-[A-Za-z0-9]{24,}$/.test(PREFIXO)) throw new Error("Defina DIAGNOSTICO_BLOB_PREFIXO=diagnostico-<segredo de 24+ letras/números>");
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Defina BLOB_READ_WRITE_TOKEN");

const ufs = process.argv.slice(2).map((u) => u.toLowerCase());
const listar = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? listar(p) : n.endsWith(".json") ? [p] : [];
});
const arquivos = (ufs.length ? ufs : readdirSync(RAIZ_UF)).flatMap((uf) => listar(join(RAIZ_UF, uf)));
const enviados = existsSync(MANIFESTO) ? JSON.parse(readFileSync(MANIFESTO, "utf8")) : {};
const fila = arquivos.map((caminho) => {
  const rel = relative(PUBLICO, caminho).split("\\").join("/");
  const corpo = readFileSync(caminho);
  return { rel, corpo, hash: createHash("sha1").update(corpo).digest("hex") };
}).filter((a) => enviados[a.rel] !== a.hash);
console.log(`${arquivos.length} arquivos, ${fila.length} novos ou alterados`);

let feitos = 0, base = null;
const gravarManifesto = () => writeFileSync(MANIFESTO, JSON.stringify(enviados));
async function enviar({ rel, corpo, hash }) {
  for (let t = 1; ; t++) {
    try {
      const r = await put(`${PREFIXO}/${rel}.gz`, gzipSync(corpo, { level: 9 }), {
        access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/gzip", cacheControlMaxAge: 60,
      });
      base ??= r.url.slice(0, r.url.indexOf(`/${PREFIXO}/`) + PREFIXO.length + 2);
      enviados[rel] = hash;
      if (++feitos % 200 === 0) { gravarManifesto(); console.log(`  ${feitos}/${fila.length}`); }
      return;
    } catch (e) {
      if (t >= 5) throw new Error(`${rel}: ${e.message}`);
      await new Promise((ok) => setTimeout(ok, 2000 * t));
    }
  }
}
const PARALELO = 24;
let i = 0;
await Promise.all(Array.from({ length: PARALELO }, async () => { while (i < fila.length) await enviar(fila[i++]); }));
gravarManifesto();
// endereço base (com o segredo) vai para um arquivo do cache, não para a tela
if (base) writeFileSync(join(AQUI, "cache", "blob-base.txt"), base);
console.log(`enviados ${feitos}${base ? " · endereço base em cache/blob-base.txt (valor de DIAGNOSTICO_DADOS_URL)" : ""}`);
