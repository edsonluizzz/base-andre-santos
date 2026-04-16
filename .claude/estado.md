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

## Infraestrutura

- **Stripe** ✅ configurado e funcionando em produção
- **Resend** ✅ DNS propagado, domínio ovile.com.br verificado, API Key ativa no Vercel
- **CRON_SECRET** ✅ configurado no Vercel

## Backlog priorizado

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

## Pendências

- ~~**Vincular Offering/Expense à BankAccount** — concluído (2026-04-15): bankAccountId em Offering e Expense, migration aplicada~~
- ~~**PWA** — concluído (2026-04-15): withPWA em next.config.mjs, sw.js gerado no build~~
- **Import de membros** — limite atual insuficiente; subir para pelo menos 100 linhas (verificar onde está o cap atual no `api/members/import`)
- **Convite pelo card do membro** — gerar link de convite/join que já associa ao `Member.id` específico, evitando criar registro duplicado
- ~~**Bug permissões** — corrigido: `$transaction` array → callback form 30s~~
- ~~**Bug chamadas Porto Belo** — corrigido: `GET /api/events` sem `ministryId` param agora retorna todos os eventos (antes filtrava `ministryId: null`)~~

---

## Armadilhas conhecidas

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
