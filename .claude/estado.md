# Estado — Ovile Eleitoral (Base André Santos)

**Última atualização:** 2026-06-06 (Sprint 24 — auditoria completa + correções de segurança crítica)

---

## Incidente — Z-API Client-Token corrompido (2026-06-06, RESOLVIDO)

**Sintoma:** WhatsApp parou de enviar (WF3/WF4) após a remoção do Z-API hardcoded.
**Causa raiz:** `Campaign.zApiClientToken` no banco estava num formato de cripto ANTIGO
(sem prefixo `v1:`). `decrypt()` (crypto.ts:59) retorna o valor cru quando não há `v1:`
(assume "legado plain") → entregava 104 chars de ciphertext ao n8n → Z-API rejeitava o
header Client-Token → 0 mensagens. Antes ficava mascarado porque o código usava o
Client-Token hardcoded como fallback; ao removê-lo (Sprint 24 segurança), o valor
corrompido do banco passou a valer.
**Fix:** Edson recolou o Client-Token correto em /configuracoes → Integrações → re-salvou
com encrypt() atual (gera `v1:`) → decrypt volta a funcionar (34 chars). Diagnóstico via
`GET /api/n8n/config` (clientTokenLen 104→34) + Z-API `/status` (connected=true).
**Lição:** ao migrar/remover fallback de credencial, validar que o valor do banco
descriptografa para um formato plausível. Possível hardening futuro: sanity-check de
comprimento no config/route.ts (cair no env fallback se o token resolvido for implausível).

---

## Sprint 24 (2026-06-06) — Auditoria Profunda + Segurança Crítica

Auditoria em 4 eixos (segurança 4/10, performance 6.5/10, qualidade ~7/10, design 6.5/10).

### Correções de segurança aplicadas (frente "Segurança crítica")
- **Z-API hardcoded removido** (`api/n8n/config/route.ts`): instance/token/client-token
  saíram do código → agora vêm de env vars `ZAPI_INSTANCE` / `ZAPI_TOKEN` / `ZAPI_CLIENT_TOKEN`.
  ✅ **RESOLVIDO 2026-06-06:** Edson rotacionou no Z-API e salvou em /configuracoes →
  Integrações (gravado criptografado em Campaign.zApi*, lido via getCampaignIntegrations).
  Não precisou de env var (banco tem prioridade). Credenciais antigas do Git = lixo.
- **IDOR cadastro público fechado** (`lib/tenant-resolver.ts`): tenant resolve EXCLUSIVAMENTE
  pelo host. Removidos ramos `header`/`explicit` que permitiam inserir leads cross-tenant
  via `campaignId` no body. `cadastro/route.ts` não passa mais `explicitCampaign`.
- **/api/settings GET** não retorna mais `googleRefreshToken` (mesmo criptografado) — só
  `googleCalendarConnected` (boolean). `configuracoes/page.tsx` ajustado.
- **5 endpoints debug/one-shot removidos:** `debug-env`, `debug-tenants`, `debug-city`,
  `backfill-toledo`, `normalize-phones`. Mantidos `seed-tenants`/`seed-whatsapp-groups`
  (provisionamento Miriam pendente).

### Frente "Resiliência/burst" — APLICADA (2026-06-06)
- ✅ +3 índices quentes em Collaborator (registeredById+status, lastContactedAt, supportStatus)
- ✅ `ranking`/`my-cell`/`collaborators/stats`/`mapa` migrados para `groupBy` (não puxam
  mais a tabela inteira p/ agregar em JS)
- ✅ Import em lote: N+1 eliminado (dedup + responsável pré-carregados em Map/IN; 1000+
  queries → ~2 + creates) + `maxDuration=60`
- ✅ `maxDuration=60` em relatorio/export, export-xlsx, collaborators/export, whatsapp/broadcast
- ⚠️ **PENDENTE (requer backfill — fazer com Edson presente):** dedup do **cadastro público**
  ainda usa `phone: { contains }` (full-scan por request). Solução: campo `phoneNormalized`
  indexado + igualdade. Não feito agora pois backfill de registros legados é operação de
  dados delicada. Risco residual de burst no /cadastro permanece (mitigado por dedup-antes-
  do-rate-limit + fire-and-forget já existentes).
- ℹ️ `xlsx` (parse client) e `exceljs` (geração server) são ambos necessários — não remover.

### Backlog da auditoria (frentes não escolhidas)
### Frente "Build/qualidade" — PARCIAL (2026-06-06)
- ✅ `zod` declarado em package.json (^3.25.76) + lock sincronizado (era transitivo; risco
  de quebrar build da captação de leads)
- ✅ Dead code removido: `src/context/` (vazia), `api/admin/seed-tenant-db/` (vazia),
  `prisma.config.ts.bak`
- ⚠️ `tsc --noEmit` NÃO rodado: ambiente do Drive tem node_modules incompleto e `npm install`
  trava/lentíssimo (sync do Drive). Recomendação: rodar `npm install && npx tsc --noEmit`
  num clone local fora do Drive, OU setar `ignoreBuildErrors:false` num deploy de preview
  pra ver os erros no log da Vercel. Auditoria estática não achou erros graves além de casts contidos.
- 📌 NÃO feito (decisão/risco): `prisma db push --accept-data-loss` no build → migrate deploy
  (exige migrations versionadas); 130 console.log → logger condicional; next-auth.d.ts p/ tipos.

### Backlog da auditoria (frente não escolhida)
### Frente "Design/UX" — APLICADA (2026-06-06)
- ✅ `button.tsx`: glow hover indigo → gold (afetava todo botão primário)
- ✅ `gradient-title` + `page-header` em 17 páginas (zonas, grupos, tarefas, agenda, metas,
  planejamento, instagram, eleitos-2022, campanhas, nova-campanha, colaboradores,
  colaboradores/[id], configuracoes, mapa, super-admin, comunicados/disparar; onboarding só
  gradient-title por ser hero centralizado). + dashboard/comunicados que já tinham.
