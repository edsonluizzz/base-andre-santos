# Estado — Base André Santos

**Última atualização:** 2026-05-18 (Super Admin seções expansíveis · sidebar nome/foto reais do servidor · Metricool completo)
**Plano de produto:** `.claude/issacar-plano.md` — transformar em SaaS multi-tenant (issacar.app)
**Landing page:** https://issacar-landing.vercel.app · domínio issacar.app pendente configuração DNS
**GitHub:** https://github.com/edsonluizzz/base-andre-santos
**Deploy:** Vercel — base-andre-santos.vercel.app · último deploy: `7ebe11f` (READY)

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

## Achados de Segurança

- MÉDIO: N+1 queries em `/api/admin/users` GET
- BAIXO: bulk sem whitelist enum; rate limit in-memory ineficaz; googleRefreshToken texto plano
