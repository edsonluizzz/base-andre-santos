# Roadmap V2 e Além

## Visão de Produto

**UMADC Sistema** — A plataforma completa de gestão para grupos jovens evangélicos.

De uma ferramenta interna de organização para um SaaS com múltiplos clientes, portal de membros e ecossistema de comunicação integrado.

---

## V2 (Este release)

**Tema:** Segurança, Controle e Expansão de Módulos

| Feature | Status |
|---------|--------|
| Auditoria e correção de segurança | ✅ Sprint 1 |
| Novo design system (Obsidian + Royal Purple) | ✅ Sprint 2 |
| Controle de acesso granular por módulo | ✅ Sprint 3 |
| Módulo de encomendas de camisetas para congressos | ✅ Sprint 4 |
| Loading skeletons e empty states | ✅ Sprint 2 |

---

## V2.1 — Comunicação

**Tema:** Integração com WhatsApp e notificações

- Botões de ação WhatsApp em ausências detectadas
- Templates de mensagem configuráveis
- Lembretes automáticos de eventos
- Centro de notificações in-app (sino no header)
- Confirmação de presença por membro

**Estimativa:** 2-3 semanas de desenvolvimento

---

## V2.2 — Ministérios

**Tema:** Gestão de ministérios e escalas

- Cadastro de ministérios e células
- Líder responsável por ministério
- Membros em múltiplos ministérios
- Chamada segmentada por ministério
- Escalas semanais com confirmação
- Relatórios por ministério

**Estimativa:** 3-4 semanas de desenvolvimento

---

## V3 — SaaS e Multi-Tenant

**Tema:** De produto interno para plataforma comercial

- Entidade `Organization` (cada grupo = 1 org)
- Onboarding automático (criar conta, configurar grupo, convidar membros)
- Planos de assinatura (Free / Pro / Plus)
- Integração de pagamento (Stripe ou Mercado Pago)
- Dashboard de admin geral (super-admin ver todas as organizações)
- Portal do membro com login separado

**Modelo de negócio:**
- Free: 30 membros, funcionalidades básicas
- Pro (R$ 29/mês): ilimitado + camisetas + relatórios avançados
- Plus (R$ 59/mês): tudo + suporte + API

**Potencial de mercado:**
- Estimativa conservadora: 500 grupos jovens no Brasil como clientes
- Receita potencial: R$ 14.500/mês (500 x R$ 29)
- Custo de infraestrutura: ~R$ 200/mês (Neon + Vercel)

**Estimativa:** 2-3 meses de desenvolvimento

---

## V4 — Ecossistema Completo

**Tema:** App mobile + integrações

- App React Native (ou Next.js PWA avançado)
- Integração com Evolution API (WhatsApp Business)
- Integração com Google Calendar (sincronização bidirecional)
- Galeria de fotos e documentos (Vercel Blob)
- Relatórios em PDF automáticos mensais
- Backup automático de dados

---

## Stack Técnica Futura

| Componente | Atual | V3/V4 |
|------------|-------|--------|
| Framework | Next.js 14 | Next.js 15 |
| Auth | NextAuth v5 | NextAuth v5 + Clerk (optional) |
| Banco | Neon PostgreSQL | Neon PostgreSQL (multi-tenant com RLS) |
| Cache | Sem cache | Redis (Upstash) |
| Storage | Vercel Blob | Vercel Blob |
| Email | — | Resend |
| Payments | — | Stripe |
| Analytics | — | PostHog |
| Monitoring | — | Sentry |

---

## Próxima Ação Imediata

Após implementar a V2, o passo de maior ROI é:

1. **Criar landing page** para o produto (Next.js + Vercel, usando o mesmo projeto)
2. **Multi-tenant simples**: adicionar `churchId` em todas as tabelas
3. **Cobrar R$ 0** dos primeiros 10 grupos (feedback e testemunhos)
4. **Lançar no Product Hunt** com o módulo de camisetas como diferencial único
