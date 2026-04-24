# Ovile — Plano Estratégico 2026

> Gerado em 2026-04-22. Atualizar conforme itens forem concluídos.

---

## Situação atual

Produto v1 completo: auth, membros, financeiro, chamada, QR, portal, comunicados, relatórios, camisetas, visitantes, PWA, observabilidade.

Foco agora: **crescer, monetizar melhor e fidelizar**.

---

## Roadmap Priorizado

### Semana 1 — Monetização rápida + infra

- [ ] **Plano anual no Stripe** — R$24,99/mês cobrado anualmente (R$299,88 à vista). Novo Price ID no Stripe + opção na tela de billing.
- [ ] **Rodar migration de índices em prod** — `20260419000000_add_missing_indexes` (Event.date, Attendance.memberId, Offering.date)
- [ ] **Rate limit `/api/visitors`** — max 10 req/min por IP

### Semana 2 — Células / Grupos pequenos

- [ ] Model `Cell`: id, name, establishmentId, leaderId, meetingDay, meetingTime
- [ ] Model `CellMember`: cellId, memberId
- [ ] Model `CellMeeting`: cellId, date, notes
- [ ] Model `CellAttendance`: cellMeetingId, memberId, present
- [ ] CRUD de células (página `/celulas`)
- [ ] Chamada de célula (fluxo similar à chamada de evento)
- [ ] Relatório: crescimento por célula, frequência média
- [ ] Sidebar: item "Células" (LEADER+ADMIN)

### Semana 3 — Dízimo individual

- [ ] Campo `memberId` opcional em `Offering` (vínculo ao membro)
- [ ] UI: ao registrar oferta, campo "Membro" (opcional, autocomplete)
- [ ] Relatório individual: histórico de dízimos por membro no ano
- [ ] Comprovante PDF: export anual por membro (útil para IR)
- [ ] Portal do membro: seção "Meus dízimos"

### Semana 4 — Crescimento orgânico

- [ ] **Referral program**: código único por estabelecimento → indica outra igreja → ambos ganham 1 mês grátis
  - Model `Referral`: referrerId (establishmentId), referredId, redeemedAt
  - Banner no dashboard: "Indique uma igreja, ganhe 1 mês grátis"
  - Webhook Stripe: ao confirmar pagamento da indicada, aplica crédito na indicante
- [ ] **SEO básico**: meta tags Open Graph + Twitter Card na landing page
- [ ] **Blog estático** (`/blog`): 5 artigos iniciais sobre gestão de igrejas

### Mês 2 — PIX + Push + Oração + Escala

- [ ] **PIX para ofertas online**
  - Integração Pagar.me ou Efí Bank
  - Página pública `/oferta/[slug]` — membro ou visitante faz PIX
  - Admin vê transações em tempo real no financeiro
  - Taxa: 1,5% por transação (receita adicional)

- [ ] **Web push notifications**
  - Ativar push via service worker (PWA já está configurado)
  - Solicitar permissão no primeiro login
  - Triggers: aniversários, eventos, comunicados, pedidos de oração

- [ ] **Pedidos de oração**
  - Model `PrayerRequest`: memberId, establishmentId, text, isAnonymous, answeredAt
  - Membro submete pelo portal → líder vê lista → marca como atendido

- [ ] **Escala ministerial**
  - Model `ServiceScale`: eventId, memberId, role (LOUVOR, RECEPCAO, INTERCESSAO, etc.)
  - Admin/Líder monta escala → notificação automática para os escalados

---

## Novo modelo de preços

| Plano | Preço | Limite | Diferenciais |
|-------|-------|--------|-------------|
| FREE | R$0 | 50 membros | Todos os módulos básicos |
| PRO mensal | R$29,99/mês | Ilimitado | Relatórios PDF, Camisetas |
| PRO anual | R$24,99/mês (R$299,88/ano) | Ilimitado | Mesmo do PRO + desconto |
| PLUS | R$79,99/mês | Ilimitado | PRO + PIX, Células avançadas, Suporte WhatsApp |

---

## Pendências de infraestrutura (ação do Edson no Vercel)

- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `SENTRY_ORG`
- [ ] `SENTRY_PROJECT`
- [ ] `SENTRY_AUTH_TOKEN`
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` — criar projeto em posthog.com
- [ ] `NEXT_PUBLIC_POSTHOG_HOST` — `https://us.i.posthog.com`

---

## Gaps estratégicos identificados (referência)

### Produto
- Células/grupos pequenos — maior gap para igrejas pentecostais brasileiras
- Dízimo individual + comprovante IR
- Pedidos de oração (engajamento diário)
- Escala ministerial (elimina o WhatsApp manual do líder)

### Monetização
- Plano anual (melhora LTV e reduz churn)
- PIX para ofertas (nova linha de receita via taxa de transação)
- Tier PLUS para igrejas grandes

### Crescimento
- Referral program (igrejas recomendam igrejas — canal principal)
- SEO: zero conteúdo para ranquear "software gestão de igreja"
- Demo sem cadastro na landing page
- Parceria com denominações (Assembleia de Deus, Batista)
- App na Play Store / App Store (wrapper Capacitor)

### Retenção
- Web push notifications (engajamento mesmo sem abrir o app)
- Audit log de ações (governança para igrejas maiores)

---

## Histórico de sprints concluídos

| Data | Sprint |
|------|--------|
| 2026-04-13 | Auth multi-tenant, membros, financeiro, portal |
| 2026-04-15 | Convite WhatsApp, PWA, import 100+ linhas, BankAccount |
| 2026-04-16 | Calendário interativo, onboarding admin+membro, comunicados, nurturing |
| 2026-04-17 | QR presença, Sentry, relatório semanal, visitantes, LGPD, camisetas portal |
| 2026-04-19 | try/catch 10 rotas, índices Prisma, upload whitelist, PostHog, N+1s, dashboard summary |