- ✅ h1 padronizado `text-xl lg:text-2xl` (planejamento saiu de text-3xl)
- ✅ Empty states ricos com CTA: zonas/grupos/tarefas; loading `animate-shimmer` nas mesmas
- ✅ `min-w-[640px]` nas tabelas do planejamento (scroll mobile)
- 📌 Backlog (não feito): `completar-perfil-form.tsx` (refactor estilos inline → tokens, a mais
  defasada); acessibilidade fina (aria-label em botões ícone-only, `htmlFor`+`id` nos forms,
  contraste de `text-muted-foreground/30-40`); `animate-fade-in-up` em grids; empty-CTA em metas/mapa.
- **Outros seguranças (não-críticos):** CSP com unsafe-inline/unsafe-eval, cron fail-open
  se CRON_SECRET ausente, telegram webhook sem secret-token, comparação Bearer não timing-safe.

---

## Sprint 23 (2026-06-06) — Unificação Menus Células + Design System Upgrade (anterior)

---

## Sprint 23 (2026-06-06) — Unificação Menus Células + Design System Upgrade

### Unificação menus Células/Minha Célula/Ranking (concluído)
- `/celulas/page.tsx` reescrito como página com 3 abas: **Minha Célula | Todas as Células | Ranking**
- `/minha-celula/page.tsx` e `/ranking/page.tsx` → redirect simples para `/celulas`
- Sidebar: 3 itens → 1 item "Células" (minRole MEMBER); `Trophy` removido do import, `Star` mantido (usado no header)
- Mobile bottom nav: "Relatório" substituído por "Células"; indicador ativo corrigido (dot, não absolute bar)
- Aba padrão: "Minha Célula" (estado local `useState`, sem `useSearchParams` — evita Suspense boundary)

### Design System Upgrade (concluído)
**`globals.css`:**
- `glass-card` ganhou `transition` + hover glow (ring gold sutil)
- `animate-fade-in-up` e variantes escalonadas (-1 a -4)
- `animate-shimmer` para loading states (dark + light)
- `.page-header` com underline gradiente gold via `::after`
- `.gradient-title` texto em gradiente gold (dark + light)
- `.stat-pill` badge numérico padrão
- Body gradient mais rico (3 color stops)

**Dashboard `page.tsx`:**
- H1 com `gradient-title` e container `page-header`
- Barras "Por Cargo" com cores individuais por cargo (`ROLE_BAR_COLOR`) e altura h-2
- Cards de município: hover, número `text-2xl font-black`
- Estado vazio "Próximos Eventos" com ícone + link "Agendar evento"
- Contadores Minha Célula com bordas coloridas (primary/green)
- Banner onboarding com ícone Star animado

**KPI Card:**
- Glow hover dinâmico baseado na cor da prop (não gold fixo)
- Ícone container com fundo colorido a 8% de opacidade
- Barra colorida na base (w-12 → w-full ao hover), derivada da cor
- Padding mobile p-3 → p-3.5

**Comunicados:**
- Header responsivo (flex-col sm:flex-row) + `gradient-title`
- Cards com barra lateral gold (gradient from-primary/60 to-primary/20)
- Audiência e sentCount como pills com borda
- Loading substituído por `animate-shimmer`
- Estado vazio elaborado com ícone + CTA "Primeiro Comunicado"
- Contador audiência como pill destacado

**Sidebar:**
- Grupos de navegação com labels: **Base / Coordenação / Administração** (apenas quando expandida)
- Colapsada: comportamento inalterado (ícones + tooltip)

---

## Sprint 22 (2026-06-04 → 05) — Roteamento Regional + Fix n8n Webhooks

### Roteamento regional WhatsApp (concluído)
Quando lead responde SIM ao WF2, sistema identifica city → mapeia PRRegion → busca WhatsAppGroup dessa região → retorna link correto no welcome (ao invés de link fixo).

- **Schema:** enum `PRRegion` (RMC/LITORAL/NORTE/NOROESTE/OESTE/SUDOESTE/SUL/CENTRO/OUTROS) + `WhatsAppGroup.region` + `WhatsAppGroup.isFallback`.
- **`src/lib/pr-regions.ts`** — ~150 municípios PR mapeados (`regionForCity(city)` → enum). Normaliza acento+caixa, fallback OUTROS.
- **Endpoints (Bearer N8N_API_KEY):**
  - `POST /api/n8n/seed-whatsapp-groups` — cria/atualiza 4 grupos (OESTE, LITORAL, SUDOESTE, GERAL fallback). Já executado em prod.
  - `GET /api/n8n/group-for-lead?phone=X` — resolve grupo pelo telefone.
  - `GET /api/n8n/find-lead?city=X` — busca leads por city contains.
  - `POST /api/n8n/trigger-lead?lead_id=X` — dispara WF3 manualmente (testes).
  - `GET /api/n8n/debug-env` — inspeciona metadata das envs sem revelar (length, prefix, hasAngleBrackets).
- **`/api/n8n/config?lead_phone=X`** — quando passado, resolve grupo regional e substitui `{groupLink}` no welcome. Retorna `groupRegion` + `groupSource`.
- **WF2 atualizado via API n8n** — passa `lead_phone={{encodeURIComponent($('Extrair telefone e texto').item.json.fromPhone)}}` no node "Buscar config Ovile". PUT 200, active=True.

