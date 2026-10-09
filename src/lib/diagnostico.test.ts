import { describe, expect, it } from "vitest";
import { arquivoDeCandidato, ehHostDiagnostico, gerarToken, juntarToken, lerTokens, linkDiagnostico, telefoneWhatsApp, tokenValido } from "./diagnostico";

describe("tokens do diagnóstico", () => {
  it("gera tokens de 24 caracteres base64url, diferentes a cada vez", () => {
    const a = gerarToken(), b = gerarToken();
    expect(tokenValido(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(tokenValido("curto")).toBe(false);
    expect(tokenValido("a".repeat(23) + "!")).toBe(false);
  });
  it("cookie guarda vários tokens, sem repetir e sem lixo", () => {
    const t1 = "A".repeat(24), t2 = "B".repeat(24);
    expect(lerTokens(undefined)).toEqual([]);
    expect(lerTokens(`${t1}.lixo.${t2}.${t1}`)).toEqual([t1, t2]);
    expect(juntarToken(t1, t2)).toBe(`${t1}.${t2}`);
    expect(juntarToken(`${t1}.${t2}`, t1)).toBe(`${t2}.${t1}`);
  });
  it("mantém só os 20 mais recentes", () => {
    let c = "";
    for (let i = 0; i < 25; i++) c = juntarToken(c, String(i).padStart(24, "x"));
    expect(lerTokens(c)).toHaveLength(20);
    expect(lerTokens(c).at(-1)).toBe("24".padStart(24, "x"));
  });
});

describe("rotas e links", () => {
  it("reconhece o arquivo de votos por local de um candidato", () => {
    expect(arquivoDeCandidato("dados/estadual/30777.json")).toEqual({ cargo: "estadual", numero: "30777" });
    expect(arquivoDeCandidato("dados/federal/3030.json")).toEqual({ cargo: "federal", numero: "3030" });
    expect(arquivoDeCandidato("dados/estadual.json")).toBeNull();
    expect(arquivoDeCandidato("dados/senado/123.json")).toBeNull();
    expect(arquivoDeCandidato("dados/2024/vereador/75353/loc.json")).toEqual({ cargo: "vereador-2024", numero: "75353" });
    expect(arquivoDeCandidato("dados/2024/vereador/75353.json")).toBeNull(); // base da cidade é pública
    expect(arquivoDeCandidato("dados/2024/senador/75353/loc.json")).toBeNull();
    expect(arquivoDeCandidato("dados/2020/prefeito/75353/loc.json")).toEqual({ cargo: "prefeito-2020", numero: "75353" });
    expect(arquivoDeCandidato("dados/2022/estadual/30777.json")).toEqual({ cargo: "estadual-2022", numero: "30777" });
    expect(arquivoDeCandidato("dados/2024/vereador/75353.json")).toBeNull(); // base municipal (5 dígitos) continua pública
  });
  it("host do produto, com ou sem porta", () => {
    expect(ehHostDiagnostico("diagnostico.ovile.com.br")).toBe(true);
    expect(ehHostDiagnostico("Diagnostico.ovile.com.br:443")).toBe(true);
    expect(ehHostDiagnostico("www.ovile.com.br")).toBe(false);
    expect(ehHostDiagnostico(null)).toBe(false);
  });
  it("link do cliente abre no relatório do candidato", () => {
    expect(linkDiagnostico("T".repeat(24), "federal", "3030")).toBe(`https://diagnostico.ovile.com.br/?k=${"T".repeat(24)}#relatorio?cargo=federal&c=3030`);
    expect(linkDiagnostico("T".repeat(24), "estadual-2022", "30777")).toBe(`https://diagnostico.ovile.com.br/?k=${"T".repeat(24)}#relatorio?cargo=estadual-2022&c=30777`);
    expect(linkDiagnostico("T".repeat(24), "vereador-2024", "75353-30300")).toBe(`https://diagnostico.ovile.com.br/?k=${"T".repeat(24)}#relatorio?cargo=vereador-2024&m=75353&c=30300`);
  });
  it("telefone para wa.me", () => {
    expect(telefoneWhatsApp("(41) 99999-1234")).toBe("5541999991234");
    expect(telefoneWhatsApp("+55 41 3333-1234")).toBe("554133331234");
    expect(telefoneWhatsApp("123")).toBeNull();
    expect(telefoneWhatsApp(null)).toBeNull();
  });
});
