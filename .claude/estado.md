# Estado — Base André Santos

**Última atualização:** 2026-04-25
**GitHub:** https://github.com/edsonluizzz/base-andre-santos
**Deploy:** Vercel (ver domínio em vercel.com → projeto → aba Domains)

---

## Status Atual

Sistema funcional com auth, módulos completos e dois novos recursos implantados hoje.
Build no Vercel depende das env vars abaixo.

---

## O que está pronto

- **Auth** — Google OAuth single-tenant (campaignId = "andre-santos-2026")
- **Tema** — Navy/gold em globals.css
- **Sidebar** — Dashboard, Colaboradores, Mapa de Apoio, Zonas, Grupos WA, Agenda, Comunicados, Configurações
- **APIs** — /collaborators, /collaborators/[id], /zones, /groups, /groups/[id]/members, /events, /broadcasts, /settings, /dashboard/summary, /mapa, /api/public/cadastro
- **Módulos completos:**
  - Colaboradores (CRUD, filtros, badges por cargo/status)
  - Mapa de Apoio (lideranças por cidade com status CONFIRMADO/NEGOCIANDO/NEUTRO/ADVERSARIO)
  - Página pública /cadastro (sem auth, captura leads)
  - Zonas, Grupos WA, Agenda, Comunicados, Configurações
- **Schema Collaborator:** campaignRole, status (LEAD/ACTIVE/INACTIVE), profile (PASTOR, PRESIDENTE_ASSOCIACAO, LIDER_POLITICO, VEREADOR, EMPRESARIO, LIDERANCA_COMUNITARIA, APOIADOR), supportStatus (CONFIRMADO, NEGOCIANDO, NEUTRO, ADVERSARIO), source

---

## Para o Edson configurar no Vercel

```
DATABASE_URL         = (Neon DB)
AUTH_SECRET          = (openssl rand -base64 32)
AUTH_GOOGLE_ID       = (Google Cloud Console)
AUTH_GOOGLE_SECRET   = (Google Cloud Console)
APP_URL              = https://<dominio>.vercel.app
ADMIN_EMAILS         = edsonluizz.silva@gmail.com
SUPER_ADMIN_EMAILS   = edsonluizz.silva@gmail.com
```

Opcionais: RESEND_API_KEY, BLOB_READ_WRITE_TOKEN, GOOGLE_CALENDAR_*

---

## Como usar o Mapa de Apoio

1. Ir em Colaboradores → Novo ou editar existente
2. Preencher campo **Perfil** (Pastor, Vereador, etc.) — qualquer coisa que não seja "Apoiador" aparece no mapa
3. Preencher **Apoio ao André** (Confirmado, Negociando, Neutro, Adversário)
4. No menu lateral: **Mapa de Apoio** mostra todos agrupados por cidade com barra de progresso

## Como usar a página pública /cadastro

- Link: `https://<dominio>.vercel.app/cadastro` — compartilhar no WhatsApp
- Leads chegam com status = LEAD na lista de Colaboradores (filtro "Leads")
- Para promover: editar o lead, trocar status para Ativo e definir cargo

---

## Próximas features

- [ ] Página de grupo WA: gerenciar membros (add/remove colaboradores)
- [ ] Colaboradores: importação CSV
- [ ] Google Calendar: sync bidirecional de eventos
- [ ] Relatório de cobertura por município
- [ ] Dashboard: mapa visual do Paraná com cobertura por cidade

---

## Armadilhas conhecidas

- `campaignId` é fixo = "andre-santos-2026" em todos os endpoints — não mudar
- Auth mantém `session.user.establishmentId` como alias de `campaignId` para compatibilidade
- Schema usa `campaignRole` (não `role`) no model Collaborator — cuidado ao filtrar
- Build roda `prisma db push` — banco Neon precisa estar acessível no build
