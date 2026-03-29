# Auditoria V2 — UMADC Porto Belo

## Segurança (Crítico)

### 1. API routes sem role guard (CORRIGIDO na V2)
**Problema:** Todas as rotas de mutação (criar/editar/deletar membros, eventos, ofertas, despesas, chamada) verificavam apenas se havia sessão ativa. Qualquer `MEMBER` autenticado podia deletar qualquer membro ou lançar despesas.

**Correção:** Adicionado guard `LEADER|ADMIN` obrigatório em todas as mutações. DELETE restrito a `ADMIN` em recursos críticos.

### 2. GET /api/settings público (CORRIGIDO na V2)
**Problema:** O endpoint `GET /api/settings` não verificava sessão, expondo nome da igreja e logo em base64 para qualquer requisição não autenticada.

**Correção:** Adicionado `auth()` no GET do settings.

### 3. Sem validação de schema / Zod (CORRIGIDO na V2)
**Problema:** O body dos requests era desestruturado diretamente sem validação de tipos, tamanho ou formato. Campos extras passavam silenciosamente.

**Correção:** Todos os handlers de mutação agora validam com schema Zod antes de tocar o banco.

### 4. Sem try/catch (CORRIGIDO na V2)
**Problema:** Nenhuma API route tinha tratamento de erro. Em caso de timeout ou erro do banco, o stack trace era exposto ao cliente.

**Correção:** Todos os handlers agora têm try/catch com resposta 500 genérica ao cliente.

### 5. JWT stale role (CORRIGIDO na V2)
**Problema:** O role do usuário era lido do banco apenas no login inicial. Se um admin rebaixasse um usuário via Configurações, o JWT continuava com o role antigo até expirar.

**Correção:** Adicionado callback `trigger: "update"` no NextAuth para re-fetch do role do banco em cada renovação de token.

### 6. Sem rate limiting (PENDENTE — sprint futuro)
**Problema:** Nenhum endpoint tem rate limiting. Endpoints de criação são vulneráveis a flooding.

**Solução sugerida:** Middleware com Upstash Redis + `@upstash/ratelimit`, ou `next-rate-limit` para solução sem Redis.

---

## Engenharia

### 1. Valores hex hardcoded (CORRIGIDO no Sprint 2)
**Problema:** 30+ ocorrências de `text-[#c9a84c]`, `bg-[#1e1e1e]` etc nos componentes, em vez de usar os tokens CSS já definidos em `globals.css`. Impossibilitava troca de tema.

**Correção:** Todos os componentes refatorados para usar classes Tailwind mapeadas para CSS variables.

### 2. `amount` como Float (PARCIALMENTE CORRIGIDO)
**Problema:** `Offering.amount` e `Expense.amount` são `Float`, com imprecisão de ponto flutuante para valores monetários.

**Correção:** Novos models (`ShirtOrder`) já usam `Decimal`. Models legados mantidos como Float para zero-downtime (migração futura recomendada).

### 3. Sem loading states / empty states (CORRIGIDO no Sprint 2)
**Problema:** Todas as páginas ficavam em branco durante o fetch inicial.

**Correção:** Criados componentes `LoadingSkeleton` e `EmptyState` reutilizáveis aplicados em todas as páginas.

### 4. Sem paginação (PENDENTE)
**Problema:** `GET /api/members` e `GET /api/events` retornam todos os registros sem limite.

**Solução sugerida:** Adicionar `?page=1&limit=50` com cursor-based pagination no Prisma.

### 5. Tipos locais duplicados (CORRIGIDO no Sprint 3)
**Problema:** Tipos como `Member` e `Event` eram redefinidos localmente em cada `page.tsx`.

**Correção:** Criado `src/types/index.ts` com tipos compartilhados derivados do Prisma.

---

## Visual / UX

### 1. Sidebar sem filtro por role (CORRIGIDO no Sprint 3)
**Problema:** MEMBER via o link "Configurações" mas recebia 403 ao acessar. Confuso.

**Correção:** Sidebar filtra itens de navegação baseado em `canView(module)` via hook de permissões.

### 2. Sem skeleton loaders (CORRIGIDO no Sprint 2)
**Problema:** Páginas apareciam vazias por ~200-500ms durante carregamento.

**Correção:** Skeletons em todas as páginas principais.

### 3. Empty states sem CTA (CORRIGIDO no Sprint 2)
**Problema:** Quando não havia dados, aparecia apenas texto simples.

**Correção:** `EmptyState` component com ícone ilustrativo e botão de ação primária.

### 4. Responsividade parcial em tablets (CORRIGIDO no Sprint 2)
**Problema:** Cards KPI do dashboard usavam `grid-cols-2 lg:grid-cols-4` sem tratar `md`.

**Correção:** Adicionados breakpoints `md:grid-cols-2 lg:grid-cols-4` em todos os grids.
