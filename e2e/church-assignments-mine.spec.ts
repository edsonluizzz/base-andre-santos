import { test, expect } from "@playwright/test";

test.describe("API /api/church-assignments", () => {
  test("GET /mine sem sessão redireciona para /login", async ({ request }) => {
    const res = await request.get("/api/church-assignments/mine", { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("/login");
  });

  test("PATCH /:id sem sessão redireciona para /login", async ({ request }) => {
    const res = await request.patch("/api/church-assignments/algum-id", {
      data: { status: "ENTREGUE", photoUrl: "https://example.com/foto.jpg" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("/login");
  });
});
