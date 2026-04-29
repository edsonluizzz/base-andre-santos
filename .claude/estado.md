# Estado — Base André Santos

**Última atualização:** 2026-04-28
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
| Colaboradores | `/colaboradores` | ✅ CSV import · seleção em massa · bulk status |
| Mapa de Apoio | `/mapa` | ✅ choropleth PR · zoom/pan · tooltip hover |
| Zonas | `/zonas` | ✅ |
| Grupos WhatsApp | `/grupos` | ✅ gerenciamento de membros |
| Agenda | `/agenda` | ✅ + botão Google Calendar sync |
| Comunicados | `/comunicados` | ✅ filtro por audiência + contagem em tempo real |
| Configurações | `/configuracoes` | ✅ logo · join code · Google Calendar |
| Relatório | `/relatorio` | ✅ cobertura por município + export CSV |
| Minha Célula | `/minha-celula` | ✅ tier · stats · link de convite · gestão de status |
| Super Admin | `/super-admin` | ✅ conceder/revogar acesso via Gmail · role/tier |
| Onboarding | `/onboarding` | ✅ boas-vindas + tour de features |
| Perfil colaborador | `/colaboradores/[id]` | ✅ |
| Cadastro público | `/cadastro` | ✅ sem auth · ?ref= rastreio · contribuições |

---

## APIs

- `/api/collaborators` — CRUD + filtros + `?mine=true`
- `/api/collaborators/[id]` — GET/PUT/DELETE (lider de célula pode editar status dos próprios)
- `/api/collaborators/import` — bulk CSV (max 500 linhas)
- `/api/collaborators/bulk` — PATCH status em massa (max 500)
- `/api/mapa` — lideranças agrupadas por cidade + stats
- `/api/mapa/stats` — agregado por cidade para choropleth (todos os colaboradores)
- `/api/my-cell` — tier + stats + userId do usuário logado
- `/api/admin/users` — listar/convidar usuários por Gmail
- `/api/admin/users/[id]` — atualizar role/tier, revogar acesso
- `/api/broadcasts` + `/api/broadcasts/count` — comunicados + contagem por audiência
- `/api/relatorio/export` — CSV de cobertura
- `/api/google-calendar/connect`, `/callback`, `/sync` — OAuth + sync bidirecional
- `/api/public/cadastro` — sem auth, rate limit 5/min, dedup por telefone

---

## Schema

### Collaborator
`campaignRole`, `status` (LEAD/ACTIVE/INACTIVE), `profile`, `supportStatus`, `source`, `contributionTypes String[]`, `registeredById String?`

### UserCampaign
`tier CollaboratorTier` (APOIADOR/ATIVISTA/LIDER_CELULA/COORDENADOR) — recalculado por `src/lib/tier.ts`
- Thresholds: 0–4 APOIADOR · 5–14 ATIVISTA · 15+ LIDER_CELULA · COORDENADOR manual

### Settings
`campaignName`, `logoBase64`, `googleRefreshToken`

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

### Seleção em massa (colaboradores)
- Checkboxes em cada linha; "selecionar todos" no topo
- Barra flutuante: Ativo / Lead / Inativo em massa

### Conceder acesso ao sistema
- Super Admin → "Conceder Acesso" → insere Gmail → convite pendente
- Ao fazer login com Google, acesso é ativado automaticamente

### Mapa choropleth
- `/public/pr-municipalities.json` — GeoJSON IBGE, 399 municípios PR
- Verde degradê (confirmados) · vermelho (adversários) · âmbar (negociando) · cinza (neutro)
- Zoom por scroll/botões, pan por arrastar, tooltip ao hover

### Tiers automáticos
- Recalculados em `recalcTier()` a cada criação/alteração/exclusão de colaborador
- Exibidos no card "Minha Célula" do dashboard e na página `/minha-celula`

---

## Pendências

- [ ] Google Calendar: configurar env vars `GOOGLE_CALENDAR_*` no Vercel
- [ ] Resend: verificar domínio + configurar `RESEND_FROM` no Vercel
- [ ] Comunicados via WhatsApp (Evolution API / Z-API) — integração real de broadcast

---

## Armadilhas conhecidas

- `campaignId` fixo = "andre-santos-2026" em todos os endpoints
- NextAuth v5 Beta: `user.id` no jwt callback = sub do OAuth (não UUID). `auth.ts` resolve via `findUnique({ email })`
- Build usa `prisma db push` — banco Neon precisa estar acessível no build
- `typescript: { ignoreBuildErrors: true }` — erros de tipo não quebram o build
- Terminologia: usar "base de apoio" (não "campanha") nos textos visíveis — requisito legal
