#!/usr/bin/env node
// Servidor estático da análise: só entrega os arquivos de public/ (nenhuma tela depende dele).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
};

export function criarServidor(raiz) {
  return http.createServer(async (req, res) => {
    try {
      const caminho = decodeURIComponent(new URL(req.url, "http://local").pathname);
      const arquivo = join(raiz, normalize(caminho === "/" ? "/index.html" : caminho));
      if (!arquivo.startsWith(raiz + sep)) throw new Error("fora da pasta");
      const corpo = await readFile(arquivo);
      res.writeHead(200, { "content-type": MIME[extname(arquivo)] ?? "application/octet-stream", "cache-control": "no-cache" });
      res.end(corpo);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("não encontrado");
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv.find((a) => a.startsWith("--porta="));
  const porta = Number(arg ? arg.slice(8) : process.env.PORTA ?? 4330);
  const raiz = join(dirname(fileURLToPath(import.meta.url)), "public");
  criarServidor(raiz).listen(porta, "127.0.0.1", () => console.log(`Análise 2026 em http://localhost:${porta}/`));
}
