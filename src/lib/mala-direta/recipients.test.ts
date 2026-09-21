import { describe, it, expect } from "vitest";
import { buildRecipients } from "./recipients";

describe("buildRecipients", () => {
  it("filtra vazio, inválido, wix, duplicado e suprimido — e conta cada um", () => {
    const rows = [
      { email: "ok@gmail.com", name: "Ok" },
      { email: "  OK@gmail.com ", name: "Dup" },
      { email: null, name: "Sem" },
      { email: "quebrado@gmilcom", name: "Inv" },
      { email: "x@offline-members-wix.com", name: "Wix" },
      { email: "sup@gmail.com", name: "Sup" },
      { email: "outro@hotmail.com", name: "Outro" },
    ];
    const { recipients, stats } = buildRecipients(rows, new Set(["sup@gmail.com"]));
    expect(recipients.map((r) => r.email)).toEqual(["ok@gmail.com", "outro@hotmail.com"]);
    expect(stats).toEqual({
      totalRows: 7, semEmail: 1, invalido: 2, duplicado: 1, suprimido: 1, final: 2,
    });
  });
  it("mantém o primeiro nome encontrado de cada email", () => {
    const { recipients } = buildRecipients(
      [{ email: "a@b.com", name: "Primeiro" }, { email: "a@b.com", name: "Segundo" }],
      new Set(),
    );
    expect(recipients).toEqual([{ email: "a@b.com", name: "Primeiro" }]);
  });
});
