import { test, expect } from "@playwright/test";

test.describe("API /api/churches/:id/assignments", () => {
  test("sem sessão redireciona para /login", async ({ request }) => {
    const res = await request.post("/api/churches/algum-id/assignments", {
      data: { member1Id: "a", member2Id: "b" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("/login");
  });
});
