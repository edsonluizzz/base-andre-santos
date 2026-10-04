// Gera PDF de uma página local usando o Chrome instalado no Mac (modo headless).
// Sem dependências: o Chrome já é usado para exibir o painel.

import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

const LOCAIS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  join(homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  join(homedir(), "Desktop/Google Chrome.app/Contents/MacOS/Google Chrome"),
];

export const acharChrome = () => LOCAIS.find((c) => existsSync(c)) ?? null;

export function criarGeradorPdf(chrome) {
  return (url) =>
    new Promise((resolve, reject) => {
      const dir = mkdtempSync(join(tmpdir(), "apuracao-pdf-"));
      const saida = join(dir, "relatorio.pdf");
      execFile(
        chrome,
        [
          "--headless=new", "--disable-gpu", "--no-first-run", "--no-pdf-header-footer",
          `--user-data-dir=${join(dir, "perfil")}`,
          // dá tempo para a página buscar os dados antes de imprimir
          "--virtual-time-budget=8000",
          `--print-to-pdf=${saida}`, url,
        ],
        { timeout: 45000 },
        (erro) => {
          try {
            if (erro && !existsSync(saida)) return reject(erro);
            resolve(readFileSync(saida));
          } catch (e) {
            reject(e);
          } finally {
            rmSync(dir, { recursive: true, force: true });
          }
        },
      );
    });
}
