# Sistema de Permissões Granular V2

## Modelo de Dados

```prisma
enum PermissionModule {
  MEMBERS      // Membros
  ATTENDANCE   // Chamada
  FINANCIAL    // Financeiro
  REPORTS      // Relatórios
  EVENTS       // Eventos
  BIRTHDAYS    // Aniversários
  SHIRTS       // Camisetas
  SETTINGS     // Configurações
  USERS        // Gestão de Usuários
}

enum PermissionAction {
  VIEW
  CREATE
  EDIT
  DELETE
  EXPORT
}

model RolePermission {
  id        String           @id @default(cuid())
  role      Role
  module    PermissionModule
  action    PermissionAction
  granted   Boolean          @default(false)
  updatedAt DateTime         @updatedAt
  updatedBy String?
  @@unique([role, module, action])
}
```

---

## Defaults por Role

| Módulo | Ação | ADMIN | LEADER | MEMBER |
|--------|------|-------|--------|--------|
| MEMBERS | VIEW | ✓ | ✓ | ✗ |
| MEMBERS | CREATE | ✓ | ✓ | ✗ |
| MEMBERS | EDIT | ✓ | ✓ | ✗ |
| MEMBERS | DELETE | ✓ | ✗ | ✗ |
| ATTENDANCE | VIEW | ✓ | ✓ | ✓ |
| ATTENDANCE | CREATE | ✓ | ✓ | ✗ |
| ATTENDANCE | EDIT | ✓ | ✓ | ✗ |
| ATTENDANCE | DELETE | ✓ | ✗ | ✗ |
| FINANCIAL | VIEW | ✓ | ✓ | ✗ |
| FINANCIAL | CREATE | ✓ | ✓ | ✗ |
| FINANCIAL | EDIT | ✓ | ✓ | ✗ |
| FINANCIAL | DELETE | ✓ | ✗ | ✗ |
| REPORTS | VIEW | ✓ | ✓ | ✗ |
| REPORTS | EXPORT | ✓ | ✓ | ✗ |
| SHIRTS | VIEW | ✓ | ✓ | ✓ |
| SHIRTS | CREATE | ✓ | ✓ | ✗ |
| SHIRTS | EDIT | ✓ | ✓ | ✗ |
| SHIRTS | DELETE | ✓ | ✗ | ✗ |
| SETTINGS | VIEW | ✓ | ✗ | ✗ |
| SETTINGS | EDIT | ✓ | ✗ | ✗ |
| USERS | VIEW | ✓ | ✗ | ✗ |
| USERS | EDIT | ✓ | ✗ | ✗ |

**ADMIN sempre tem acesso a tudo. A tabela só armazena configurações para LEADER e MEMBER.**

---

## Arquitetura de Enforcement

### Server-side (`src/lib/permissions.ts`)
```typescript
// Consulta RolePermission no banco (cache 60s via unstable_cache)
// Fallback para permission-defaults.ts se não houver registro
async function hasPermission(
  userRole: Role,
  module: PermissionModule,
  action: PermissionAction
): Promise<boolean>
```

### Client-side (`src/hooks/usePermissions.ts`)
```typescript
// Permissões carregadas no layout server e passadas via React Context
// Zero fetch adicional no cliente
const { can, canView, canEdit, canDelete } = usePermissions()
can('MEMBERS', 'DELETE') // boolean
```

### Sidebar dinâmica
Items de navegação filtrados por `canView(module)`. MEMBER sem acesso a FINANCIAL não vê "Financeiro" na sidebar.

---

## UI de Configuração (Admin)

Localização: `/configuracoes` → aba "Permissões"

- Duas seções: "Permissões de Líder" e "Permissões de Membro"
- Tabela: linhas = módulos, colunas = VIEW/CREATE/EDIT/DELETE
- Toggle switches para cada célula
- Botão "Salvar" faz PATCH em `/api/settings/permissions`
- Botão "Restaurar Padrões" reaplica o seed de defaults
- ADMIN não é editável (sempre tem tudo)

---

## Migração

1. Rodar `prisma migrate dev` (additive — apenas cria nova tabela)
2. Rodar seed de permissões defaults
3. Deploy do enforcement nas API routes (behavior igual aos defaults = sem regressão)
4. Deploy da UI de configuração
