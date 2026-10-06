import { describe, expect, it } from "vitest";
import { prepararIndex, resolverArquivo } from "./analise-2026";

describe("resolverArquivo", () => {
  const raiz = "/app/analise-2026/public";
  it("sem caminho = index.html", () => {
    expect(resolverArquivo(raiz, undefined)).toEqual({ caminho: "/app/analise-2026/public/index.html", tipo: "text/html; charset=utf-8", rel: "index.html" });
  });
  it("arquivos do painel com o tipo certo", () => {
    expect(resolverArquivo(raiz, ["js", "telas", "andre.mjs"])?.tipo).toMatch(/javascript/);
    expect(resolverArquivo(raiz, ["dados.json"])?.tipo).toMatch(/json/);
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
  it("injeta a base do subcaminho e mostra o link de volta", () => {
    const html = '<html><head>\n<title>x</title></head><body><a id="voltar" href="../../dashboard" hidden>← sistema</a></body></html>';
    const out = prepararIndex(html, "/eleicao-2026/analise/");
    expect(out).toContain('<head>\n  <base href="/eleicao-2026/analise/">');
    expect(out).toContain('<a id="voltar" href="../../dashboard">');
  });
});
