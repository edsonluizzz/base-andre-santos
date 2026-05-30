# PLAN — Correções multi-tenant (madrugada 2026-05-30)

Auditoria identificou múltiplos vazamentos cross-tenant. Execução em fases, cada fase = 1 commit + push.

## Fase 1 — Metricool por tenant (resolve o que o usuário viu na Miriam)
- [ ] Schema: `Campaign.metricoolToken`, `Campaign.metricoolBlogId`
- [ ] `api/metricool/instagram/route.ts` — usa credenciais do tenant ativo
- [ ] UI `configuracoes/page.tsx` — campos para conectar Metricool
- [ ] Frontend (`instagram-panel.tsx`, `instagram/page.tsx`) — esconder painel se tenant não conectou
- [ ] API `/api/campaign/metricool` — PATCH para salvar

## Fase 2 — Dashboard panels → tenant DB
- [ ] `velocity-panel.tsx` — receber `db`, `cid` por props
- [ ] `engagement-panel.tsx` — receber `db`, `cid` por props (+ filtrar Attendance por campaignId)
- [ ] `dashboard/page.tsx` — usar `getCampaignContext(session)`
- [ ] `relatorio/page.tsx` — idem
- [ ] `metas/page.tsx` — idem
- [ ] `colaboradores/[id]/page.tsx` — idem
- [ ] `planejamento/page.tsx` — remover `db` global

## Fase 3 — Settings tenant-aware
- [ ] `api/settings/route.ts` — `getCampaignContext`
- [ ] `api/google-calendar/callback/route.ts` — idem
- [ ] `api/google-calendar/sync/route.ts` — idem

## Fase 4 — Telegram por tenant
- [ ] Schema: `Campaign.telegramBotToken`, `Campaign.telegramChatId`
- [ ] `lib/telegram.ts` — `sendTelegram(campaignId, msg)` recebe tenant
- [ ] Atualizar callers para passar campaignId
- [ ] `api/telegram/webhook/route.ts` — identificar tenant pelo bot token na URL `/api/telegram/webhook/[botToken]`
- [ ] UI Configurações — campos Telegram

## Fase 5 — /api/public/cadastro multi-tenant
- [ ] Schema: `Campaign.domain` (já existe slug; precisamos de domain real)
- [ ] Resolver tenant pelo host header
- [ ] `api/public/stats` — idem
- [ ] `cadastro-form.tsx` — WA link via API, não hardcoded

## Fase 6 — Crons multi-tenant
- [ ] `tse-sync`, `gcal-sync`, `agenda-telegram` — iterar `Campaign.findMany({ active: true })`
- [ ] Remover crons fantasma do `vercel.json` (birthday-notifications, nurturing, weekly-report)

## Fase 7 — Z-API por tenant
- [ ] Schema: `Campaign.zApiInstance`, `Campaign.zApiToken`, `Campaign.zApiClientToken`
- [ ] `/api/n8n/config` retorna credenciais Z-API
- [ ] Workflows n8n: ler Z-API via `Buscar config` em vez de hardcoded
- [ ] UI Configurações — campos Z-API

## Fase 8 — Limpezas + memória
- [ ] `notify-referrer` chamado por função local, não HTTP
- [ ] Atualizar memória do projeto
- [ ] Commit final + push

## Notas de execução
- Edson não roda local → sempre `npm run lint` + `npm run build` antes de commit
- Manter fallback `"andre-santos-2026"` em todos os defaults para não quebrar prod
- Cada fase = 1 commit atômico
