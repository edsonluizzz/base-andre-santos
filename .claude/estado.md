# Ovile — Estado do Projeto

> Atualizar ao fim de cada sprint.

---

## Funcionalidades concluídas

- Auth completo com Google OAuth + JWT multi-tenant
- Dashboard com sidebar (troca de estabelecimento funcional)
- CRUD de Membros com paginação, busca, filtros, aniversários
- Import/Export de membros via XLSX
- Configurações: nome, logo, join code autônomo, permissões, gestão de usuários
- Super Admin panel: todos os estabelecimentos, suspend/reativar, impersonação com AuditLog
- Financeiro: DRE anual, contas bancárias, ofertas, despesas
- Relatórios, Ministérios, Camisetas (módulos PRO com PlanGate)
- Eventos com RSVP
- Presença (chamada)
- Portal do membro
- Notificações in-app (sino) + e-mail transacional (Resend)
- Cron de aniversariantes (diário 08h BRT) — e-mail + notificação in-app
- Gating por plano: FREE (50 membros) / PRO (ilimitado, R$ 29,99/mês)
- Páginas /termos e /privacidade (LGPD)
- Landing page com animações skeuomórficas (anime.js)
- **Fluxo de membros via link** (2026-04-13):
  - Join via código → cria Member automaticamente → notifica admins → promoção → e-mail ao promovido
  - Admin e Líder geram/revogam join code direto nas Configurações (sem depender do Super Admin)
- **Notificações de eventos** (2026-04-15):
  - `lib/event-notifications.ts`: helper `notifyEventCreated` — busca membros (ministério ou todos os ativos), cria notificações in-app em lote, envia e-mail via Resend
  - Novo template `sendEventCreatedEmail` em `lib/email.ts`
  - `POST /api/events`: chama `notifyEventCreated` fire-and-forget após criar evento
- **Melhorias para Lançamento** (Gemini em 2026-04-13):
  - Justificativa de Falta: Adicionado campo `justification` no banco, API e Interface (com Dialog automático).
  - Landing Page Copy: Redesign completo dos textos focados em conversão (Framework PAS) e remoção de dados fictícios.
  - Catálogo de Funções: Criado `.claude/funcionalidades_detalhadas.md` para suporte ao marketing.
- **Sprint 2026-04-15 — Bugs + Features**:
  - Bug #9: permissões — `$transaction` array → callback form 30s
  - Bug #10: chamadas Porto Belo — `GET /api/events` remove filtro `ministryId:null` padrão
  - Import membros: updates paralelos (Promise.all chunks de 50) — suporta 100+ linhas
  - Convite WhatsApp pelo card: botão MessageCircle para membros sem userId; link `/entrar?c=CODE&mid=ID`; `POST /api/join` vincula ao membro existente
  - Offering/Expense → BankAccount: campo `bankAccountId` adicionado, migration aplicada em produção
  - PWA: `withPWA` em `next.config.mjs`, service worker gerado no build Vercel
- **Sprint 2026-04-16 — UX + Onboarding**:
  - Calendário dashboard: clicar em data com evento → modal de detalhe (lista eventos + link chamada + botão novo evento); sem evento → NewEventDialog direto
  - Radar de Liderança: expandível com botão "Ver todos / Recolher"
  - Membros: seletor de itens por página (12/24/48/96)
  - Chamada: loading state ao abrir evento (evita flash); CTA WhatsApp sempre visível para ausentes; auto-abrir via `?evento=id`; openEvent recebe members como argumento
  - Onboarding admin: `SetupChecklist` no dashboard — 5 passos verificados em tempo real, barra de progresso, dismissível via localStorage
  - Onboarding membro: `PortalWelcomeTour` no portal — modal 3 steps na primeira visita, persistido por memberId
  - Pós-cadastro: tela de sucesso com lista visual de 4 próximos passos
- **Sprint 2026-04-16 — Comunicados + Nurturing** (continuação):
  - Modelo `Broadcast` no schema + migration `20260416100000_add_broadcast_and_nurturing`
  - Campo `nurturingStep` em `Establishment` (0→3)
  - `GET/POST /api/broadcasts`: lista comunicados e envia e-mail (Resend) + notificação in-app para membros
