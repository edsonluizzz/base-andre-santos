import { test, expect } from "@playwright/test";

test.describe("API financeiro de entregas (Igrejas)", () => {
  test("GET /payments sem sessão redireciona para /login", async ({ request }) => {
    const res = await request.get("/api/church-assignments/payments", { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("/login");
  });

  test("POST /:id/pay sem sessão redireciona para /login", async ({ request }) => {
    const res = await request.post("/api/church-assignments/algum-id/pay", {
      data: { member: "member1" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("/login");
  });

  test("POST /pay-bulk sem sessão redireciona para /login", async ({ request }) => {
    const res = await request.post("/api/church-assignments/pay-bulk", {
      data: { collaboratorId: "algum-id" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("/login");
  });
});
