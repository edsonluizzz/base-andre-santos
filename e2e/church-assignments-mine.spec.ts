import { test, expect } from "@playwright/test";

test.describe("API /api/church-assignments", () => {
  test("GET /mine sem sessão retorna 401", async ({ request }) => {
    const res = await request.get("/api/church-assignments/mine");
    expect(res.status()).toBe(401);
  });

  test("PATCH /:id sem sessão retorna 401", async ({ request }) => {
    const res = await request.patch("/api/church-assignments/algum-id", {
      data: { status: "ENTREGUE", photoUrl: "https://example.com/foto.jpg" },
    });
    expect(res.status()).toBe(401);
  });
});
