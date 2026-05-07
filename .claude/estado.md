# Estado — Base André Santos

**Última atualização:** 2026-05-07
**GitHub:** https://github.com/edsonluizzz/base-andre-santos
**Deploy:** Vercel (ver domínio em vercel.com → projeto → aba Domains)

---

## Status Atual

Sistema funcional e em produção. Terminologia "Base de Apoio" (não "campanha") em todos os textos visíveis — requisito legal pré-campanha.

---

## Módulos

| Módulo | Rota | Status |
|--------|------|--------|
| Dashboard | `/dashboard` | ✅ com card "Minha Célula" + cobertura por município |
| Colaboradores | `/colaboradores` | ✅ CSV import · seleção em massa · bulk status · bulk supportStatus |
| Mapa de Apoio | `/mapa` | ✅ choropleth PR · zoom/pan · tooltip hover · cards clicáveis por status de apoio |
| Zonas | `/zonas` | ✅ |
| Grupos WhatsApp | `/grupos` | ✅ gerenciamento de membros |
| Agenda | `/agenda` | ✅ + botão Google Calendar sync |
| Comunicados | `/comunicados` | ✅ filtro por audiência + contagem em tempo real |
| Configurações | `/configuracoes` | ✅ logo · join code · Google Calendar |
| Relatório | `/relatorio` | ✅ KPI cards clicáveis (toggle filtro tabela) · filtros perfil/período · funil · crescimento · capital político · CSV + XLSX |
| Minha Célula | `/minha-celula` | ✅ tier · stats · link de convite · gestão de status |
| Super Admin | `/super-admin` | ✅ conceder/revogar acesso · role/tier · links de convite reutilizáveis |
| Onboarding | `/onboarding` | ✅ boas-vindas + tour de features |
| Perfil colaborador | `/colaboradores/[id]` | ✅ botão Editar funcional (abre CollaboratorDialog, router.refresh()) |
| Cadastro público | `/cadastro` | ✅ sem auth · ?ref= rastreio · contribuições |
| Convite por link | `/entrar?token=X` | ✅ email-first flow · Google OAuth · completar-perfil |
| Completar perfil | `/completar-perfil` | ✅ formulário pós-login via convite |
| Células | `/celulas` | ✅ visualização hierárquica |
| Ranking | `/ranking` | ✅ scroll horizontal mobile |
| Notificações | sidebar | ✅ nav item com badge de não lidas · dropdown · marcar como lida |

---

## APIs

- `/api/collaborators` — CRUD + filtros + `?mine=true`
- `/api/collaborators/[id]` — GET/PUT/DELETE (lider de célula pode editar status dos próprios)
- `/api/collaborators/import` — bulk CSV (max 500 linhas)
- `/api/collaborators/bulk` — PATCH status/campaignRole/supportStatus em massa (max 500)
- `/api/mapa` — lideranças agrupadas por cidade + stats
- `/api/mapa/stats` — agregado por cidade para choropleth (todos os colaboradores)
- `/api/my-cell` — tier + stats + userId do usuário logado
- `/api/admin/users` — listar/convidar usuários por Gmail
- `/api/admin/users/[id]` — atualizar role/tier (PUT), revogar acesso (DELETE), remover pendente (PATCH)
- `/api/broadcasts` + `/api/broadcasts/count` — comunicados + contagem por audiência
- `/api/relatorio/export` — CSV de cobertura
- `/api/relatorio/export-xlsx` — XLSX 4 abas com estilos (ExcelJS): Resumo, Cobertura, Colaboradores, Análise Política
- `/api/google-calendar/connect`, `/callback`, `/sync` — OAuth + sync bidirecional
- `/api/public/cadastro` — sem auth, rate limit 5/min (in-memory), dedup por telefone
- `/api/invite-links` — GET/POST (ADMIN only) — listar/criar links de convite reutilizáveis
- `/api/invite-links/[id]` — DELETE (ADMIN only) — revogar link
- `/api/invite/validate` — POST sem auth — valida token
- `/api/invite/pre-auth` — POST sem auth — registra email pendente antes do OAuth
- `/api/invite/complete-profile` — POST autenticado — cria/atualiza Collaborator pós-login
- `/api/notifications` — GET lista notificações do usuário
- `/api/notifications/[id]` — PATCH marcar como lida
- `/api/notifications/read-all` — PATCH marcar todas como lidas

