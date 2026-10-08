import { describe, expect, it } from "vitest";
import { prepararIndex, resolverArquivo } from "./analise-2026";

describe("resolverArquivo", () => {
  const raiz = "/app/analise-2026/public";
  it("sem caminho = index.html", () => {
    expect(resolverArquivo(raiz, undefined)).toEqual({ caminho: "/app/analise-2026/public/index.html", tipo: "text/html; charset=utf-8", rel: "index.html" });
  });
  it("arquivos do painel com o tipo certo", () => {
    expect(resolverArquivo(raiz, ["js", "telas", "candidato.mjs"])?.tipo).toMatch(/javascript/);
    expect(resolverArquivo(raiz, ["dados", "estadual.json"])?.tipo).toMatch(/json/);
    expect(resolverArquivo(raiz, ["dados", "federal", "3030.json"])?.caminho).toBe("/app/analise-2026/public/dados/federal/3030.json");
    expect(resolverArquivo(raiz, ["css", "estilo.css"])?.caminho).toBe("/app/analise-2026/public/css/estilo.css");
  });
  it("bloqueia gasto interno, fuga da pasta e tipos desconhecidos", () => {
    expect(resolverArquivo(raiz, ["interno.json"])).toBeNull();
    expect(resolverArquivo(raiz, ["..", "..", "package.json"])).toBeNull();
    expect(resolverArquivo(raiz, ["js", "..", "..", "servidor.mjs"])).toBeNull();
    expect(resolverArquivo(raiz, ["coletar.sh"])).toBeNull();
  });
});

describe("prepararIndex", () => {
  const html = '<html><head>\n<title>x</title></head><body><a id="voltar" href="../../dashboard" hidden>← sistema</a></body></html>';
  it("injeta a base do subcaminho e mostra o link de volta para quem é do sistema", () => {
    const out = prepararIndex(html, "/eleicao-2026/analise/", true);
    expect(out).toContain('<head>\n  <base href="/eleicao-2026/analise/">');
    expect(out).toContain('<a id="voltar" href="../../dashboard">');
  });
  it("visitante público não vê o link para o sistema", () => {
    const out = prepararIndex(html, "/eleicao-2026/analise/", false);
    expect(out).toContain('<base href="/eleicao-2026/analise/">');
    expect(out).toContain('<a id="voltar" href="../../dashboard" hidden>');
  });
});

import { cabecalhosCache } from "./analise-2026";

describe("cabecalhosCache", () => {
  it("biblioteca de terceiros fica um dia em cache", () => {
    expect(cabecalhosCache("vendor/d3.v7.min.js", "abc")["cache-control"]).toBe("private, max-age=86400, immutable");
  });
  it("o resto revalida a cada acesso pela versão do deploy (ETag)", () => {
    const h = cabecalhosCache("dados.json", "abc123");
    expect(h["cache-control"]).toBe("private, no-cache");
    expect(h.etag).toBe('"abc123-dados.json"');
  });
});
