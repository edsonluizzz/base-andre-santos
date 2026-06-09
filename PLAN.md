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

**Diagnóstico:** o gargalo do Hobby é COTA DE USO (invocações/CPU), não o banco.
500 POSTs são triviais; o que estourou foi o custo por VISITANTE (page render +
middleware edge + stats + CEP por pessoa). Estratégia = dieta de invocações:

1. ✅ `middleware.ts`: matcher exclui rotas públicas de alto tráfego (`/cadastro`,
   `/ebook`, `/privacidade`, `/r`, `/api/public`, `/api/cep`) — zero invocação edge
   nessas superfícies; página estática sai 100% do CDN
2. ✅ `/cadastro/page.tsx`: `force-static` explícito (regressão de custo quebra o build)
3. ✅ `/api/public/stats`: `s-maxage=300` — 1 query/5min em vez de 1 por visitante
4. ✅ `/api/cep/[cep]`: `s-maxage=86400` — CEPs repetidos do mesmo evento saem do CDN
5. ❌ Fila QStash: NÃO adotada — o critical path do POST já é mínimo (parse → dedup
   indexado → rate-limit → insert) e o problema era cota, não throughput de banco.
   Reavaliar só se um evento real mostrar saturação de INSERT.
6. ❌ Pool tuning (connection_limit): NÃO mexido — DATABASE_URL já usa endpoint
   `-pooler` (pgbouncer da Neon); reduzir o pool do client só criaria fila artificial.

## Step 3 — Limpeza (backlog)

- Limpar 10 UserCampaigns duplicadas do André
- Remover `/api/n8n/seed-tenants`
- `N8N_IMPORT_WEBHOOK_URL`

---

**Retomar:** se a sessão cair, colar: `Continue o PLAN.md do BASE ANDRE SANTOS — step em andamento`