- **Sprint 2026-04-17 — Documentação + Landing Page**:
  - Criado `.claude/funcionalidades_detalhadas.md` v2.0 (20 seções, estado completo do sistema, uso interno)
  - Criado `.claude/funcionalidades_clientes.md` (versão de marketing, sem Super Admin)
  - Landing page (`src/app/page.tsx`) atualizada:
    - Badge hero: "Novo: QR Code de presença + Comunicados"
    - 6 cards de recursos: Membros, Chamada & QR Code, Financeiro, Portal do Membro, Aniversários, Comunicados
    - Plano FREE corrigido: 10 → 50 membros; adicionados QR Code, Portal, Comunicados ao FREE
    - Instagram @ovilegestao: navbar desktop, menu mobile e footer
- **Sprint 2026-04-17 — Métricas + Bugs**:
  - Painel de métricas super admin: `GET /api/super-admin/metrics` + `MetricsPanel` component
    - MRR, ARR, conversão trial→PRO, churn, gráfico crescimento semanal (8 semanas), funil nurturing, funil conversão completo
  - Fix: `POST /api/attendances` → `$transaction` array → callback form com `timeout: 30000` (evita timeout com turmas grandes)
  - Fix: imagens Google OAuth quebradas → `referrerPolicy="no-referrer"` em `AvatarImage`, `<img>` super-admin e configurações
  - Página `/comunicados`: lista de histórico + dialog de composição (título, mensagem, destinatários)
  - Sidebar: item "Comunicados" com ícone `Megaphone` (adminOnly)
  - Templates de e-mail: `sendBroadcastEmail`, `sendNurturingDay1/3/7Email`
  - Cron `/api/cron/nurturing` (13h UTC diário) — sequência automática day1/day3/day7 por step
  - `vercel.json` atualizado com o novo cron
- **QR Code Presença** (2026-04-17):
  - Botão "QR" na chamada abre modal com QR Code apontando para `/checkin/{eventId}`
  - `GET /api/qr/[eventId]`: retorna info do evento + verifica se membro já está presente
  - `POST /api/qr/[eventId]`: registra presença; busca membro por userId ou email (auto-vincula)
  - Página `/checkin/[eventId]`: mobile-first, mostra detalhes do evento, botão "Confirmar Presença"
  - `auth.config.ts`: `/checkin/*` não redireciona para `/entrar` ao escanear sem congregação selecionada
