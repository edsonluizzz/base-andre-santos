#!/usr/bin/env node
// Gera a prévia em PDF (3 folhas A4) de um ou mais candidatos, para divulgação por e-mail.
// Uso (da raiz do repo): node analise-2026/previa/gerar.mjs <cargo>:<número> [...] [--saida=pasta]
//   ex.: node analise-2026/previa/gerar.mjs estadual:30777
// Roda o painel local (tudo liberado, sem acesso.json) e imprime #previa?cargo=…&c=… com o Chrome do ~/Desktop.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../../node_modules/playwright/index.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PORTA = 4335;
const args = process.argv.slice(2);
const SAIDA = args.find((a) => a.startsWith("--saida="))?.slice(8) ?? join(homedir(), "Downloads", "Ovile Prévias");
const alvos = args.filter((a) => !a.startsWith("--")).map((a) => { const [cargo, n] = a.split(":"); return { cargo, n }; });
if (!alvos.length) { console.error("Uso: gerar.mjs <cargo>:<número> [...]"); process.exit(1); }

// nome do arquivo: "Prévia Ovile - André Santos 30777.pdf"
const nomeArquivo = (nm, n) => `Prévia Ovile - ${nm.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase())} ${n}.pdf`.replace(/[/\\:]/g, "-");

const srv = spawn(process.execPath, [join(AQUI, "..", "servidor.mjs"), `--porta=${PORTA}`], { stdio: "ignore" });
try {
  for (let k = 0; k < 40; k++) { if (await fetch(`http://localhost:${PORTA}/`).then((r) => r.ok, () => false)) break; await new Promise((r) => setTimeout(r, 250)); }
  mkdirSync(SAIDA, { recursive: true });
  const b = await chromium.launch({ executablePath: join(homedir(), "Desktop", "Google Chrome.app", "Contents", "MacOS", "Google Chrome") });
  const p = await b.newPage({ viewport: { width: 1200, height: 1600 } });
  const erros = [];
  p.on("pageerror", (e) => erros.push(e.message));
  for (const { cargo, n } of alvos) {
    erros.length = 0;
    await p.goto(`http://localhost:${PORTA}/#previa?cargo=${encodeURIComponent(cargo)}&c=${encodeURIComponent(n)}`);
    await p.reload(); // o hash muda sem recarregar; garante a montagem do zero
    const ok = await p.waitForFunction(() => document.body.dataset.pronta === "previa" && document.querySelector("#pv-mapa svg"), null, { timeout: 30000 }).then(() => true, () => false);
    const nm = await p.evaluate(() => document.querySelector(".rel-capa h1")?.textContent ?? "");
    if (!ok || erros.length || !nm) { console.error(`✗ ${cargo}:${n} ${erros.join("; ") || "não montou"}`); process.exitCode = 1; continue; }
    await p.waitForTimeout(400);
    const arq = join(SAIDA, nomeArquivo(nm, n));
    await p.pdf({ path: arq, format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    console.log(`✓ ${arq}`);
  }
  await b.close();
} finally {
  srv.kill();
}
