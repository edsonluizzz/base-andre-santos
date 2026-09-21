import { describe, it, expect } from "vitest";
import { renderPropagandaEmail, buildUnsubscribeHeaders, escapeHtml } from "./template";

const base = {
  subject: "Assunto",
  bodyText: "Olá, {{nome}}!\n\nSegundo parágrafo\ncom quebra.",
  unsubscribeUrl: "https://x.com/descadastro?e=a&t=b",
};

describe("renderPropagandaEmail", () => {
  it("personaliza {{nome}} e separa parágrafos", () => {
    const { html, text } = renderPropagandaEmail({ ...base, firstName: "Maria" });
    expect(html).toContain("Olá, Maria!");
    expect(html).toContain("<p");
    expect(html).toContain("com quebra.");
    expect(text).toContain("Olá, Maria!");
  });
  it("usa fallback quando não há nome", () => {
    expect(renderPropagandaEmail(base).html).toContain("Olá, amigo(a)!");
  });
  it("escapa HTML do corpo e do nome", () => {
    const { html } = renderPropagandaEmail({
      ...base, bodyText: "<script>x</script> {{nome}}", firstName: "<b>Zé</b>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;Zé&lt;/b&gt;");
  });
  it("inclui CTA só para https", () => {
    const ok = renderPropagandaEmail({ ...base, ctaLabel: "Saiba mais", ctaUrl: "https://a.com/x" });
    expect(ok.html).toContain('href="https://a.com/x"');
    const bad = renderPropagandaEmail({ ...base, ctaLabel: "Clique", ctaUrl: "javascript:alert(1)" });
    expect(bad.html).not.toContain("javascript:");
    expect(bad.html).not.toContain("Clique");
  });
  it("traz identificação do comitê, número e link de descadastro (html e texto)", () => {
    const { html, text } = renderPropagandaEmail(base);
    for (const out of [html, text]) {
      expect(out).toContain("68.464.730/0001-87");
      expect(out).toContain("30777");
    }
    // no HTML o "&" da URL é escapado para "&amp;"; no texto puro a URL vai crua
    expect(html).toContain(escapeHtml(base.unsubscribeUrl));
    expect(text).toContain(base.unsubscribeUrl);
    expect(html.toLowerCase()).toContain("propaganda eleitoral");
  });
});

describe("buildUnsubscribeHeaders", () => {
  it("monta List-Unsubscribe e One-Click (RFC 8058)", () => {
    expect(buildUnsubscribeHeaders("https://x.com/api/public/descadastro?e=a&t=b")).toEqual({
      "List-Unsubscribe": "<https://x.com/api/public/descadastro?e=a&t=b>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("escapeHtml", () => {
  it("escapa & < > \"", () => {
    expect(escapeHtml(`a&b<c>"d"`)).toBe("a&amp;b&lt;c&gt;&quot;d&quot;");
  });
});