- **Sentry** (2026-04-17):
  - `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
  - `src/instrumentation.ts` carrega configs por runtime
  - `src/app/global-error.tsx` captura erros React
  - `next.config.mjs`: `withSentryConfig` + `withPWA` compostos
  - Env vars necessárias: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- **Sprint 2026-04-17 — Portal Camisetas + Correções UI**:
  - Portal do membro: seção de camisetas reescrita — membro pode fazer pedido em congressos abertos (tamanho/qtd), enviar comprovante de pagamento (JPG/PNG/PDF ≤5MB via Vercel Blob)
  - `api/portal/shirt-proof`: upload de comprovante vinculado ao pedido do membro
  - `api/portal/me`: retorna `openCongresses` + dados enriquecidos de pedidos
  - `api/congresses/[id]/orders GET`: fix filtro MEMBER (era `createdBy`, corrigido para `memberId`)
  - Dashboard: Radar de Liderança oculto para role MEMBER
  - Dashboard: aniversários aparecem como pontos rosa no calendário (tipo BIRTHDAY)
  - Botões imprimir/PDF ocultados para MEMBER em chamada, membros e camisetas
  - Migration `20260417000000_add_justification_to_attendance`: coluna `justification` em Attendance
- **Sprint 2026-04-17 — Relatório Semanal + Visitantes**:
  - Item E: cron `0 10 * * 0` (domingo 10h UTC) → `api/cron/weekly-report` → e-mail para ADMIN+LEADER com eventos, frequência, ofertas e visitantes da semana
  - Item G: model `Visitor` (establishmentId, eventId?, name, phone, email) + migration `20260417100000_add_visitor`
  - Página pública `/visita?e=<eid>&ev=<eventId>`: formulário mobile de auto-cadastro sem auth
  - `api/visitors`: POST público + GET autenticado com filtro por establishment
  - Página `/visitantes`: lista de visitantes com QR geral da congregação (ADMIN+LEADER)
  - Chamada: botão "Visita" gera QR event-specific
  - Sidebar: item "Visitantes" visível para LEADER/ADMIN (module: MEMBERS)
  - Middleware: `/visita` e `/api/visitors` liberados como rotas públicas
- **LGPD Banner** (2026-04-17):
  - `src/components/lgpd-banner.tsx`: banner fixo bottom, exibido uma única vez via localStorage (`ovile_lgpd_consent`)
  - Adicionado ao root layout — aparece em todas as páginas
  - Link para `/privacidade` (já existia)
- **Fix: membro duplicado no join** (2026-04-17):
  - `api/join POST`: antes de criar novo membro, tenta match por email do Google com membro existente no mesmo establishment sem `userId` → vincula em vez de criar duplicata

## Infraestrutura

- **Stripe** ✅ configurado e funcionando em produção
- **Resend** ✅ DNS propagado, domínio ovile.com.br verificado, API Key ativa no Vercel
- **CRON_SECRET** ✅ configurado no Vercel

## Sprint 2026-04-19 — Quick Wins (Segurança & Performance)

- **try/catch em 10 rotas**: `establishments`, `events/rsvp`, `invites`, `members/export`, `members/template`, `portal/me`, `portal/photo`, `portal/rsvp`, `super-admin/establishments/[id]/join-code`, `users/me` — todos retornam JSON 500 em vez de HTML
- **Novos índices Prisma**: `Event.date`, `Attendance.memberId`, `Offering.date` — migration `20260419000000_add_missing_indexes` criada (precisa rodar em prod)
- **Upload folder whitelist**: `/api/upload` agora valida `x-folder` contra lista `[uploads, logos, shirts, shirt-proofs, member-photos]`
- ✅ **CRON_SECRET**: rotacionado por Edson em 2026-04-19

## Sprint 2026-04-19 — N+1s + Dashboard Summary

- **4 N+1s eliminados:**
  - `insights/evasion`: loop N queries → 1 query agregada com Map
  - `super-admin/establishments`: N×4 counts → 4 groupBy paralelos
  - `user/establishments`: `Settings.findUnique` por eid (sempre null) → `logoBase64` via include da Establishment
  - `portal/me`: 4 queries sequenciais → `Promise.all` + ranking via `groupBy`
- **`GET /api/dashboard/summary`**: consolida members+events+settings+evasion+financial em 1 chamada
- **Dashboard page**: refatorado de 6 fetches → 1

## Backlog priorizado — Edson (2026-04-17)

| # | Item | Status |
|---|------|--------|
| A | Painel métricas super admin | ✅ Concluído |
| B | QR Code presença | ✅ Concluído |
| C | Sentry observability | ✅ Concluído |
| D | Dízimo individual (oferta → membro) | Pendente |
| E | Relatório semanal automático por email | ✅ Concluído |
| F | Vercel Analytics / PostHog | Pendente |
| G | Cadastro de visitantes via QR | ✅ Concluído |
| — | Banner LGPD (uma vez, todas as páginas) | ✅ Concluído |
| — | Fix membro duplicado no join (match por email) | ✅ Concluído |

## Env vars pendentes (ação do Edson)

- `NEXT_PUBLIC_SENTRY_DSN` — DSN do projeto no Sentry
- `SENTRY_ORG` — organização no Sentry
- `SENTRY_PROJECT` — nome do projeto no Sentry
- `SENTRY_AUTH_TOKEN` — token de auth do Sentry
- ⚠️ `CRON_SECRET` — **rotacionar** (valor antigo foi exposto em conversa)

## Backlog histórico (concluído)

| # | Item | Status |
|---|------|--------|
| 1 | Billing Portal (Stripe Customer Portal) | ✅ Já existia |
| 2 | Banner de trial / upgrade | ✅ Já existia |
| 3 | Campo `email` no Member + vinculação login | ✅ Concluído |
| 4 | Notificações de eventos | ✅ Concluído |
| 5 | Vincular Offering/Expense à BankAccount | ✅ Concluído |
| 6 | PWA (manifest + ícones) | ✅ Concluído |
| 7 | Import de membros: aumentar limite para 100+ linhas | ✅ Concluído |
| 8 | Convite direto pelo card do membro (vincula ao membro específico) | ✅ Concluído |
| 9 | Bug: erro ao salvar permissões no painel de configurações | ✅ Corrigido |
| 10 | Bug: chamadas Porto Belo aparecem nos relatórios mas não estão preenchidas | ✅ Corrigido |
| 11 | Calendário com detalhe do dia ao clicar | ✅ Concluído |
| 12 | Radar de liderança expansível | ✅ Concluído |
| 13 | Membros: seletor de itens por página | ✅ Concluído |
| 14 | Chamada: loading + CTA WhatsApp visível + auto-abrir por URL | ✅ Concluído |
| 15 | Onboarding admin (SetupChecklist) | ✅ Concluído |
| 16 | Onboarding membro (PortalWelcomeTour) | ✅ Concluído |
| 17 | Pós-cadastro com próximos passos | ✅ Concluído |
| 18 | Comunicados (broadcasts + e-mail + notificação) | ✅ Concluído |
| 19 | Nurturing emails (sequência day1/3/7 pós-cadastro) | ✅ Concluído |

## Pendências

- ~~**Vincular Offering/Expense à BankAccount** — concluído (2026-04-15)~~
- ~~**PWA** — concluído (2026-04-15)~~
- ~~**Import de membros** — concluído (2026-04-15): Promise.all chunks de 50~~
- ~~**Convite pelo card do membro** — concluído (2026-04-15)~~
- ~~**Bug permissões** — corrigido: `$transaction` array → callback form 30s~~
- ~~**Bug chamadas Porto Belo** — corrigido (GET /api/events sem ministryId)~~
- ~~**Bug chamada timeout** — corrigido (2026-04-17): attendances $transaction → callback 30s~~
- ~~**Imagens Google OAuth** — corrigido (2026-04-17): referrerPolicy="no-referrer"~~

---

## Armadilhas conhecidas

### Sempre commitar `package.json` + `package-lock.json` após `npm install`
Pacote instalado só localmente não vai para o Vercel → build quebra com "Module not found".

### Novos campos no schema.prisma exigem migration
Campo adicionado ao schema sem `prisma migrate dev` não existe no banco de produção → 500 nas rotas que o usam.

### `User.establishmentId` é campo legado
Não é atualizado quando o usuário entra via link de convite. **Nunca usar como filtro de tenant para queries de usuários.** Usar sempre `UserEstablishment`:

```typescript
// ✅
db.user.findMany({
  where: { userEstablishments: { some: { establishmentId: eid, inviteStatus: "ACCEPTED" } } }
})
// ❌
db.user.findMany({ where: { establishmentId: eid } })
```

### `$transaction([array], { timeout })` não compila
A opção `timeout` só existe na forma callback:

```typescript
// ✅
await db.$transaction(async (tx) => {
  for (const item of items) await tx.model.update({ where: { id: item.id }, data: item.data });
}, { timeout: 30000 });