### Fix paths webhooks n8n WF4/WF5 (concluído código + n8n; env Vercel PENDENTE validação)
**Bug raiz:** WF4 e WF5 estavam com mesmo path `ovile-disparo-manual`. No n8n cloud só 1 workflow ativo escuta por path → bulk-invite (que esperava WF4) era recebido pelo WF5, que quebrava no node "Buscar próxima delivery" com 400 "broadcastId obrigatório". **Nenhuma mensagem bulk-invite foi enviada de verdade até 2026-06-04.** Pior: WF4 (disparo-manual) **nunca tinha sido importado no n8n cloud** — só existia o JSON local.

Padronização aplicada:
| WF | ID n8n | Path |
|---|---|---|
| WF1 disparo-agendado | `3zMetjbtuIUt3JGX` | (cron) — INACTIVE |
| WF2 resposta-whatsapp | `ZDkd1oS1P8VdSh2l` | `ovile-resposta-wa` ATIVO |
| WF3 lead-novo-imediato | `u7pCdMoHT5uqZKet` | `ovile-lead-novo` ATIVO |
| WF4 disparo-manual | `gw1BlNhKzLAU1ukz` (NOVO) | `ovile-bulk-invite` ATIVO |
| WF5 broadcast-manual | `9UD6uQGhOtLQjbAz` | `ovile-broadcast` ATIVO (renomeado) |

- `broadcast/route.ts` agora usa `N8N_BROADCAST_WEBHOOK_URL` (fallback `N8N_MANUAL_WEBHOOK_URL`).
- `triggerManualInviteBatch` em `lib/n8n.ts` ganhou log detalhado (url preview + err.name no catch + body da resposta).

### ⚠️ PENDENTE — env Vercel
Durante o teste de validação, logs mostraram URL ainda começando com `<http...` — env `N8N_MANUAL_WEBHOOK_URL` ainda tinha `<` e `>` em volta do valor. Após o usuário corrigir e redeployar (último deploy `dpl_HUhGZX...` READY), **o teste end-to-end não foi feito ainda**.

Envs corretas Vercel Production (devem estar sem `<>`, sem aspas, sem espaços):
```
N8N_MANUAL_WEBHOOK_URL=https://andresantos.app.n8n.cloud/webhook/ovile-bulk-invite
N8N_BROADCAST_WEBHOOK_URL=https://andresantos.app.n8n.cloud/webhook/ovile-broadcast
```

Validar: bulk-invite Foz → WF4 → 2-4min → lead recebe → SIM → WF2 → welcome com link OESTE.

---

**Última atualização anterior:** 2026-05-31 (Sprint 14 + WF2 reimport + fix phone lookup; card n8n nas Integrações; ebook capture aguardando decisão)
**Plano de produto:** `.claude/ovile-plano.md` — SaaS multi-tenant eleitoral
**Domínio:** ovile.com.br (migrado do projeto Ovile igreja)
**GitHub:** https://github.com/edsonluizzz/base-andre-santos
**Deploy:** Vercel — base-andre-santos.vercel.app · último deploy: `fb2f05e` (READY)

---

## Status Atual

Sistema funcional e em produção. Terminologia "Base de Apoio" (não "campanha") em todos os textos visíveis — requisito legal pré-campanha.

---

## Módulos

| Módulo | Rota | Status |
|--------|------|--------|
| Planejamento | `/planejamento` | ✅ ADMIN only · análise STRIDE × sistema · GAPs dinâmicos via $queryRaw |
| Dashboard | `/dashboard` | ✅ KPIs + VelocityPanel (crescimento/semana por cidade) + FunnelPanel |
| Colaboradores | `/colaboradores` | ✅ XLSX/CSV import (upsert duplicatas · CEP auto · responsavel_email) · filtros avançados (origem, perfil, canal, apoio, cidade, líder) · seleção em massa · bulk status · alerta 30d+ sem contato · "Marcar contato hoje" |
| Perfil colaborador | `/colaboradores/[id]` | ✅ score breakdown (5 componentes) · canal/fonte/lastContactedAt · histórico completo presenças |
| Mapa de Apoio | `/mapa` | ✅ choropleth PR · zoom/pan · tooltip hover · cards clicáveis por status de apoio |
| Zonas | `/zonas` | ✅ |
| Grupos WhatsApp | `/grupos` | ✅ quick assign zona inline (GAP7) · gerenciamento de membros |
| Agenda | `/agenda` | ✅ calendário mensal + lista · modal detalhe · painel do dia · sync Google Calendar bidirecional · AttendanceDialog (presenças P/A/J) · QR Code evento |
| Comunicados | `/comunicados` | ✅ filtro por audiência + envio real Telegram + email Resend batch · sentCount real |
| Configurações | `/configuracoes` | ✅ logo · join code · Google Calendar · botão "Sugerir metas TSE/IBGE" · botão "Recalcular scores" |
| Relatório | `/relatorio` | ✅ KPI cards clicáveis · filtros · funil · crescimento · capital político · CSV + XLSX · EngagementPanel (top presenças, top scores, alertas 30d+) |
| Minha Célula | `/minha-celula` | ✅ tier · stats · link de convite · gestão de status · **Minhas Tarefas** (checkbox, prazo colorido, prioridade) |
| Tarefas | `/tarefas` | ✅ ADMIN only · todas as tarefas agrupadas por usuário · filtros PENDING/DONE/ALL · toggle/delete · modal nova tarefa com seletor de responsável |
| Metas | `/metas` | ✅ Meta × Realizado por município · velocidade +X/sem · data estimada colorida · KPI "Crescendo" |
| Instagram | `/instagram` | ✅ grid posts/reels · KPIs · range 7/30/90d · widget no dashboard (req. METRICOOL_TOKEN) |
| Células | `/celulas` | ✅ visualização hierárquica |
| Ranking | `/ranking` | ✅ scroll horizontal mobile |
| Super Admin | `/super-admin` | ✅ todas as seções expansíveis (acesso, pendentes, links, duplicatas, auditoria) |
| Cadastro público | `/cadastro` | ✅ sem auth · Short YouTube `z_9zver8iN0` (9:16 autoplay) · auto-copia link pessoal · redirect automático grupo WA em 60s · link compartilhável · channel via ?ch= |
| Instagram | `/instagram` | ✅ grid posts/reels · KPIs · range 7/30/90d · correlação posts×cadastros · widget dashboard |
| Convite por link | `/entrar?token=X` | ✅ email-first flow · Google OAuth · completar-perfil |
| Privacidade | `/privacidade` | ✅ LGPD Art. 9 · público |
| Notificações | sidebar | ✅ badge de não lidas · dropdown · marcar como lida |
| Onboarding | `/onboarding` | ✅ boas-vindas + tour de features |

