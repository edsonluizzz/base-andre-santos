# PLAN — E2E /cadastro + Resiliência de pico no plano free

> Criado 2026-06-09 (noite). Decisões: sem Vercel Pro (maximizar free) · Miriam fora do radar.
> Validação SEMPRE no CI/Vercel — nunca rodar `npm run build` local (executa `prisma db push` contra prod).

## Step 1 — E2E do /cadastro no CI (item 1) ✅ em execução

Objetivo: proteger a rota mais crítica da campanha (cadastro público) com testes
Playwright rodando no GitHub Actions contra um Postgres descartável.

1. `package.json`: `@playwright/test` (devDep) + `@prisma/adapter-pg` (dep)
   - lock atualizado via `npm install --package-lock-only` (não toca node_modules — seguro no Drive)
2. `src/lib/db.ts`: escolher adapter pela URL — `neon.tech` → PrismaNeon; senão → PrismaPg
   (produção inalterada; CI/dev local com Postgres comum passa a funcionar)
3. `playwright.config.ts` + `e2e/cadastro.spec.ts`:
   - página renderiza (header, campos, CTA)
   - validação client-side (nome, WhatsApp, LGPD)
   - fluxo completo → tela de sucesso (cria lead de verdade no Postgres do CI)
   - dedup por telefone (2º POST → 200 "Cadastro já realizado")
   - validação da API (payload inválido → 400)
   - rate-limit não-EBOOK (6º POST do mesmo IP em 1min → 429, via header x-forwarded-for)
4. `.github/workflows/deploy-guardian.yml`: novo job `e2e-cadastro`
   - service container postgres:16 · `npm run build` (db push cria o schema no CI)
   - seed da Campaign `andre-santos-2026` via psql (FK do Collaborator exige a linha)
   - `npx playwright test` + artifact do report em caso de falha
5. `.gitignore`: test-results/ + playwright-report/
6. Commit + push + **monitorar o run do Actions até verde**

## Step 2 — Resiliência de pico DENTRO do free (item 2)

Contexto: incidente Gospel Class (500 cadastros simultâneos → ExceedsBillingLimitError
no Hobby → POSTs rejeitados antes do INSERT → 500 pessoas perdidas).

1. `connection_limit`/`pool_timeout` na DATABASE_URL ou no adapter — evitar esgotar
   conexões do Neon em burst
2. Encolher o critical path do POST /cadastro (já é: parse → dedup → rl → create);
   avaliar mover fire-and-forget para `waitUntil` ou fila
3. Fila Upstash QStash (free tier: 500 msg/dia) OU Redis list própria para absorver
   burst acima do que o Hobby aguenta — decidir na implementação com números reais
4. Teste de carga leve no CI (k6 ou autocannon contra `next start` local do CI) para
   medir o ganho — opcional

## Step 3 — Limpeza (backlog)

- Limpar 10 UserCampaigns duplicadas do André
- Remover `/api/n8n/seed-tenants`
- `N8N_IMPORT_WEBHOOK_URL`

---

**Retomar:** se a sessão cair, colar: `Continue o PLAN.md do BASE ANDRE SANTOS — step em andamento`