// ✅ Para criações em massa
await db.model.createMany({ data: items });
```

### Rotas sem try/catch retornam HTML 500
O frontend não consegue parsear como JSON → exibe "Erro de conexão". Todo handler deve ter try/catch.

---

## Fixes (2026-04-15)

| Arquivo | Fix |
|---------|-----|
| `plan-card.tsx` | Limite FREE corrigido: 10 → 50 membros |
| `dashboard/page.tsx` | Removidas variáveis nunca usadas: `attendance`, `upcomingEvents`, `lowAttendance`, `topAttendee`, `EVENT_TYPE_LABELS`, `EVENT_TYPE_BADGE`, import `Star` |
| `api/insights/evasion/route.ts` | Removido parâmetro `req` não usado |
| `.git/hooks/pre-push` | Bug crítico: `pass/fail/info` redirecionados para stderr; `rm -rf .next` antes do build (Windows/OneDrive symlinks) |

### Armadilha: pre-push hook no Windows
`errors=$(run_checks)` capturava stdout incluindo os `pass/fail/info` → nunca vazio → auto-heal sempre disparava. Fix: todos os status para `>&2`, build com `npm run build >&2 2>&1`, e `rm -rf .next` obrigatório antes do `next build`.

---

## Bugs corrigidos (2026-04-13)

| Rota | Bug | Fix |
|------|-----|-----|
| `GET /api/users` | Filtrava por `User.establishmentId` — usuários via link nunca apareciam | `userEstablishments.some()` |
| `PATCH/DELETE /api/users/[id]` | Validação usava `User.findFirst({ establishmentId })` | `UserEstablishment.findUnique` |
| `POST /api/members/import` | Sem try/catch → HTML 500 → "Erro de conexão" | try/catch adicionado |
| `POST /api/members/import` | `$transaction([N creates])` estourava P2028 com 50+ linhas | `createMany` + callback form |
