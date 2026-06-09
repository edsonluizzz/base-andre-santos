import { defineConfig, devices } from "@playwright/test";

/**
 * E2E do fluxo público de cadastro (/cadastro).
 *
 * Roda no CI (job e2e-cadastro do deploy-guardian.yml) contra um Postgres
 * descartável — NUNCA contra produção. O webServer assume `npm run build`
 * já executado (o build roda `prisma db push`, que cria o schema no CI).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  // O rate-limit in-memory do servidor é compartilhado entre os testes —
  // 1 worker mantém a contagem de requests determinística.
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