---

## APIs

- `/api/collaborators` — CRUD + filtros (role, status, city, mine, registeredBy, sourceType, profile, channel, supportStatus, **dateFrom/dateTo** por createdAt) · search inclui `source` · POST chama `ensureCityGoal` automaticamente
- `/api/collaborators/[id]` — GET/PUT/DELETE
- `/api/collaborators/[id]/contact` — POST: marca `lastContactedAt = now()`
- `/api/collaborators/import` — bulk XLSX/CSV (max 500 linhas) · upsert por telefone · lookup CEP automático · `responsavel_email` para atribuir a outro usuário · `source` sempre "IMPORTACAO_XLSX" · origem vai para `notes`
- `/api/collaborators/bulk` — PATCH status/campaignRole/supportStatus em massa (max 500)
- `/api/events/[id]/attendance` — GET lista presenças · POST batch (delete+createMany, recalcula score)
- `/api/tasks` — GET (`?all=true` para ADMIN retorna todas com nome) · POST cria tarefa
- `/api/tasks/[id]` — PATCH toggle PENDING↔DONE · DELETE
- `/api/tse/municipios-pr` — GET (ADMIN) sugestões de meta: 0,5% eleitorado PR 2022
- `/api/cron/gcal-sync` — GET autenticado por CRON_SECRET (schedule: 04h UTC diário)
- `/api/broadcasts` — POST: busca emails por audiência, dispara Resend batch + Telegram, salva sentCount
- `/api/broadcasts/count` — GET contagem por audiência
- `/api/mapa` + `/api/mapa/stats` — lideranças por cidade
- `/api/admin/users` — listar/convidar usuários
- `/api/admin/users/[id]` — atualizar/revogar
- `/api/admin/recalc-scores` — recalcula mobilizationScore (com attendanceCount via groupBy)
- `/api/google-calendar/connect`, `/callback`, `/sync` — OAuth + sync bidirecional
- `/api/public/cadastro` — sem auth, rate limit 5/min, source whitelist (EVENTO/INSTAGRAM/WHATSAPP), notifica líder da zona + Telegram
- `/api/invite-links` · `/api/invite/validate` · `/api/invite/pre-auth` · `/api/invite/complete-profile`
- `/api/notifications` · `/api/notifications/[id]` · `/api/notifications/read-all`
- `/api/municipios` — 399 municípios PR com cache 24h
- `/api/cep/[cep]` — proxy ViaCEP (público)
- `/api/municipality-goals` — GET/PUT/DELETE (ADMIN)
- `/api/telegram/webhook` — POST (público) dispatch: /novo /lista /stats /municipio /ajuda
- `/api/telegram/register-webhook` — GET (ADMIN) registra webhook no Telegram
- `/api/telegram/status` — GET (ADMIN) diagnóstico: urlMatch, bot info

---

## Schema

### Collaborator
`campaignRole`, `status` (LEAD/ACTIVE/INACTIVE), `profile`, `supportStatus`, `source`, `channel CollaboratorChannel?`, `mobilizationScore Float?`, `contributionTypes String[]`, `registeredById String?`, `lgpdConsent`, `lgpdConsentAt`, **`lastContactedAt DateTime?`**

### Task
`id`, `campaignId` (@default "andre-santos-2026"), `title`, `description?`, `assignedToId`, `createdById`, `dueDate DateTime?`, `status TaskStatus` (PENDING/DONE), `priority TaskPriority` (LOW/NORMAL/HIGH), `createdAt`, `updatedAt`
Índices: campaignId, assignedToId, status

### Attendance
`id`, `eventId`, `collaboratorId?`, `guestName?`, `status` (PRESENT/ABSENT/JUSTIFIED), `createdAt`, `updatedAt`

### MunicipalityGoal
`campaignId`, `city` (unique), `targetVotes Int`, `targetLeaders Int`

### UserCampaign
`tier CollaboratorTier` (APOIADOR/ATIVISTA/LIDER_CELULA/COORDENADOR)
Thresholds: 0–4 APOIADOR · 5–14 ATIVISTA · 15+ LIDER_CELULA · COORDENADOR manual

### InviteLink
`token @unique`, `role`, `expiresAt DateTime?`, `useCount Int`, reutilizável

### Settings
`campaignName`, `logoBase64`, `googleRefreshToken`

---

## mobilizationScore — src/lib/mobilization.ts

`score = PROFILE_BASE[profile] × SUPPORT_MULT[supportStatus] × STATUS_MULT[status] + contributionTypes.length × 3 + min(20, attendanceCount × 2)`
Recalcular: POST `/api/admin/recalc-scores` ou botão em /configuracoes

---

## Hierarquia de Acesso

