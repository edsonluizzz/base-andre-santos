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

## Infraestrutura

- **Stripe** ✅ configurado e funcionando em produção
- **Resend** ✅ DNS propagado, domínio ovile.com.br verificado, API Key ativa no Vercel
- **CRON_SECRET** ✅ configurado no Vercel

## Pendências

- **Notificações de eventos** — deferred: modelo de notificação do módulo de eventos ainda não definido
- **Vinculação membro manual → login por e-mail** — deferred: requer campo `email` no model `Member` (migration pendente)

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

## Bugs corrigidos (2026-04-13)

| Rota | Bug | Fix |
|------|-----|-----|
| `GET /api/users` | Filtrava por `User.establishmentId` — usuários via link nunca apareciam | `userEstablishments.some()` |
| `PATCH/DELETE /api/users/[id]` | Validação usava `User.findFirst({ establishmentId })` | `UserEstablishment.findUnique` |
| `POST /api/members/import` | Sem try/catch → HTML 500 → "Erro de conexão" | try/catch adicionado |
| `POST /api/members/import` | `$transaction([N creates])` estourava P2028 com 50+ linhas | `createMany` + callback form |
