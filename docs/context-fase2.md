# Ovile Gestão — Contexto Técnico pós Fase 1 + Fase 2

**Data de geração:** 2026-04-02  
**Stack:** Next.js 14 (App Router) · TypeScript · Prisma 7 · PostgreSQL (Neon) · NextAuth v5 · Tailwind CSS · Resend · Vercel Blob  
**Deploy:** Vercel + Neon serverless (pooled)

---

## 1. Estado atual do sistema

### O que existe e funciona

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Dashboard | `/dashboard` | Visão geral com stats da congregação |
| Portal do Membro | `/portal` | Frequência, ranking, pedidos de camiseta, RSVP de eventos |
| Membros | `/membros` | CRUD completo, vínculo com User Google |
| Chamada | `/chamada` | Registro de presença por evento |
| Aniversários | `/aniversarios` | Lista com links WhatsApp |
| Financeiro | `/financeiro` | Ofertas + Despesas + Contas Bancárias |
| Ministérios | `/ministerios` | Grupos internos com líderes e membros |
| Relatórios | `/relatorios` | Exportações e gráficos |
| Camisetas | `/camisetas` | Congressos + Pedidos + Comprovantes |
| Configurações | `/configuracoes` | Nome/logo da igreja, permissões por role |
| Cadastro | `/cadastro` | Onboarding self-service (público) |
| Seletor | `/select-church` | Escolha de congregação (múltiplos vínculos) |

---

## 2. Arquitetura Multi-Tenant

### Modelo de dados (N:N)

```
User ──< UserEstablishment >── Establishment
          role (ADMIN/LEADER/MEMBER por estabelecimento)
```

- Cada `User` pode ter vínculos com múltiplos `Establishment` via `UserEstablishment`
- O **JWT** carrega `establishmentId` (contexto ativo) + `role` (nesse contexto)
- Se o usuário tem > 1 vínculo ao logar → `needsEstablishmentSelection: true` no token → redirect `/select-church`
- Troca de estabelecimento via `useSession().update({ selectedEstablishmentId })` → NextAuth re-executa o JWT callback

### Isolamento de dados

**Todas** as tabelas têm `establishmentId` com `@default("default-porto-belo")`.  
Todos os `findMany` e `create` nas APIs usam o `eid` do JWT (`session.user.establishmentId`).

### Constante de migração

```ts
// src/lib/constants.ts
export const DEFAULT_ESTABLISHMENT_ID = "default-porto-belo"
```
Os 6 usuários reais de Porto Belo estão vinculados a `"default-porto-belo"` via `UserEstablishment`.

---

## 3. Fluxo de Autenticação

```
Login Google
    │
    ▼
signIn callback → garante vínculo ADMIN_EMAILS com default-porto-belo
    │
    ▼
JWT callback (1 query: user + userEstablishments)
    ├── 0 vínculos → token sem estabelecimento
    ├── 1 vínculo  → token com establishmentId + role direto
    └── N vínculos → needsEstablishmentSelection: true
    │
    ▼
Middleware (Edge) auth.config.ts
    ├── needsEstablishmentSelection → redirect /select-church
    ├── Não logado → redirect /login
    └── /cadastro, / → público
```

### Arquivos-chave de auth

| Arquivo | Função |
|---------|--------|
| `src/lib/auth.ts` | JWT callbacks + signIn hook + PrismaAdapter |
| `src/lib/auth.config.ts` | Edge-safe: middleware authorized() |
| `src/middleware.ts` | Exports NextAuth do auth.config.ts |
| `src/types/next-auth.d.ts` | Extensão de tipos: `role`, `establishmentId`, `needsEstablishmentSelection` |

---

## 4. Schema Prisma — Modelos adicionados na Fase 1+2

### UserEstablishment
```prisma
model UserEstablishment {
  userId          String
  establishmentId String
  role            Role     @default(MEMBER)
  @@unique([userId, establishmentId])
}
```

### BankAccount
```prisma
model BankAccount {
  name            String
  isDefault       Boolean @default(false)
  active          Boolean @default(true)
  establishmentId String
  offerings       Offering[]
  expenses        Expense[]
}
```

### Ministry + MinistryMember
```prisma
model Ministry {
  name, description, active, establishmentId
  members MinistryMember[]
}
model MinistryMember {
  ministryId, memberId
  role MinistryRole @default(MEMBER)  // LEADER | MEMBER
}
```

