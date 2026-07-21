import { test, expect } from "@playwright/test";

test.describe("API /api/churches", () => {
  test("GET sem sessão redireciona para /login", async ({ request }) => {
    const res = await request.get("/api/churches", { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("/login");
  });

  test("POST /api/churches/import sem sessão redireciona para /login", async ({ request }) => {
    const res = await request.post("/api/churches/import", {
      data: { rows: [{ name: "Igreja Teste", regional: "Matriz" }] },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("/login");
  });
});
