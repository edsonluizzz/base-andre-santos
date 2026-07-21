import { test, expect } from "@playwright/test";

test.describe("API /api/churches", () => {
  test("GET sem sessão retorna 401", async ({ request }) => {
    const res = await request.get("/api/churches");
    expect(res.status()).toBe(401);
  });

  test("POST /api/churches/import sem sessão retorna 401", async ({ request }) => {
    const res = await request.post("/api/churches/import", {
      data: { rows: [{ name: "Igreja Teste", regional: "Matriz" }] },
    });
    expect(res.status()).toBe(401);
  });
});