---

## Schema

### Collaborator
`campaignRole`, `status` (LEAD/ACTIVE/INACTIVE), `profile`, `supportStatus`, `source`, `contributionTypes String[]`, `registeredById String?`, `lgpdConsent`, `lgpdConsentAt`

### UserCampaign
`tier CollaboratorTier` (APOIADOR/ATIVISTA/LIDER_CELULA/COORDENADOR) — recalculado por `src/lib/tier.ts`
- Thresholds: 0–4 APOIADOR · 5–14 ATIVISTA · 15+ LIDER_CELULA · COORDENADOR manual

### InviteLink
`token @unique @default(cuid())`, `role`, `expiresAt DateTime?`, `useCount Int @default(0)`, `usedAt DateTime?` (último uso), `usedBy String?` (último usuário)
- Link **reutilizável**: nunca bloqueia por uso. Somente `expiresAt` (opcional) ou deleção manual bloqueiam.

### Settings
`campaignName`, `logoBase64`, `googleRefreshToken`

---

## Hierarquia de Acesso

| Papel | Módulos visíveis |
|-------|-----------------|
| MEMBER | Dashboard, Colaboradores, Minha Célula, Células, Ranking |
| LEADER | + Mapa, Zonas, Grupos WA, Agenda, Relatório |
| ADMIN | + Comunicados, Configurações, Super Admin |

- Proteção dupla: sidebar filtra por `minRole`, middleware redireciona acesso direto por URL para `/dashboard`
- Super Admin visível apenas para `isSuperAdmin = true` (subset de ADMIN)

---

## Labels centralizados

`src/lib/labels.ts` — exporta: `ROLE_LABEL`, `STATUS_LABEL`, `PROFILE_LABEL`, `SUPPORT_LABEL`, `CONTRIB_LABEL`, `ATTENDANCE_LABEL`, `ROLE_ORDER`, `PROFILE_ORDER`, `SUPPORT_ORDER`
`src/lib/contribution.ts` — exporta: `CONTRIBUTION_OPTIONS`, `ContributionValue`, `TIER_LABEL`, `TIER_THRESHOLDS`

**Regra:** nunca redefinir essas constantes localmente nos arquivos de página.

---

## Relatório (`/relatorio`)

- Cards KPI clicáveis com toggle: clique ativa filtro, clique novamente desativa
- Filtros via URL search params: `?cob=alta|media|confirm`, `?perfil=PASTOR|...`, `?periodo=30|90|180|all`
- `buildUrl()` helper preserva todos os params ativos ao trocar qualquer filtro
- Tabela de cobertura filtrada server-side pelo Server Component
- Indicador de filtro ativo com link "Limpar filtro"

## XLSX Export (`/api/relatorio/export-xlsx`)

