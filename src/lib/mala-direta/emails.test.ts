import { describe, it, expect } from "vitest";
import { normalizeEmail, isSendableEmail } from "./emails";

describe("normalizeEmail", () => {
  it("apara e põe em minúsculas", () => {
    expect(normalizeEmail("  Fulano@Gmail.COM ")).toBe("fulano@gmail.com");
  });
  it("retorna null para vazio/nulo", () => {
    expect(normalizeEmail("   ")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe("isSendableEmail", () => {
  it("aceita email válido", () => {
    expect(isSendableEmail("a@b.com")).toBe(true);
  });
  it("rejeita formato inválido", () => {
    expect(isSendableEmail("edeneianeves13@gmilcom")).toBe(false);
    expect(isSendableEmail("sem-arroba")).toBe(false);
  });
  it("rejeita domínio de placeholder do Wix", () => {
    expect(isSendableEmail("x@offline-members-wix.com")).toBe(false);
  });
});
