import { extname, join, normalize, sep } from "node:path";

// Painel de análise da eleição 2026: mini-app estático em analise-2026/public, servido pelo sistema.

const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

// Gasto interno do módulo financeiro fica só no Mac; nunca é servido online.
const BLOQUEADOS = new Set(["interno.json"]);

export function resolverArquivo(raiz: string, partes: string[] | undefined) {
  const rel = normalize((partes?.length ? partes : ["index.html"]).join("/"));
  const tipo = TIPOS[extname(rel)];
  if (!tipo || rel.startsWith("..") || BLOQUEADOS.has(rel)) return null;
  const caminho = join(raiz, rel);
  if (!caminho.startsWith(raiz + sep)) return null;
  return { caminho, tipo, rel };
}

// Servido em /eleicao-2026/analise (sem barra final), os caminhos relativos precisam de <base>.
export function prepararIndex(html: string, base: string) {
  return html.replace("<head>", `<head>\n  <base href="${base}">`).replace('id="voltar" href="../../dashboard" hidden', 'id="voltar" href="../../dashboard"');
}
