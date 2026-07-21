import { test, expect } from "@playwright/test";

test.describe("API /api/churches/:id/assignments", () => {
  test("sem sessão retorna 401", async ({ request }) => {
    const res = await request.post("/api/churches/algum-id/assignments", {
      data: { member1Id: "a", member2Id: "b" },
    });
    expect(res.status()).toBe(401);
  });
});
