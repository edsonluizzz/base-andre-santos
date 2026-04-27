# Estado — Base André Santos

**Última atualização:** 2026-04-25 (sessão tarde)
**GitHub:** https://github.com/edsonluizzz/base-andre-santos
**Deploy:** Vercel (ver domínio em vercel.com → projeto → aba Domains)

---

## Status Atual

Sistema funcional e em produção. Build passando com `typescript: { ignoreBuildErrors: true }`.
Auth corrigida: Edson entra como ADMIN com `isSuperAdmin: true`.

**Sprint 2026-04-27:** Contribuições + rastreio + tiers + lider de célula implementados.
- `/cadastro` agora aceita `?ref=<userId>` para rastreio + multi-select de formas de contribuição
- Dashboard exibe card "Minha Célula" com tier, contadores e link copiável
- Lista de colaboradores: filtro "Meus cadastros" + mostra quem cadastrou
- Permissão de lider de célula: usuário pode alterar status dos colaboradores que registrou

---

## O que está pronto

### Módulos
| Módulo | Rota | Status |
|--------|------|--------|
| Dashboard | `/dashboard` | ✅ |
| Colaboradores | `/colaboradores` | ✅ com importação CSV |
| Mapa de Apoio | `/mapa` | ✅ |
| Zonas | `/zonas` | ✅ |
| Grupos WhatsApp | `/grupos` | ✅ com gerenciamento de membros |
| Agenda | `/agenda` | ✅ |
| Comunicados | `/comunicados` | ✅ |
| Configurações | `/configuracoes` | ✅ nome da campanha + logo + join code |
| Cadastro público | `/cadastro` | ✅ sem auth |

### APIs
- `/api/collaborators` — CRUD + filtros (status: LEAD/ACTIVE/INACTIVE)
- `/api/collaborators/[id]` — GET/PUT/DELETE
- `/api/collaborators/import` — bulk import CSV (max 500 linhas)
- `/api/mapa` — lideranças agrupadas por cidade + stats
- `/api/groups` + `/api/groups/[id]` + `/api/groups/[id]/members`
- `/api/zones`, `/api/events`, `/api/broadcasts`, `/api/settings`
- `/api/campaign` — GET/PUT para nome e joinCode da campanha
- `/api/public/cadastro` — sem auth, rate limit 5/min, dedup por telefone

### Schema Collaborator
Campos relevantes: `campaignRole`, `status` (LEAD/ACTIVE/INACTIVE), `profile`, `supportStatus`, `source`, `contributionTypes String[]`, `registeredById String?`

### Schema UserCampaign
Campo `tier CollaboratorTier` (APOIADOR/ATIVISTA/LIDER_CELULA/COORDENADOR) — recalculado automaticamente por `src/lib/tier.ts`

### Tiers (thresholds automáticos por cadastros ativos)
- APOIADOR: 0–4 · ATIVISTA: 5–14 · LIDER_CELULA: 15+ · COORDENADOR: manual

---

## Env Vars necessárias no Vercel

```
DATABASE_URL
AUTH_SECRET
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
APP_URL
ADMIN_EMAILS         = edsonluizz.silva@gmail.com
SUPER_ADMIN_EMAILS   = edsonluizz.silva@gmail.com
```
Opcionais: `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `GOOGLE_CALENDAR_*`

---

## Como usar os principais recursos

### Mapa de Apoio
- Colaboradores com `profile` ≠ APOIADOR aparecem no mapa
- Editar colaborador → campos "Perfil" e "Apoio ao André"

### Cadastro público /cadastro
- Link: `https://<dominio>.vercel.app/cadastro`
- Leads chegam com `status = LEAD` → filtro "Leads" na lista de colaboradores

### Importação CSV
- Botão "Importar CSV" na página de colaboradores
- Formato: `nome, telefone, email, cidade, bairro, cargo`
- Dedup automático por telefone; máx 500 linhas

---

## Próximas features

- [ ] Google Calendar: sync bidirecional de eventos
- [ ] Relatório de cobertura por município
- [ ] Dashboard: mapa visual do Paraná com cobertura por cidade
- [ ] Página "Minha Célula" dedicada: lista dos próprios cadastros com gestão de status

---

## Armadilhas conhecidas

- `campaignId` fixo = "andre-santos-2026" em todos os endpoints
- `auth.ts` usa `db.user.findUnique({ where: { email } })` para resolver o userId real (o sub do Google OAuth ≠ UUID do banco)
- Build usa `prisma db push` — banco Neon precisa estar acessível no build
- `typescript: { ignoreBuildErrors: true }` em next.config.mjs — erros de tipo não quebram o build