- Biblioteca: `exceljs` ^4.4.0 (migrado de xlsx community, sem suporte a estilos)
- 4 abas: Resumo, Cobertura, Colaboradores, Análise Política
- Cabeçalhos dourados (#D4AF37), linha 1 congelada nas abas de dados
- Status e Apoio coloridos (verde/âmbar/vermelho/cinza)
- Análise Política: funil de conversão, crescimento, capital político por perfil, municípios sem liderança, top 10 confirmados

---

## Env Vars no Vercel

```
DATABASE_URL · AUTH_SECRET · AUTH_GOOGLE_ID · AUTH_GOOGLE_SECRET · APP_URL
ADMIN_EMAILS = edsonluizz.silva@gmail.com
SUPER_ADMIN_EMAILS = edsonluizz.silva@gmail.com
```
Opcionais (funcionam sem, mas habilitam features):
```
RESEND_API_KEY          → emails de convite e notificação de leads
RESEND_FROM             → "Base André Santos <noreply@seudominio.com.br>"
BLOB_READ_WRITE_TOKEN   → upload de logo
GOOGLE_CALENDAR_CLIENT_ID / CLIENT_SECRET / REDIRECT_URI / ID
```

---

## Recursos-chave

### Cadastro público com rastreio
- Link simples: `/cadastro`
- Link com rastreio de célula: `/cadastro?ref=<userId>`
- Leads chegam com `status=LEAD`

### Convite por link
- Admin gera link em Super Admin → "Links de Convite" → copia `/entrar?token=X` → envia no WhatsApp
- Pessoa clica → informa Gmail → pré-auth cria `UserCampaign(pendingEmail)` → Google OAuth → `/completar-perfil` → `/dashboard`
- Links reutilizáveis: badge mostra `X usos`; admin revoga manualmente
- `/entrar` e `/api/invite/*` são rotas públicas (sem auth obrigatória)

### Seleção em massa (colaboradores)
- Checkboxes em cada linha; "selecionar todos" no topo
- Barra flutuante: Ativo / Lead / Inativo / Confirmado (supportStatus) em massa

### Mapa choropleth
- `/public/pr-municipalities.json` — GeoJSON IBGE, 399 municípios PR
- Cards Total/Confirmados/Negociando/Neutros/Adversários são clicáveis → abre lista filtrada com edição em massa de supportStatus
- Verde degradê (confirmados) · vermelho (adversários) · âmbar (negociando) · cinza (neutro)
- Zoom por scroll/botões, pan por arrastar, tooltip ao hover

### Tiers automáticos
- Recalculados em `recalcTier()` a cada criação/alteração/exclusão de colaborador
- Exibidos no card "Minha Célula" do dashboard e na página `/minha-celula`

### Normalização de municípios
- `normalizeCity()` em `src/lib/utils.ts` aplica Title Case e trim em todos os 4 pontos de escrita de `city`
- Garante que "curitiba", "CURITIBA", " Curitiba " → "Curitiba" sem duplicatas

---

## Pendências

- [ ] Google Calendar: configurar env vars `GOOGLE_CALENDAR_*` no Vercel

## Ideias para o futuro (não prioridade agora)

- Mensagens de boas-vindas pré-configuradas no WhatsApp — admin envia manualmente, sistema gera o texto formatado
- Comunicados via WhatsApp em massa (Z-API) — quando a base crescer
- Resend: domínio verificado para emails transacionais

---

## Armadilhas conhecidas

- `campaignId` fixo = "andre-santos-2026" em todos os endpoints
- NextAuth v5 Beta: `user.id` no jwt callback = sub do OAuth (não UUID). `auth.ts` resolve via `findUnique({ email })`
- Build usa `prisma db push` — banco Neon precisa estar acessível no build
- `typescript: { ignoreBuildErrors: true }` — erros de tipo não quebram o build
- Terminologia: usar "base de apoio" (não "campanha") nos textos visíveis — requisito legal
- `.catch(() => {})` em vários pontos do JWT callback — erros silenciosos; monitorar via Vercel logs
- `/entrar` e `/api/invite/*` DEVEM estar na lista `isPublic` em `auth.config.ts` — remover causa 302 loop

---

## Achados de Segurança

### MÉDIO — `/api/invite/pre-auth`: sem rate limit
Cria `UserCampaign(pendingEmail)` sem limitação. Com token válido, atacante pode poluir o DB.
**Fix recomendado:** Rate limit por IP (mesmo padrão do `/api/public/cadastro`).

### MÉDIO — `/api/invite/validate`: expõe metadados sem auth
Retorna `{ role, useCount }` sem autenticação.
**Fix recomendado:** Retornar apenas `{ ok: true }` no endpoint público.

### BAIXO — Bulk update sem validação de enum
`/api/collaborators/bulk` não faz whitelist antes do Prisma.

### BAIXO — Rate limit in-memory (public/cadastro) ineficaz em Vercel
Reseta em cold start, não compartilha estado entre instâncias. Dedup por telefone no banco mitiga.

### BAIXO — `googleRefreshToken` em texto plano na tabela Settings

---

## Achados de Performance

### MÉDIO — N+1 queries em `/api/admin/users` GET
`COUNT` separado por usuário. Fix: `db.collaborator.groupBy({ by: ["registeredById"], _count: true })`.

### BAIXO — Sem índice em `Collaborator.phone`, `.status`, `.supportStatus`
