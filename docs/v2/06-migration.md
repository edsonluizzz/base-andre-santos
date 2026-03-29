# Guia de Migração V1 → V2

## Princípios

- **Zero downtime**: todas as migrations são aditivas
- **Dados preservados**: nenhuma tabela existente é deletada ou alterada destrutivamente
- **Rollback seguro**: cada migration pode ser revertida sem perda de dados de negócio

---

## Pré-requisitos

1. Fazer backup do banco Neon antes de qualquer migration
2. Ter variáveis de ambiente configuradas corretamente no Vercel
3. Testar localmente com `prisma migrate dev` antes de deploy em produção

---

## Sequência de Migrations

### Migration 1 — Design System (sem banco)
Apenas mudanças de CSS e componentes. Não altera schema.

**Risco:** Baixíssimo. Reverter = reverter os arquivos CSS/TSX.

**Checklist:**
- [ ] `globals.css` atualizado com nova paleta
- [ ] `tailwind.config.ts` com novos tokens
- [ ] Sidebar refatorada (hex → tokens CSS)
- [ ] Todas as páginas refatoradas
- [ ] Componentes `LoadingSkeleton`, `EmptyState`, `StatCard` criados
- [ ] Testar visualmente em mobile e desktop

---

### Migration 2 — Segurança nas API Routes (sem banco)
Adiciona guards de role e try/catch. Não altera schema.

**Risco:** Baixo. Em caso de bug, reverter para versão anterior.

**Checklist:**
- [ ] `GET /api/settings` exige sessão
- [ ] `POST /api/members` exige LEADER ou ADMIN
- [ ] `PATCH/DELETE /api/members/[id]` exige LEADER (PATCH) ou ADMIN (DELETE)
- [ ] `POST/DELETE /api/events` exige LEADER ou ADMIN
- [ ] `DELETE /api/events/[id]` exige ADMIN
- [ ] `POST /api/attendances` exige LEADER ou ADMIN
- [ ] `POST/DELETE /api/offerings` exige LEADER ou ADMIN
- [ ] `POST/DELETE /api/expenses` exige LEADER ou ADMIN
- [ ] Todos os handlers têm try/catch
- [ ] `auth.ts` com JWT stale role fix
- [ ] Testar cada role (ADMIN, LEADER, MEMBER) manualmente

---

### Migration 3 — Schema: Permissões
```bash
npx prisma migrate dev --name v2_permissions
```

**O que é adicionado:**
- Enums `PermissionModule`, `PermissionAction`
- Model `RolePermission`

**Após migration:**
```bash
npx prisma db seed
# ou rodar o script de seed de permissões separadamente
```

**Checklist:**
- [ ] Migration gerada e aplicada
- [ ] Seed de permissões defaults executado (20+ registros na tabela `RolePermission`)
- [ ] `src/lib/permissions.ts` criado
- [ ] `src/hooks/usePermissions.ts` criado
- [ ] `src/context/permissions-context.tsx` criado
- [ ] Layout do dashboard carregando permissões server-side
- [ ] Sidebar filtrando itens por permissão
- [ ] UI de configuração em `/configuracoes` → aba "Permissões"
- [ ] `GET/PATCH /api/settings/permissions` funcionando
- [ ] Testar: MEMBER não vê "Financeiro" na sidebar se não tiver VIEW

---

### Migration 4 — Schema: Camisetas
```bash
npx prisma migrate dev --name v2_shirts
```

**O que é adicionado:**
- Enums `ShirtSize`, `ShirtOrderStatus`, `CongressStatus`
- Models `Congress`, `ShirtOrder`
- Relação `shirtOrders` em `Member`

**Checklist:**
- [ ] Migration gerada e aplicada
- [ ] API routes `/api/congresses/**` criadas
- [ ] Página `/camisetas` criada e acessível
- [ ] Componentes `CongressDialog`, `OrderDialog`, `OrdersTable`, `SizeSummary` criados
- [ ] "Camisetas" adicionado na sidebar
- [ ] Testar fluxo completo: criar congresso → adicionar pedido → marcar pago → fechar → relatório → marcar entregue

---

## Compatibilidade de Dados

| Tabela | Status | Observação |
|--------|--------|------------|
| `User` | ✅ Compatível | Sem alteração |
| `Account` | ✅ Compatível | Sem alteração |
| `Session` | ✅ Compatível | Sem alteração |
| `Member` | ✅ Compatível | Recebe nova relação opcional `shirtOrders` |
| `Event` | ✅ Compatível | Sem alteração |
| `Attendance` | ✅ Compatível | Sem alteração |
| `Offering` | ✅ Compatível | Sem alteração |
| `Expense` | ✅ Compatível | Sem alteração |
| `Settings` | ✅ Compatível | Sem alteração |
| `RolePermission` | 🆕 Nova tabela | Migration 3 |
| `Congress` | 🆕 Nova tabela | Migration 4 |
| `ShirtOrder` | 🆕 Nova tabela | Migration 4 |

---

## Em Caso de Problema

### Reverter migration Prisma
```bash
# Ver histórico de migrations
npx prisma migrate status

# Reverter última migration (desenvolvimento)
npx prisma migrate reset  # CUIDADO: apaga e recria o banco

# Em produção: criar migration de rollback manual (DROP TABLE)
```

### Rollback de código
Usar git para reverter os arquivos de código. O banco permanece com as novas tabelas, mas sem dados — sem impacto nos dados existentes.
