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
// O link "← sistema" só aparece para quem está logado; o visitante público vê só o painel.
export function prepararIndex(html: string, base: string, mostrarVoltar: boolean) {
  const comBase = html.replace("<head>", `<head>\n  <base href="${base}">`);
  return mostrarVoltar ? comBase.replace('id="voltar" href="../../dashboard" hidden', 'id="voltar" href="../../dashboard"') : comBase;
}

// Biblioteca de terceiros não muda entre deploys; o resto revalida a cada acesso com ETag da versão
// do deploy (304 se nada mudou) — assim uma atualização aparece na hora, sem esperar o cache vencer.
export function cabecalhosCache(rel: string, versao: string): Record<string, string> {
  if (rel.startsWith("vendor/")) return { "cache-control": "private, max-age=86400, immutable" };
  return { "cache-control": "private, no-cache", etag: `"${versao}-${rel}"` };
}
