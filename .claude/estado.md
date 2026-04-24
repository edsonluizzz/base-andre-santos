# Estado — Base André Santos

**Última atualização:** 2026-04-24
**GitHub:** https://github.com/edsonluizzz/base-andre-santos
**Deploy:** Vercel (importado, build pendente de env vars)

---

## Status Atual

O projeto foi criado do zero nesta sessão, clonado do Ovile e completamente pivotado para gestão de campanha política. O código está completo e no GitHub. O build no Vercel vai falhar enquanto as env vars não estiverem configuradas.

---

## O que está pronto

- **schema.prisma** — Modelos: Campaign, Collaborator, Zone, ZoneCollaborator, WhatsAppGroup, WhatsAppGroupMember, Event, Attendance, EventRsvp, Broadcast, UserCampaign, User, Notification, Settings, AuditLog
- **Auth** — Google OAuth single-tenant (campaignId = "andre-santos-2026")
- **Tema** — Navy/gold aplicado em globals.css
- **Sidebar** — Navegação: Dashboard, Colaboradores, Zonas, Grupos WA, Agenda, Comunicados, Configurações
- **Páginas** — Todas as 7 páginas criadas com UI funcional
- **APIs** — /collaborators, /zones, /groups, /groups/[id]/members, /events, /broadcasts, /settings, /dashboard/summary
- **Componentes** — CollaboratorDialog, DeleteConfirm
- **seed.ts** — Cria Campaign "andre-santos-2026" e Settings
- **Login** — Página de login com Google OAuth, identidade visual navy/gold

---

## Para o Edson fazer antes de retomar

### Obrigatório para o build passar:
1. Criar banco no **Neon DB** (neon.tech) → copiar DATABASE_URL
2. No **Vercel → Settings → Environment Variables**, adicionar:
   ```
   DATABASE_URL         = (do Neon)
   AUTH_SECRET          = (gerar: openssl rand -base64 32)
   AUTH_GOOGLE_ID       = (Google Cloud Console)
   AUTH_GOOGLE_SECRET   = (Google Cloud Console)
   APP_URL              = https://base-andre-santos.vercel.app (ou domínio customizado)
   ADMIN_EMAILS         = edsonluizz.silva@gmail.com
   SUPER_ADMIN_EMAILS   = edsonluizz.silva@gmail.com
   ```
3. Trigger new deploy no Vercel

### Opcional (pode fazer depois):
- RESEND_API_KEY (e-mails)
- BLOB_READ_WRITE_TOKEN (upload de fotos)
- GOOGLE_CALENDAR_* (sync de agenda)

---

## Próximas features (retomar amanhã)

- [ ] Página de grupo WA: gerenciar membros diretamente (add/remove colaboradores)
- [ ] Colaboradores: importação CSV
- [ ] Google Calendar: sync bidirecional de eventos
- [ ] Relatório de cobertura por município
- [ ] Campo de busca por bairro/zona na lista de colaboradores
- [ ] Dashboard: mapa do Paraná com cobertura

---

## Armadilhas conhecidas

- `campaignId` é fixo = "andre-santos-2026" em todos os endpoints — não mudar
- Auth mantém `session.user.establishmentId` como alias de `campaignId` para compatibilidade com tipos NextAuth
- Schema usa `campaignRole` (não `role`) no model Collaborator — cuidado ao filtrar
- O build roda `prisma migrate deploy` — banco precisa estar acessível no momento do build