| Papel | Módulos visíveis |
|-------|-----------------|
| MEMBER | Dashboard, Colaboradores, Minha Célula, Células, Ranking |
| LEADER | + Mapa, Zonas, Grupos WA, Agenda, Relatório, Metas |
| ADMIN | + Comunicados, Configurações, Super Admin, Planejamento, Tarefas |

---

## Env Vars no Vercel

```
DATABASE_URL · AUTH_SECRET · AUTH_GOOGLE_ID · AUTH_GOOGLE_SECRET · APP_URL
ADMIN_EMAILS = edsonluizz.silva@gmail.com
SUPER_ADMIN_EMAILS = edsonluizz.silva@gmail.com
```
Opcionais:
```
METRICOOL_TOKEN         → analytics Instagram via Metricool API (userId=4802533 · blogId=6229175)
RESEND_API_KEY          → emails de convite e broadcast
RESEND_FROM             → "Base André Santos <noreply@...>"
BLOB_READ_WRITE_TOKEN   → upload de logo
GOOGLE_CALENDAR_CLIENT_ID / CLIENT_SECRET / REDIRECT_URI / ID
TELEGRAM_BOT_TOKEN      → notificações + comandos no canal
TELEGRAM_CHAT_ID        → ID do canal (ex: -1002xxxxx)
CRON_SECRET             → valida chamadas dos cron jobs
```

---

## Recursos-chave

### Telegram Bot
- Webhook registrado ✅ (2026-05-09)
- `/api/telegram/*` liberado no middleware auth (isPublic)
- Comandos: /novo /lista /stats /municipio /ajuda
- Notificações: novo lead via /cadastro, broadcast, agenda matinal 10h UTC
- Crons (vercel.json): `0 10 * * *` digest · `0 14/18/22 * * *` agenda do dia se houver eventos

### Google Calendar
- Sync bidirecional manual (botão /agenda) + cron automático `0 4 * * *`
- Conta: andrelnsantos.as@gmail.com · Projeto GCP: "Calendario Andre Santos"
- Client ID: 375239227006-edgpcjo9o037dcs8kf4h1806vln6r9q6.apps.googleusercontent.com

### vercel.json — crons ativos
```json
birthday-notifications: 0 11 * * *
nurturing:              0 13 * * *
weekly-report:          0 10 * * 0
agenda-telegram:        0 10/14/18/22 * * *  (4 entradas separadas)
gcal-sync:              0 4 * * *             (1×/dia — Hobby plan limit)
```
**IMPORTANTE:** Hobby plan = máx 1×/dia por cron. `0 */N * * *` com N<24 quebra deploys silenciosamente.

---

## Pendências

### Ações manuais do admin
- [x] **YouTube:** vídeo definitivo `z_9zver8iN0` (Shorts) · aspecto 9:16 · countdown 60s antes do redirect WA (2026-05-14)
- [x] **Scores:** /configuracoes → "Recalcular scores agora" — executado em 2026-05-14
- [x] **Metas TSE:** automáticas — `ensureCityGoal` dispara em todos os fluxos (form público, admin, import, cron, sync manual) · sincronizado em 2026-05-14
- [x] **Normalização de cidades:** botão em /configuracoes · lista oficial 399 municípios PR
- [x] **Metas sincronizadas:** "Sincronizar metas agora" executado em 2026-05-14
- [x] **Importação Gospel Class:** 1652 leads importados em 2026-05-12
- [x] **Leads pré-fix:** /configuracoes → "Corrigir origem de leads antigos" — executado em 2026-05-14

### Análise adversária — Mara Lima 2022
- [x] **ZIP TSE baixado** e script executado (2026-05-16) · 357.452 votos · 399 municípios
- [x] **`src/data/mara-lima-2022.json`** commitado
- [x] **Painel em `/metas`** — cruzamento Meta × Mara Lima 2022 × Ativos por município · prioridade crítica/alta/média/ok

### Integrações pendentes
- [ ] **Evolution API:** WhatsApp para ativação da base — decisão 2026-05-13 (ver seção abaixo) · aguardando número dedicado + instância
- [x] **Metricool:** integração completa (2026-05-17/18)
  - [x] Sprint 1+2: proxy API · widget dashboard · página /instagram (posts, reels, KPIs, range 7/30/90d)
  - [x] Sprint 3: /r?src=instagram → UTM tracking → channel salvo no banco
  - [x] Sprint 4: correlação posts × cadastros por dia (gráfico em /instagram)
- [ ] **Compliance ago/2026:** CNPJ coligação + registro SPCE

---

## Próximo Sprint — Comunicação WhatsApp (Evolution API)

**Decisão (2026-05-13):** Evolution API escolhida como ferramenta de WhatsApp para ativar a base.

| Fase | Escopo |
|------|--------|
| Fase 1 — Infraestrutura | Subir instância Evolution API (cloud ou self-hosted) · número dedicado · conectar via QR Code |
| Fase 2 — Integração básica | Botão "Enviar WhatsApp" no card do colaborador (wa.me) · broadcast manual via painel /comunicados |
| Fase 3 — API completa | Webhook Evolution → CRM (mensagens recebidas) · templates de ativação · histórico de contato |
| Fase 4 — Compliance | Avaliar migração para Meta Cloud API antes do registro de candidatura (ago/2026) |

**Pré-requisitos antes de implementar:**
- Definir número dedicado para a campanha (não usar pessoal)
- Instância Evolution API: cloud (evolutionapi.com ~R$80/mês) ou self-hosted (VPS ~R$30/mês)
- Testar envio manual antes de integrar ao código

---

## Metricool — Concluído (2026-05-17/18)

| Sprint | Entregável | Status |
|--------|------------|--------|
| 1+2 | Proxy `/api/metricool/instagram` · widget dashboard · página `/instagram` | ✅ |
| 3 | `/r?src=instagram` → UTM → `channel` salvo no banco | ✅ |
| 4 | Correlação posts × cadastros por dia em `/instagram` | ✅ |

