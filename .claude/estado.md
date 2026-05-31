# Estado — Ovile Eleitoral (Base André Santos)

**Última atualização:** 2026-05-31 (Sprint 14 mobile-first concluída — PWA, bottom nav, KPIs, score gradient, /treinamento, cards mobile em tabelas; bugs WhatsApp tom + {nome} corrigidos)
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
- Verificar deploy do `/treinamento` no Vercel após push