### EventRsvp
```prisma
model EventRsvp {
  eventId, memberId
  @@unique([eventId, memberId])
}
```

### Campos novos em modelos existentes
- `Offering.bankAccountId String?` — conta bancária de destino
- `Expense.bankAccountId String?` — conta bancária de saída

---

## 5. Novas APIs

| Rota | Métodos | Descrição |
|------|---------|-----------|
| `/api/onboarding` | POST | Cria Establishment + admin User + UserEstablishment + RolePermissions seed |
| `/api/user/establishments` | GET | Lista vínculos do usuário logado |
| `/api/bank-accounts` | GET/POST/DELETE | CRUD de contas bancárias |
| `/api/ministries` | GET/POST/DELETE | CRUD de ministérios |
| `/api/ministries/[id]/members` | POST/DELETE | Add/remove integrante |
| `/api/events/rsvp` | GET/POST/DELETE | RSVP de próximos eventos |

---

## 6. E-mails Transacionais (Resend)

**Pacote:** `resend@^6`  
**Helper:** `src/lib/email.ts`

| Função | Trigger |
|--------|---------|
| `sendWelcomeEmail()` | Onboarding `/cadastro` concluído |
| `sendInviteEmail()` | Disponível — a ser chamada no convite de membro |

**Variáveis de ambiente necessárias:**
```
RESEND_API_KEY=""          # Obter em resend.com
RESEND_FROM="Ovile Gestão <noreply@ovile.com.br>"
```
> ⚠️ Enquanto `RESEND_API_KEY` estiver vazio, os e-mails são silenciosamente ignorados (não quebra o sistema).

---

## 7. Permissões

Sistema de permissões baseado em `RolePermission` no banco, com fallback em `src/lib/permission-defaults.ts`.

- `loadPermissionsForRole(role, establishmentId)` — carregado no `DashboardLayout` (server component)
- `hasPermission(role, module, action, establishmentId)` — verificação server-side nas APIs
- Context client-side: `usePermissions()` → `canView()`, `canCreate()`, `canEdit()`, `canDelete()`

---

## 8. Decisões técnicas tomadas

| Decisão | Justificativa |
|---------|---------------|
| Login unificado + Seletor (não subdomínio) | Mais simples com middleware Edge atual; subdomínio exigiria DNS/Vercel config |
| `db push` em vez de `migrate dev` | Banco com dados reais que divergiu das migrations; push é seguro e não reseta |
| `User.role` + `User.establishmentId` mantidos | Compatibilidade com dados existentes; contexto ativo vem do JWT via `UserEstablishment` |
| `bankAccountId` nullable em Offering/Expense | Dados históricos sem conta atribuída continuam funcionando |
| WhatsApp como links `wa.me` | Sem API WhatsApp Business; automação real exigiria Z-API/Evolution com custo recorrente |
| E-mail não bloqueia resposta do onboarding | `sendWelcomeEmail` com `.catch()` no `Promise.all` — falha no e-mail não quebra o cadastro |

---

## 9. Próximos passos — Fase 3

| Item | Prioridade | Dependência |
|------|-----------|-------------|
| **Stripe** (Planos Free/Pro, checkout no onboarding) | Alta | Conta Stripe + webhook URL pública |
| **Painel Super Admin** (MRR, igrejas ativas, uso) | Média | Novo role `SUPER_ADMIN` ou flag no `.env` |
| **PWA** (manifesto + service worker via `next-pwa`) | Baixa | — |
| Convite de membro por e-mail (`sendInviteEmail`) | Média | `RESEND_API_KEY` configurado |
| Soft-delete / histórico de membros inativos | Baixa | — |

---

## 10. Variáveis de ambiente completas

```bash
# Banco de dados (Neon)
DATABASE_URL=""            # pooled (runtime)
DATABASE_URL_UNPOOLED=""   # direto (migrations/seeds)

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# NextAuth
AUTH_SECRET=""             # openssl rand -base64 32
NEXTAUTH_URL=""            # Ex: https://ovile.com.br

# Admins automáticos ao logar
ADMIN_EMAILS=""            # email1@gmail.com,email2@gmail.com

# Vercel Blob (fotos de perfil)
BLOB_READ_WRITE_TOKEN=""

# Resend (e-mails transacionais)
RESEND_API_KEY=""
RESEND_FROM="Ovile Gestão <noreply@ovile.com.br>"
```