**Env vars necessárias:** `METRICOOL_TOKEN` (já adicionado ao Vercel)
**blogId:** 6229175 · **userId:** 4802533 · **Instagram:** @andresantos_as
**Link UTM Instagram:** `/r?src=instagram` (sem ref) ou `/r?src=instagram&ref={userId}`

---

## UX — correções 2026-05-18

- **Sidebar nome/foto:** `serverName` e `serverImage` passados do layout (server) para o Sidebar — elimina flash de "Usuário"/"U" enquanto useSession carrega
- **Super Admin:** 5 seções expansíveis com chevron, badge de contagem e estado padrão correto (Com acesso e Pendentes abertos por padrão)
- **lucide-react:** ícone `Instagram` não existe — usar `Camera` como substituto

## Entregas sprint 2026-05-20

- ✅ **Fix 3 bugs criação de campanha** (commit `fb2f05e`):
  - `provision/route.ts`: `neonData` declarado dentro de bloco `if` mas referenciado fora → ReferenceError silencioso (modo auto quebrado)
  - `campaigns/route.ts`: catch retornava "Erro interno" genérico; adicionado check de slug duplicado + erro real exposto no response
  - `auth.ts` session callback: `isSuperAdmin` re-avaliado em toda sessão — tokens antigos chegavam como `false`
- ✅ **Banco Neon tenant inicializado**: `ep-steep-poetry-acb6x32c` · prisma db push via C:\tmp (Google Drive trava npm)
- ⚠️ **Workflow**: Google Drive/OneDrive travam npm install — mover projetos para `C:\Projetos\` ou usar GitHub Codespaces
- ⏳ **Sprint 4 ISSACAR** (próximo): roteamento de tenant — JWT dinâmico por campanha · slug/subdomínio · convite de admin do tenant

## ISSACAR.IA — Multi-tenant (Sprints 1–3) — 2026-05-19

### O que foi feito
- **Sprint 1:** Branch `v2/issacar` + schema Campaign expandido (`slug`, `dbUrl`, `plan`, `active`, `adminEmail`, `candidateName`, `party`, `district`, `electionYear`, `primaryColor`, `secondaryColor`) · `meta-db.ts` · `tenant-db.ts` · `campaign-context.ts` · `next-auth.d.ts` com `dbUrl`/`campaignId` no JWT
- **Sprint 2:** 47 rotas API convertidas para `getCampaignContext(session)` → `{ db, cid }` (Python bulk script) · `const CID = cid` adicionado em todas as rotas · mergeado em `main`
- **Sprint 3:** `/campanhas` (lista) · `/nova-campanha` (form) · sidebar com `superAdminOnly` flag · `/api/admin/campaigns` CRUD · `/api/admin/campaigns/provision` (Vercel API → Neon API fallback) · `tenant-init-sql.ts` · `.vercelignore` para excluir CSVs TSE (4.3 GB)

### Padrão de acesso ao banco (crítico)
```ts
// pages (sem auth de rota): usa db global + CID do session
import { db } from "@/lib/db";
const CID = session?.user?.campaignId ?? "andre-santos-2026";

