import { describe, it, expect, beforeAll } from "vitest";
import {
  signUnsubscribe, verifyUnsubscribe, buildUnsubscribePageUrl, buildUnsubscribeOneClickUrl,
} from "./unsubscribe-token";

beforeAll(() => { process.env.UNSUBSCRIBE_SECRET = "segredo-de-teste"; });

describe("unsubscribe token", () => {
  it("assina e verifica", () => {
    const t = signUnsubscribe("a@b.com");
    expect(verifyUnsubscribe("a@b.com", t)).toBe(true);
  });
  it("ignora caixa e espaços no email", () => {
    const t = signUnsubscribe("A@B.com ");
    expect(verifyUnsubscribe("a@b.com", t)).toBe(true);
  });
  it("rejeita token de outro email", () => {
    const t = signUnsubscribe("a@b.com");
    expect(verifyUnsubscribe("c@d.com", t)).toBe(false);
  });
  it("rejeita token adulterado ou de tamanho errado", () => {
    const t = signUnsubscribe("a@b.com");
    expect(verifyUnsubscribe("a@b.com", t.slice(0, -2) + "xx")).toBe(false);
    expect(verifyUnsubscribe("a@b.com", "curto")).toBe(false);
    expect(verifyUnsubscribe("a@b.com", "")).toBe(false);
  });
  it("monta as duas URLs com email codificado", () => {
    const page = buildUnsubscribePageUrl("a+x@b.com", "https://x.com");
    const one = buildUnsubscribeOneClickUrl("a+x@b.com", "https://x.com");
    expect(page.startsWith("https://x.com/descadastro?e=a%2Bx%40b.com&t=")).toBe(true);
    expect(one.startsWith("https://x.com/api/public/descadastro?e=a%2Bx%40b.com&t=")).toBe(true);
  });
});
