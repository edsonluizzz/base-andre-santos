#!/usr/bin/env node
// Fotografa as peças do estudio.html em PNG (logo, foto de perfil, posts e capa do Reel).
// Sobe um servidor estático na pasta analise-2026 (o estúdio lê telas e dados de ../public e ../video).
// Uso: node analise-2026/instagram/renderizar.mjs [peca ...]   (sem argumentos = todas)
import http from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../../node_modules/playwright/index.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const SAIDA = join(AQUI, "pecas");
const TODAS = ["avatar", "logo-escuro", "logo-claro", "post-1-reel-capa", "post-2-pergunta", "post-3-local", "post-4-custo", "post-5-concorrentes", "post-6-relatorio", "identidade"];
const pedidas = process.argv.slice(2).length ? process.argv.slice(2) : TODAS;
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".css": "text/css" };

const servidor = http.createServer((req, res) => {
  try {
    const arq = join(RAIZ, normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (!arq.startsWith(RAIZ + sep)) throw new Error("fora");
    const corpo = readFileSync(arq); // lê antes de responder: arquivo que não existe vira 404
    res.writeHead(200, { "content-type": MIME[extname(arq)] ?? "application/octet-stream" });
    res.end(corpo);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const porta = servidor.address().port;

mkdirSync(SAIDA, { recursive: true });
const b = await chromium.launch({ executablePath: `${process.env.HOME}/Desktop/Google Chrome.app/Contents/MacOS/Google Chrome` });
for (const peca of pedidas) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  const erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  p.on("response", (r) => r.status() >= 400 && erros.push(`${r.status()} ${r.url()}`));
  await p.goto(`http://localhost:${porta}/instagram/estudio.html?peca=${peca}`);
  await p.waitForFunction(() => window.__pronto === true, null, { timeout: 30000 });
  const { w, h } = await p.evaluate(() => window.__tamanho);
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(300);
  await p.screenshot({ path: join(SAIDA, `${peca}.png`), clip: { x: 0, y: 0, width: w, height: h } });
  console.log(`${peca}.png ${w}×${h}${erros.length ? `  ERROS: ${erros.join(" | ")}` : ""}`);
  await p.close();
}
await b.close();
servidor.closeAllConnections(); // o Chrome deixa conexões abertas; sem isto o processo não termina
servidor.close();