// API routes: usa getCampaignContext
const { db, cid } = getCampaignContext(session);
const CID = cid;
```
`getCampaignContext` → usa `globalDb` quando dbUrl == `DATABASE_URL` (tenant principal), `getTenantDb` para URLs diferentes (futuros tenants).

### Status do provisionamento
- **Neon API direta:** bloqueada — org André Santos é "managed by Vercel"
- **Vercel Storage API:** endpoint `/v1/storage/databases` retorna `not_found` (não disponível na conta atual)
- **Solução atual:** Modo Manual (Recomendado) — usuário cria Neon via Vercel Marketplace, cola DATABASE_URL no form, roda `prisma db push` localmente
- **Pendência:** criar campanha via form ainda tem problema (a investigar na próxima sessão)
- **Script local:** `temporaria/init-tenant-db.ps1 -DbUrl "postgresql://..."` roda `prisma db push` contra novo banco

### Módulos super-admin adicionados
| Rota | Status |
|------|--------|
| `/campanhas` | ✅ lista com contagem de colaboradores/operadores + status DB |
| `/nova-campanha` | ✅ form modo manual (padrão) + automático · pendente bug ao criar |

### Regressões corrigidas
- `ReferenceError: CID is not defined` em 47 rotas → fix `const CID = cid` (commit `13188d6`)
- Pages zeradas (dashboard, metas, relatorio, colaboradores/[id]) → restaurado `import { db }` global (commit `3330d22`)
- Login quebrado após merge → revertido upsert do Campaign no signIn (commit na sequência)
- Deploy CLI 4.3 GB → `.vercelignore` com `temporaria/` (commit `bf6f516`)
- `getTenantDb` causava dados zerados → `getCampaignContext` usa `globalDb` para tenant principal (commit `2c88134`)

---

## Eleitos 2022 PR — 2026-05-19

### Módulo `/eleitos-2022`
- **Dados:** dep-estaduais.json (54) · dep-federais.json (30) · senadores.json (Moro) · governador.json (Ratinho Jr) · presidente.json
- **Por município:** dep-estaduais-municipios.json (~2 MB, 54 × 399) · dep-federais-municipios.json (~1.1 MB, 30 × 399)
- **Script:** `temporaria/fetch-eleitos-municipios.ps1` — lê CSVs TSE com encoding CP1252
- **Componente:** `EleitoralPanel.tsx` — 5 tabs, search, filtro partido, favoritos localStorage, modal município com fetch on-demand
- **API:** `/api/eleitos/municipios` — serve dados municipais sob demanda
- **Mara Lima corrigida:** `mara-lima-2022.json` = 46.011 votos (era 357.452 por filtro errado); Arapongas = 785 votos

---

## Armadilhas conhecidas

- `campaignId` fixo = "andre-santos-2026" em todos os endpoints
- NextAuth v5 Beta: `user.id` no jwt = sub do OAuth. `auth.ts` resolve via `findUnique({ email })`
- Build usa `prisma db push` — banco Neon precisa estar acessível no build
- `typescript: { ignoreBuildErrors: true }` — erros de tipo não quebram o build
- Terminologia: "base de apoio" (não "campanha") nos textos visíveis
- `/entrar`, `/api/invite/*`, `/api/cep/*`, `/api/telegram/*`, `/api/public/*` DEVEM estar em `isPublic` em `auth.config.ts`
- `existsSync` não funciona em Vercel serverless — usar dynamic import
- **Hobby plan crons:** cada entrada do vercel.json precisa de schedule máx 1×/dia. `0 */6 * * *` (a cada 6h) bloqueia deploys silenciosamente. Confirmar sempre com `vercel --prod` se GitHub integration parar.
- Vercel CLI instalado: `npm i -g vercel` + `vercel login` + `vercel --prod` (fallback quando GitHub integration travar)

---

## Achados de Segurança — Auditoria 2026-05-27

### Crítico
- `ignoreBuildErrors: true` + `eslint ignoreDuringBuilds: true` → erros silenciados em produção (`next.config.mjs`)
- Rate limit in-memory ineficaz no serverless (`api/public/cadastro`) — cada instância Vercel tem estado próprio
- `joinCode: "andre2026"` hardcoded no `signIn` (`auth.ts:157`)

### Médio
- Sem CSP (Content-Security-Policy) nos headers
- `googleRefreshToken` texto plano no banco
- Bulk updates usam `as never` — sem validação de enum
- Token de impersonation no JWT sem TTL

### Baixo
- N+1 queries parcialmente corrigido; `console.error` pode vazar stack traces

**Plano completo:** `PLAN.md` (Sprints 1–4, criado 2026-05-27)

---

## Sprint 14 — Mobile-first UI + Treinamento + bugs WhatsApp (2026-05-30/31)

**Motivação:** "Nosso sistema primordialmente será usado em celulares e tablets" — auditoria mobile mostrou: sem PWA, sem bottom nav, KPIs com 1 coluna apenas no mobile, score sem visualização, tabelas escondendo dados, bugs visíveis no WhatsApp.

### Fases entregues

| Fase | Tema | Status |
|------|------|--------|
| A | Auditoria mobile inicial | ✅ |
| B | PWA + viewport cover + safe-area + touch targets 44px + manifest com 8 ícones + 3 shortcuts | ✅ commit `cca9960` |
| C | Bottom nav fixo (5 itens: Início, Apoiadores, Agenda, Relatório, Menu) + drawer mobile sincronizado via SidebarContext | ✅ commit `34a660b` |
| D | 6 KPI cards em `/colaboradores` com delta % 7d (`/api/collaborators/stats`) | ✅ commit `04723ea` |
| E | `ScoreBar` (gradient red→amber→green) plugada em perfil + lista de colaboradores | ✅ commit `77ab2d2` |
| F | Tabelas → cards mobile (Ranking + Relatório cobertura municípios) | ✅ commit `f0e3f69` |
| G | Dashboard mobile stack (KPIs 2 cols mobile, padding reduzido, tipografia ajustada) | ✅ commit `d2a4e4b` |
| H | Polish + memória + estado.md atualizado | em curso |
| I | Página `/treinamento` com slide deck (9 slides, scroll vertical com snap, anime.js v4) | ✅ commits `4c7c6ef` + `258d50b` |

### Bugs WhatsApp corrigidos (commit `6357607`)
- **`{nome}` literal nas boas-vindas**: `/api/n8n/config` compat path não substituía `{nome}` quando workflow não passava `?name=`. Fallback "apoiador(a)" adicionado.
- **404 "Lead não encontrado"** no node `CONVERT — Ovile` do n8n: agora retorna `{ searched, campaignId, action }` para facilitar debug.
- **Tom dos templates**: reescritos invite/welcome/optout em tom formal (memória `feedback_commit_push`). Removidas gírias ("tava", "grupinho", "demais", "bora", "tá", "Aaaa", "Sem stress"), saudação "Olá, {nome}" em vez de "Oi, {nome}! 😊", "Responda *SIM* ou *NÃO*" no lugar de "Manda SIM ou NÃO 🙏". Bandeira 🇧🇷 → 🇵🇷 (André é Deputado Estadual pelo Paraná). REACTIVATION mantido (já estava formal).

### Arquivos criados
- `public/manifest.json` — PWA manifest
- `src/components/mobile-bottom-nav.tsx` — bottom nav mobile (lg:hidden)
- `src/app/api/collaborators/stats/route.ts` — KPIs com delta 7d/14d
- `src/components/collaborators/kpi-cards.tsx` — 6 KPI cards do CRM
- `src/components/ui/score-bar.tsx` — barra gradient reutilizável
- `src/app/(dashboard)/treinamento/page.tsx` — server component (auth + Settings)
- `src/components/treinamento/deck.tsx` — slide deck client com scroll-snap-y

### Arquivos modificados
- `src/app/layout.tsx` — viewport "cover", appleWebApp, manifest, Toaster top-center
- `src/app/globals.css` — utilities `.safe-*`, `.touch-target`, `.touchable`, font-size 16px mobile/14 lg
- `src/contexts/sidebar-context.tsx` — `mobileOpen`/`setMobileOpen` no contexto
- `src/components/sidebar.tsx` — usa context + item "Treinamento" (icon GraduationCap)
- `src/components/sidebar-main-wrapper.tsx` — renderiza MobileBottomNav + padding bottom safe-area
- `src/app/(dashboard)/colaboradores/page.tsx` — KpiCards + ScoreBar inline + tipo `mobilizationScore`
- `src/app/(dashboard)/colaboradores/[id]/page.tsx` — ScoreBar grande no perfil
- `src/lib/message-templates.ts` — 4 pools reescritos
- `src/app/api/n8n/config/route.ts` — fix `{nome}` fallback
- `src/app/api/n8n/update-lead/route.ts` — diagnóstico no 404
- `src/app/(dashboard)/ranking/page.tsx` — cards mobile + grid desktop
- `src/app/(dashboard)/relatorio/page.tsx` — cards cobertura mobile + tabela desktop
- `src/app/(dashboard)/dashboard/page.tsx` — densidade mobile
- `src/components/dashboard/kpi-card.tsx` — padding/tipo responsivos
- `src/app/(dashboard)/eleitos-2022/page.tsx` — header sem `p-6` extra

### Débito técnico assumido
- `typescript.ignoreBuildErrors = true` mantido durante Sprint 14 para velocidade. Sprint 13 (TS cleanup) pausada — retomar após estabilizar o mobile-first.

### Pendências operacionais (usuário)
- N8N_IMPORT_WEBHOOK_URL no Vercel
- APP_ENCRYPTION_KEY no Vercel
- UPSTASH_REDIS_REST_URL/TOKEN no Vercel (rate limit serverless)
- Multi-tenant Miriam: Configurações → Integrações (Metricool, Telegram, Z-API)
- Reimport WF4 (kind=reactivation) — Sprint 12
- Verificar deploy do `/treinamento` no Vercel após push (concluído — está no ar)

---

## Sessão 2026-05-31 (tarde) — WF2 reimport via API + card n8n nas Integrações

### Bugs corrigidos

1. **WF2 com body form-urlencoded em vez de json (commit `cebdcea` antes; reimport via n8n API)**: a versão do WF2 importada anteriormente não tinha `contentType: json` + `specifyBody: keypair` nos nós CONVERT, OPT_OUT, Welcome e Despedida. Backend (`req.json()`) falhava silenciosamente em parsear → 400 → não atualizava status. Substituído via API n8n (`PUT /api/v1/workflows/ZDkd1oS1P8VdSh2l`) usando JSON do repo + credential ID real `lQQNPGFAlsKMbUfL`. Webhook Z-API NÃO precisou reconfigurar (mesmo ID do workflow → mesmo path `/webhook/ovile-resposta-wa`).

2. **Phone lookup com 9 dígitos não bate quando Z-API manda celular sem o "9" (commit `3111084`)**: Z-API às vezes manda 12 dígitos (55+DDD+8) enquanto banco salva com 13 (55+DDD+9). Sufix9 não bate. Fix: tenta sufix9 → fallback sufix8 em `/api/n8n/update-lead` e `/api/n8n/lead-by-phone`.

3. **Build quebrado por ESLint `_req unused` (commit `8cd7bc4`)**: bloqueou 10 deploys de produção da sprint 14 inteira. Fix: remover `_req` da rota `/api/collaborators/stats`. **Lição:** ESLint do projeto não aceita prefixo `_` para argumentos não usados — usar `export async function GET()` sem args quando não precisa.

### Diagnóstico WF2 (9 SIMs perdidos)

- 26 execuções do WF2 listadas via API n8n: 9 SIM com CONVERT 404, 17 outros
- Rota temporária `/api/n8n/debug-phone` (criada e removida na mesma sessão) confirmou: **nenhum dos 9 phones tinha sequer 6-9 dígitos em comum com qualquer registro do banco**
- Conclusão: os 9 SIMs vieram de pessoas **não cadastradas** no Ovile (testes pessoais via WhatsApp do Edson, indicações de terceiros, etc). Nada a recuperar
- Stats da base: 1463 colaboradores com phone, 1659 LEAD, formato padrão 11 dígitos (sem +55)

### Nova feature — card n8n nas Integrações (commit `cebdcea`)

`Configurações → Integrações` ganhou 5º card "n8n (Workflows)":
- Status de N8N_API_KEY (Bearer)
- Status de 3 webhooks (Lead novo / Disparo manual / Import bulk) com hint do host+path
- Link "Abrir n8n Cloud" externo
- Nota explicando que WF2 (Resposta WhatsApp) não usa webhook nosso (Z-API → n8n direto)
- API GET `/api/campaign/integrations` retorna agora também `n8n: {...}`

### Limpeza n8n (via API)

- 3 workflows duplicados deletados: `0Nm5Y6WujlDWU9pb`, `GqqPEHnmWHRsbMjs` (ambos "wf2"), `SOD4yQfe1S8wtd2z` ("resposta-whatsapp")
- WF2 ativo (`ZDkd1oS1P8VdSh2l`) preservado e atualizado

### Cadastro público dos ebooks (proposta pendente)

Hoje os cadastros dos 2 ebooks vão para uma planilha Google. Edson importa manual no Ovile. Solução proposta — pendente decisão:
- **(A)** Landing `/ebook/[slug]` dentro do Ovile com form custom (recomendado — sem dependência externa)
- **(B)** Apps Script no Google Forms chamando `/api/public/cadastro`
- **(C)** Make/Zapier intermediário

Endpoint `/api/public/cadastro` já existe e está robusto: aceita name, phone, email, city, neighborhood, source, channel, refUserId, refc, contributionTypes, lgpdConsent. Já dispara WF3 (WhatsApp imediato), Telegram, e notifica líder de zona.

