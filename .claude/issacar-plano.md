# Plano — ISSACAR.IA (issacar.app): Multi-Tenant + Rename + Escalabilidade

> **Status:** Planejado em 2026-05-13 · Aguardando início da implementação
> **Próximo passo:** Criar branch `v2/issacar` e iniciar Sprint 1

## Contexto

O projeto "Base André Santos" (CRM eleitoral) será transformado em produto SaaS
chamado **ISSACAR.IA**, vendido para múltiplas campanhas políticas. O sistema
existente está em produção e funcionando — não pode parar.

**Decisões confirmadas:**
- Nome do produto: **ISSACAR.IA** · domínio: **issacar.app** · acesso: `app.issacar.app`
- Acesso: domínio único com seleção de campanha no login
- Isolamento de banco: banco separado por campanha (Neon project per tenant)
- Branch: `v2/issacar` para desenvolvimento paralelo (`main` continua em produção)
- Colaboradores: isolados por campanha — mesmo apoiador em 2 campanhas = 2 registros (LGPD)
- Usuários/operadores: compartilhados via `UserCampaign` — 1 login, múltiplas campanhas

---

## Estratégia de Branch

```
main          → Base André Santos em produção (NUNCA quebrar)
v2/issacar    → ISSACAR.IA multi-tenant (desenvolvimento)
```

Ao concluir o v2, criar novo projeto Vercel apontando para `v2/issacar`.
O deploy do André Santos continua intacto em `main`.

```bash
git checkout -b v2/issacar
git push -u origin v2/issacar
```

---

## Reaproveitamento do Ovile (100% aplicável)

O Ovile (SaaS igrejas) já tem multi-tenant idêntico ao que precisamos:

| Ovile | ISSACAR.IA |
|-------|-----------|
| `Establishment` model | `Campaign` model (já existe) |
| `UserEstablishment` | `UserCampaign` (já existe) |
| `session.user.establishmentId` | `session.user.campaignId` |
| `const eid = session.user.establishmentId` | `const cid = session.user.campaignId` |
| `needsChurchSelection` flag | `needsCampaignSelection` flag |

**Ovile files para copiar/adaptar:**
- `src/lib/auth.ts` → JWT callback com tenant dinâmico
- `src/types/next-auth.d.ts` → extensão de sessão

---

## Mapeamento de impacto

- **61 arquivos** com `"andre-santos-2026"` hardcoded (74 ocorrências)
- `campaignId` JÁ EXISTE no tipo JWT — só está hardcoded no valor
- `auth.ts` injeta `token.campaignId = CAMPAIGN_ID` (fixo) → mudar para dinâmico

---

## Modelo de dados: dois tipos de pessoa

| Entidade | Isolamento |
|----------|-----------|
| `User` (operador) | **Compartilhado** — 1 login, múltiplas campanhas via `UserCampaign` |
| `Collaborator` (apoiador) | **Isolado** — mesmo João em 2 campanhas = 2 registros distintos |

---

## Arquitetura — Banco separado por campanha

```
app.issacar.app (Next.js, Vercel Pro)
    │
    ├── META DATABASE (Neon Launch, ~$19/mês)
    │       campaigns { id, slug, name, dbUrl (criptografado), plan, active }
    │       ↑ lida no JWT callback para resolver DATABASE_URL da campanha
    │
    ├── DB Campanha A (Neon Free/Launch por campanha)
    ├── DB Campanha B
    └── DB Campanha C
```

**auth.ts — JWT callback:**
```typescript
const metaCampaign = await metaDb.campaign.findFirst({
  where: { id: token.campaignId },
  select: { dbUrl: true }
});
token.dbUrl = metaCampaign?.dbUrl; // URL criptografada no JWT
```

**route.ts — padrão após migração:**
```typescript
const session = await auth();
const db = getTenantDb(session.user.dbUrl);
const cid = session.user.campaignId;
```

---

## Sprints

### Sprint 1 — Branch + Estrutura base ← COMEÇAR AQUI
1. `git checkout -b v2/issacar`
2. Criar META DATABASE no Neon (projeto separado)
3. `src/lib/meta-db.ts` — PrismaClient da meta-database
4. `src/lib/tenant-db.ts` — helper PrismaClient com URL dinâmica
5. Atualizar `src/lib/auth.ts` — JWT busca `dbUrl` na meta-database
6. Atualizar `src/types/next-auth.d.ts` — adicionar `campaignId` e `dbUrl`

Arquivos críticos: `src/lib/auth.ts` (6x hardcoded) · `src/lib/auth.config.ts` (1x) · `src/types/next-auth.d.ts`

### Sprint 2 — Remover hardcode das 61 rotas
```typescript
// ANTES: const CID = "andre-santos-2026";
// DEPOIS: const db = getTenantDb(session.user.dbUrl); const cid = session.user.campaignId;
```
Prioridade: `src/lib/tier.ts` → `collaborators/route.ts` → `admin/users/route.ts` → restante

### Sprint 3 — Onboarding + Personalização do candidato
Campos novos em Campaign: `candidateName`, `candidatePhoto`, `party`, `district`, `electionYear`, `primaryColor`, `secondaryColor`, `subscriptionPlan`
Fluxo: `/nova-campanha` → provisiona Neon → cria meta-db entry → envia convite admin

### Sprint 4 — Rename ISSACAR.IA
- Substituir "Base André Santos" em toda UI, docs, package.json, meta tags
- Novo repo GitHub: `issacar-ia`

### Sprint 5 — Cortar features
**Manter:** Google Calendar sync · Telegram Bot · VelocityPanel
**Remover:** EventRsvp model · birthday cron · nurturing cron · weekly-report cron · TSE cron (manter botão manual)
**Resultado:** de 7 crons → 2 (`gcal-sync` + `agenda-telegram`)

---

## Escalabilidade

| Componente | Plano | Custo/mês |
|------------|-------|-----------|
| Vercel | Pro | ~$20 |
| Neon meta-db | Launch | ~$19 |
| Neon por campanha | Free → Launch | $0–$19/campanha |
| **10 campanhas** | | **~$59** |
| **50 campanhas** | | **~$100–200** |

Neon Free (512MB) suporta ~5.000–10.000 colaboradores por campanha.
