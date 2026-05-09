# Estado — Base André Santos

**Última atualização:** 2026-05-08 (link compartilhável pós-cadastro + embed vídeo YouTube)
**GitHub:** https://github.com/edsonluizzz/base-andre-santos
**Deploy:** Vercel (ver domínio em vercel.com → projeto → aba Domains)

---

## Status Atual

Sistema funcional e em produção. Terminologia "Base de Apoio" (não "campanha") em todos os textos visíveis — requisito legal pré-campanha.

---

## Módulos

| Módulo | Rota | Status |
|--------|------|--------|
| Planejamento | `/planejamento` | ✅ ADMIN only · análise STRIDE × sistema · GAPs dinâmicos via $queryRaw |
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
| Cadastro público | `/cadastro` | ✅ sem auth · ?ref= rastreio · contribuições · link compartilhável pós-cadastro · embed vídeo YouTube |
| Convite por link | `/entrar?token=X` | ✅ email-first flow · Google OAuth · completar-perfil |
| Completar perfil | `/completar-perfil` | ✅ formulário pós-login via convite |
| Células | `/celulas` | ✅ visualização hierárquica |
| Ranking | `/ranking` | ✅ scroll horizontal mobile |
| Notificações | sidebar | ✅ nav item com badge de não lidas · dropdown · marcar como lida |
| Metas | `/metas` | ✅ Meta × Realizado por município · barra de progresso · KPIs globais (LEADER+) |
| Privacidade | `/privacidade` | ✅ Política de Privacidade LGPD Art. 9 · público · linkada no /cadastro |

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
- `/api/municipios` — GET (auth) lista 399 municípios PR com cache 24h
- `/api/cep/[cep]` — GET (público) proxy ViaCEP → `{ city, neighborhood, street, state }`
- `/api/municipality-goals` — GET/PUT/DELETE (ADMIN) metas de votos/líderes por cidade

---

## Schema

### Collaborator
`campaignRole`, `status` (LEAD/ACTIVE/INACTIVE), `profile`, `supportStatus`, `source`, `channel CollaboratorChannel?`, `mobilizationScore Float?`, `contributionTypes String[]`, `registeredById String?`, `lgpdConsent`, `lgpdConsentAt`

### MunicipalityGoal
`campaignId`, `city` (unique por campaign), `targetVotes Int`, `targetLeaders Int`
API: `GET/PUT/DELETE /api/municipality-goals` — ADMIN only

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
- Link com rastreio de célula (usuário logado): `/cadastro?ref=<userId>`
- Link de indicação por colaborador público: `/cadastro?refc=<collaboratorId>` — leads indicados recebem `source="INDICACAO"` no banco
- Leads chegam com `status=LEAD`
- Após o cadastro: tela de sucesso exibe embed YouTube (autoplay, nocookie) + card com link compartilhável (botão copiar + compartilhar via WhatsApp)
- ID do vídeo configurado em `YT_VIDEO_ID` no topo de `src/app/cadastro/cadastro-form.tsx` — substituir pelo ID real

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

### Ações manuais do admin
- [ ] **GAP 7:** /grupos → editar grupos com borda âmbar → selecionar zona (meta ≥ 70%)
- [ ] **Scores:** /configuracoes → "Recalcular scores agora" (após popular colaboradores)
- [ ] **Metas:** /configuracoes → "Metas por Município" → cadastrar meta de votos/líderes por cidade

### Infraestrutura
- [ ] Google Calendar: configurar `GOOGLE_CALENDAR_*` no Vercel + conectar com equipeandresantos@gmail.com

### Compliance futuro
- [ ] Checklist candidatura (agosto 2026): CNPJ coligação em TODO material digital + registro SPCE

## GAPs concluídos (sprint 2026-05-07)

- [x] GAP 1: LIDER_RELIGIOSO, EDUCADOR, FAMILIA, JOVEM adicionados ao CollaboratorProfile
- [x] GAP 3: coluna `channel CollaboratorChannel?` em Collaborator (enum INSTAGRAM/WHATSAPP/EVENTO/LINK/OUTRO)
- [x] GAP 4: tabela MunicipalityGoal + API /municipality-goals (GET/PUT/DELETE) + UI em /configuracoes
- [x] GAP 5: coluna `mobilizationScore Float?` em Collaborator
- [x] GAP 6: src/components/dashboard/funnel-panel.tsx — funil total → ativos → confirmados no dashboard
- [x] API /api/municipios — 399 municípios PR com cache + autocomplete no CollaboratorDialog
- [x] API /api/cep/[cep] — proxy ViaCEP público, auto-fill nos formulários de cadastro (admin + público)
- [x] fix GAP 6: existsSync → dynamic import (compatível com Vercel serverless)
- [x] GAP 7 UX: banner de territorialização + destaque visual (borda âmbar + ícone ⚠) em grupos sem zona
- [x] P1-A: /privacidade com Política de Privacidade LGPD + link no /cadastro
- [x] P2-A: /api/public/stats + contadores reais no /cadastro (apoiadores, municípios, grupos)
- [x] /metas: dashboard Meta × Realizado por município (LEADER+) + sidebar
- [x] src/lib/mobilization.ts: fórmula de score (perfil × apoio × status + contribuições)
- [x] POST /api/admin/recalc-scores: recalcula todos em batches de 50
- [x] /configuracoes: botão "Recalcular scores agora" + seção Score de Mobilização
- [x] /planejamento: seção "Sprint de Implantação" + GAPs 5-7 descrições atualizadas
- [x] P1-B + P1-C: já estavam implementados (validate → { ok: true }, pre-auth → rate limit 10/min)
- [x] /planejamento: correlação STRIDE×Sistema atualizada (2 linhas "parcial"→"existe", 2 linhas novas)
- [x] /planejamento: Cenários 2 e 3 atualizados — sistema suporta completamente

