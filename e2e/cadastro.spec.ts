import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * E2E do fluxo público de cadastro — a rota mais crítica da campanha.
 *
 * Roda contra um Postgres descartável no CI (ver job e2e-cadastro).
 * O tenant resolve por host → localhost não casa com Campaign.domain →
 * fallback "andre-santos-2026" (linha seedada via psql no workflow).
 *
 * Rate-limit: o servidor identifica o IP pelo header x-forwarded-for.
 * Cada teste de API usa um IP distinto para não interferir nos demais.
 */

/** Telefone celular PR único por chamada (11 dígitos: 41 9XXXX-XXXX). */
function uniquePhone(): string {
  return "419" + String(Math.floor(10_000_000 + Math.random() * 89_999_999));
}

async function postCadastro(
  request: APIRequestContext,
  body: Record<string, unknown>,
  ip: string
) {
  return request.post("/api/public/cadastro", {
    data: { lgpdConsent: true, ...body },
    headers: { "x-forwarded-for": ip },
  });
}

test.describe("Página /cadastro", () => {
  test("renderiza o formulário completo", async ({ page }) => {
    await page.goto("/cadastro");

    await expect(page.getByRole("heading", { name: "André Santos" })).toBeVisible();
    await expect(page.getByPlaceholder("Seu nome completo")).toBeVisible();
    await expect(page.getByPlaceholder("(41) 99999-9999")).toBeVisible();
    await expect(page.getByPlaceholder("Ex: Curitiba")).toBeVisible();
    await expect(page.getByText(/Autorizo o uso dos meus dados pessoais/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Quero fazer parte/ })).toBeVisible();
  });

  test("valida nome, WhatsApp e consentimento LGPD antes de enviar", async ({ page }) => {
    await page.goto("/cadastro");
    const submit = page.getByRole("button", { name: /Quero fazer parte/ });

    // Sem nome
    await submit.click();
    await expect(page.getByText("Informe seu nome completo")).toBeVisible();

    // Nome ok, telefone curto
    await page.getByPlaceholder("Seu nome completo").fill("Teste E2E Playwright");
    await page.getByPlaceholder("(41) 99999-9999").fill("4199");
    await submit.click();
    await expect(page.getByText("Informe um WhatsApp válido")).toBeVisible();

    // Telefone ok, sem consentimento LGPD
    await page.getByPlaceholder("(41) 99999-9999").fill(uniquePhone());
    await submit.click();
    await expect(page.getByText(/concordar com os termos/)).toBeVisible();
  });

  test("cadastro completo cria o lead e mostra a tela de sucesso", async ({ page }) => {
    await page.goto("/cadastro");

    await page.getByPlaceholder("Seu nome completo").fill("Apoiador E2E Sucesso");
    await page.getByPlaceholder("(41) 99999-9999").fill(uniquePhone());
    await page.getByPlaceholder("Ex: Curitiba").fill("Curitiba");

    // O checkbox real é sr-only — clica na área do quadrado dentro do label LGPD
    await page
      .locator("label", { hasText: "Autorizo o uso dos meus dados pessoais" })
      .click({ position: { x: 14, y: 14 } });

    await page.getByRole("button", { name: /Quero fazer parte/ }).click();

    await expect(page.getByRole("heading", { name: "Cadastro realizado!" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Cadastrar próxima pessoa/ })).toBeVisible();
    // collaboratorId retornado → link pessoal de indicação na tela
    await expect(page.getByText(/cadastro\?refc=/)).toBeVisible();
  });
});

test.describe("API /api/public/cadastro", () => {
  test("payload inválido retorna 400 (sem LGPD e telefone curto)", async ({ request }) => {
    const semLgpd = await request.post("/api/public/cadastro", {
      data: { name: "Sem Consentimento", phone: uniquePhone() },
      headers: { "x-forwarded-for": "10.0.1.1" },
    });
    expect(semLgpd.status()).toBe(400);

    const foneCurto = await postCadastro(
      request,
      { name: "Fone Curto", phone: "419" },
      "10.0.1.2"
    );
    expect(foneCurto.status()).toBe(400);
  });

  test("dedup por telefone: segundo POST retorna 200 sem criar duplicata", async ({ request }) => {
    const phone = uniquePhone();
    const ip = "10.0.2.1";

    const first = await postCadastro(request, { name: "Dedup Primeiro", phone }, ip);
    expect(first.status()).toBe(201);
    const firstBody = await first.json();
    expect(firstBody.collaboratorId).toBeTruthy();

    const second = await postCadastro(request, { name: "Dedup Segundo", phone }, ip);
    expect(second.status()).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.message).toContain("já realizado");
    // Mesmo registro — não criou um novo colaborador
    expect(secondBody.collaboratorId).toBe(firstBody.collaboratorId);
  });

  test("rate-limit não-EBOOK: 6º cadastro do mesmo IP em 1 min retorna 429", async ({ request }) => {
    const ip = "10.0.3.1";

    for (let i = 1; i <= 5; i++) {
      const res = await postCadastro(
        request,
        { name: `Burst Spam ${i}`, phone: uniquePhone() },
        ip
      );
      expect(res.status(), `cadastro ${i}/5 dentro da cota deve passar`).toBe(201);
    }

    const sixth = await postCadastro(
      request,
      { name: "Burst Spam 6", phone: uniquePhone() },
      ip
    );
    expect(sixth.status()).toBe(429);
  });

  test("source EBOOK_* tem cota alta: 10 cadastros seguidos do mesmo IP passam", async ({ request }) => {
    const ip = "10.0.4.1";

    for (let i = 1; i <= 10; i++) {
      const res = await postCadastro(
        request,
        { name: `Evento Ebook ${i}`, phone: uniquePhone(), source: "EBOOK_E2E" },
        ip
      );
      expect(res.status(), `cadastro EBOOK ${i}/10 deve passar`).toBe(201);
    }
  });

  test("source EVENTO tem cota alta: 10 cadastros do mesmo IP (WiFi compartilhado) passam", async ({ request }) => {
    const ip = "10.0.5.1";

    for (let i = 1; i <= 10; i++) {
      const res = await postCadastro(
        request,
        { name: `Evento Presencial ${i}`, phone: uniquePhone(), source: "EVENTO" },
        ip
      );
      expect(res.status(), `cadastro EVENTO ${i}/10 deve passar`).toBe(201);
    }
  });
});