## Próximo Sprint — Inteligência Digital (Metricool + Instagram)

### Lacunas estratégicas identificadas (visão de estrategista de campanha)

1. **Cego ao Instagram** — sistema não sabe o que acontece no digital; sem correlação conteúdo→cadastros
2. **Atribuição manual** — `channel` preenchido na mão; precisa ser automático via UTM → cadastro
3. **Sem reativação de inativos** — nenhum alerta de colaboradores sem interação há 30d+
4. **Sem velocidade por município** — mapa mostra estado atual, não crescimento/ritmo
5. **Sem projeção** — nenhuma linha de "se continuar assim, chega no Cenário 3 quando?"
6. **Sem tarefas para líderes** — líderes de célula não têm lista de ações atribuídas
7. **Pipeline evento→cadastro** — conversão pós-evento é 100% manual; falta QR Code pré-preenchido
8. **Sem monitoramento de concorrentes** por município

### Roadmap Metricool + Instagram (6 sprints)

| Sprint | Entregável | Pré-requisito |
|--------|------------|---------------|
| **1** | `Settings.metricoolApiKey` + `/api/instagram/metrics` (proxy) + widget no dashboard | API key do Metricool |
| **2** | Página `/instagram` — gráficos crescimento + top posts + performance por pilar | Sprint 1 |
| **3** | Atribuição automática — `/r?src=instagram&post=X` → `channel` preenchido automaticamente | Sprint 1 |
| **4** | Correlação posts × cadastros no /planejamento — "posts desta semana geraram N cadastros" | Sprint 3 |
| **5** | Alertas de inativos — colaboradores sem interação há 30d+ com sugestão de reativação | — |
| **6** | Projeção de crescimento × meta de cenário — linha de tendência no dashboard | — |

### Arquitetura Metricool planejada

```
Settings.metricoolApiKey  (criptografada)
  ↓
GET /api/instagram/metrics  → proxy server-side, Next.js cache 3600s
GET /api/instagram/posts    → últimos 30 posts com métricas
  ↓
src/components/dashboard/instagram-panel.tsx  (widget dashboard)
src/app/(dashboard)/instagram/page.tsx        (análise completa, LEADER+)
```

**Campos que o Metricool retorna:** seguidores · engajamento · alcance · impressões · dados demográficos · métricas por post

**O que exibir no widget (Sprint 1):**
- Seguidores hoje + delta semanal
- Taxa de engajamento (últimos 30 posts)
- Melhor post da semana por alcance
- Cadastros via Instagram esta semana (cruzar `channel=INSTAGRAM` + data)

**Próximo passo para iniciar:** confirmar acesso à API do Metricool e conta do Instagram conectada

## Ideias para o futuro

- WhatsApp broadcast em massa (Z-API) — quando base > 500 contatos
- Monitoramento de concorrentes por município
- QR Code de evento → pré-preenchimento do formulário com `source=EVENTO&event_id=X`
- Gestão de tarefas para líderes de célula ("recrutar 5 em Colombo até 15/jun")
- Resend: domínio verificado para emails transacionais

---

## Armadilhas conhecidas

- `campaignId` fixo = "andre-santos-2026" em todos os endpoints
- NextAuth v5 Beta: `user.id` no jwt callback = sub do OAuth (não UUID). `auth.ts` resolve via `findUnique({ email })`
- Build usa `prisma db push` — banco Neon precisa estar acessível no build
- `typescript: { ignoreBuildErrors: true }` — erros de tipo não quebram o build
- Terminologia: usar "base de apoio" (não "campanha") nos textos visíveis — requisito legal
- `.catch(() => {})` em vários pontos do JWT callback — erros silenciosos; monitorar via Vercel logs
- `/entrar`, `/api/invite/*` e `/api/cep/*` DEVEM estar na lista `isPublic` em `auth.config.ts`
- **`existsSync` não funciona em Vercel serverless** — source `src/` não existe no runtime. Usar dynamic import para detectar presença de módulos

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
