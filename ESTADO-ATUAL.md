# Estado Atual da Produção — 2026-06-09

**Última atualização:** 2026-06-09 (noite) BRT

---

## 📌 Sessão 2026-06-09 (auditoria com skills ECC) — RETOMAR AQUI

Auditoria do código (em sync com git `edsonluizzz/base-andre-santos`) via skills novas (silent-failure-hunter / postgres-patterns / e2e-testing).

**Feito nesta sessão:**
- ✅ **Falhas silenciosas corrigidas** (commit `c9b79cf`): 6 telas do dashboard (configuracoes, colaboradores, mapa, agenda, completar-perfil, disparar) tinham `.catch(() => {})` vazios que deixavam a tela vazia sem avisar o usuário. Agora usam `toast.error` (loads críticos) ou `console.error` (loads de fundo). **Conferir se buildou OK no Vercel.**
- ✅ Confirmado que o bug do `/api/n8n/config` já estava resolvido (validateCampaign).

**Decisões 2026-06-09 (noite) — Edson:**
- **Sem upgrade Vercel Pro por enquanto** — estratégia: extrair o máximo do plano free (Hobby). Resiliência de pico deve ser desenhada dentro dos limites do free.
- **Miriam Ferreira FORA DO RADAR** — parar tudo relacionado a ela (UserCampaign, schema, integrações). Multi-tenant continua no código, mas sem segundo tenant ativo.
- ✅ METRICOOL_TOKEN migrado pra UI · ✅ DNS `andre.ovile.com.br` adicionado · ✅ token Upstash rotacionado.
- **WF1/WF3 (n8n) permanecem DESATIVADOS** — warmup WhatsApp adiado até nova decisão.
- ✅ Captação dos ebooks já roda sem planilha Google (direto no CRM) há dias.

**Próximos passos (ordem):**
1. ✅ **CONCLUÍDO 2026-06-09 (commit `1634b0c`)** — E2E `/cadastro` no CI: 7 testes
   Playwright (render, validação client-side, fluxo completo, dedup, 400, 429 rate-limit,
   cota EBOOK) rodando no job `e2e-cadastro` do deploy-guardian contra postgres:16
   descartável. Verde de primeira. `db.ts` agora escolhe adapter pela URL (neon.tech →
   PrismaNeon; Postgres comum → PrismaPg) — produção inalterada.
2. ✅ **CONCLUÍDO 2026-06-09 (commit `661f7e9`)** — Resiliência de pico no free = dieta
   de invocações: middleware fora de /cadastro, /ebook, /privacidade, /r, /api/public,
   /api/cep · /cadastro force-static (CDN puro, `PRERENDER` confirmado em prod) ·
   stats s-maxage=300 e CEP s-maxage=86400 (`HIT` confirmado em prod) · /dashboard
   continua 302→/login. QStash e pool tuning descartados (racional no PLAN.md).
3. **Itens menores:** limpar 10 UserCampaigns duplicadas do André · setar `N8N_IMPORT_WEBHOOK_URL` · remover `/api/n8n/seed-tenants` (era p/ provisionamento Miriam) · dívida técnica mapeada (23 type-errors, CSP, cron fail-open, telegram secret).

⚠️ **Achado 2026-06-09:** o job `Check & Auto-Heal` do deploy-guardian falha em TODO
push há dias — o `npx tsc --noEmit` dele esbarra nos 23 type-errors conhecidos (a flag
`ignoreBuildErrors` só silencia o `next build`, não esse step). O X vermelho constante
mascara falha real. Decidir: tornar o tsc não-bloqueante no guardian OU zerar os 23 erros.

⚠️ **Não rodar `npm run build` local** — ele executa `prisma db push` e mexe no banco de produção. Validação real é no Vercel.

---

## 🟢 O que está FUNCIONANDO

### Campanha André Santos (`andre-santos-2026`)
- Site/painel: `ovile.com.br`
- Cadastro público: `ovile.com.br/cadastro`, `leads.prandresantos.com.br`, `prandresantos.com.br/casamento`
- Base: 2.359 leads (1.702 LEAD, 655 ACTIVE, 2 INACTIVE)
- **20 UserCampaigns** (era 30, removidas 10 PENDING duplicadas em 2026-06-02 15h)
- Banco Neon `ep-icy-recipe-aci0svlb-pooler.sa-east-1.aws.neon.tech`
- Schema atualizado (Broadcast + BroadcastDelivery ativos)
- `Campaign.domain = "ovile.com.br"` ✓
- `Campaign.candidateName = "André Santos"` ✓
- Integrações:
  - ✓ Metricool: migrado pra `Campaign.metricoolToken` (2026-06-02)
  - Telegram: ainda via env var fallback (funciona, sem urgência migrar)
  - Z-API: ainda via env var fallback (funciona, sem urgência migrar)

### Módulos novos (2026-06-02 madrugada)
- ✅ Disparo manual WhatsApp: `/comunicados/disparar` (ADMIN-only)
- ✅ Importação XLSX com `sourceOverride` (Origem custom)
- ✅ Rate-limit Upstash adaptativo (EBOOK_* = 100/min, outros 5/min)
- ✅ Hardening burst: aguenta ~100 cadastros/min sem travar
- ✅ Tokens criptografados (AES-256-GCM, `Campaign.metricoolToken/telegramBotToken/zApiToken/zApiClientToken`)

### n8n workflows
| Workflow | ID | Status |
|---|---|---|
| WF1 — disparo agendado 3x/dia | `3zMetjbtuIUt3JGX` | **DESATIVADO** (incidente Gospel) |
| WF2 — resposta WhatsApp SIM/NÃO | `ZDkd1oS1P8VdSh2l` | ATIVO |
| WF3 — lead novo imediato | `u7pCdMoHT5uqZKet` | **DESATIVADO** (incidente Gospel) |
| WF5 — broadcast manual (novo) | `9UD6uQGhOtLQjbAz` | ATIVO |

---

## 🔴 O que está QUEBRADO ou pendente

### Campanha Miriam Ferreira (`miriam-ferreira`) — ⏸️ FORA DO RADAR (decisão 2026-06-09)
- **Tudo relacionado à Miriam está PARADO.** Itens abaixo congelados; manter só como registro.
- ⚠️ **0 UserCampaigns** — ninguém pode logar (aguardando email do admin)
- ✓ `Campaign.domain = "miriam.ovile.com.br"` (setado em 2026-06-02 15h)
- ✓ `Campaign.candidateName = "Miriam Ferreira"`
- ⚠️ Schema desatualizado (banco Miriam não recebeu Broadcast/BroadcastDelivery do dia 02/06)
- Sem Z-API/Telegram/Metricool configurados
- Banco isolado: `ep-steep-poetry-acb6x32c.sa-east-1.aws.neon.tech`

### Incidente Gospel Class (2026-06-01 ~21h)
- 500 cadastros simultâneos via QR Code → travou Vercel (ExceedsBillingLimitError) → **500 pessoas perdidas** (Vercel rejeitou POSTs antes do INSERT)
- WhatsApp `+55 41 98704-0966` em soft-ban — descanso até ~21h de **2026-06-03**
- Próximo passo: warmup `50/dia → 100 → 200`

### Bugs conhecidos (não bloqueantes)
- TypeErrors no `/dashboard` e `/treinamento` (provavelmente switcher Miriam acessando schema diff) — pouco frequente
- ~~`/api/n8n/config?campaign_id=X` não valida X (fallback silencioso)~~ ✅ RESOLVIDO (valida via `validateCampaign`, retorna 404)
- 10 UserCampaigns duplicadas (ACCEPTED+PENDING) na campanha André

---

## ⚠️ Dependências de você (humano) — revisado 2026-06-09 (noite)

1. ~~Upgrade Vercel Pro~~ → **decisão: permanecer no free e elevar ao limite máximo do plano** (resiliência por software — ver próximos passos #2)
2. ~~Email admin Miriam~~ → **Miriam fora do radar** (tudo dela parado)
3. ✅ `METRICOOL_TOKEN` migrado pra UI (2026-06-09)
4. ✅ DNS `andre.ovile.com.br` adicionado no Vercel (2026-06-09)
5. ✅ Token Upstash rotacionado (2026-06-09)
6. **WhatsApp warmup** — ADIADO por decisão; WF1/WF3 seguem desativados
7. **OK pendente:** E2E `/cadastro` (instalar Playwright devDependency + tocar no `deploy-guardian.yml`)

### 🟢 Baixo (faço sozinho quando autorizar)
8. Limpar 10 UserCampaigns duplicadas do André
9. Remover `/api/n8n/seed-tenants` (era p/ provisionamento Miriam — sem uso agora)
10. Migrar n8n WF1 importação batch (`N8N_IMPORT_WEBHOOK_URL` ainda não setado)

---

## 📐 Arquitetura proposta (em implementação)

```
                       USUÁRIO
                          |
        +-----------------+-----------------+
        |                 |                 |
   andre.ovile        miriam.ovile     <novo>.ovile
   .com.br            .com.br          .com.br
        |                 |                 |
        v                 v                 v
   Tenant André      Tenant Miriam    Tenant Novo
   Banco Neon A      Banco Neon M     Banco Neon N
   
            Banco global (cross-tenant):
            User, UserCampaign, Campaign,
            Session, Notification, AuditLog
```

**Princípios:**
- Código = global (1 deploy)
- Dados = isolados por banco
- Branding = por tenant (`Campaign.candidateName/primaryColor/logoBase64`)
- Resolução de tenant = pelo HOST (não JWT mutation)
- SSO entre subdomínios via cookie `.ovile.com.br`

---

## 🎯 Próximas 3 ações recomendadas (revisado 2026-06-09 noite)

1. **E2E `/cadastro`** (Playwright no CI) — pendente OK do Edson
2. **Resiliência de pico dentro do plano free** — fila QStash + connection_limit + menos invocações por cadastro
3. **Limpeza:** UserCampaigns duplicadas · `N8N_IMPORT_WEBHOOK_URL` · remover seed-tenants

## 🔒 Anti-vazamento (NOVO 2026-06-03 madrugada)
- 7 endpoints `/api/n8n/*` validam Campaign existe → 404 se não existe (era HTTP 200 com dados do André antes)
- Cookie domain `.ovile.com.br` permite SSO entre subdomínios
- Hardcoded "André Santos" removido de `lib/email.ts`, `/api/n8n/config`, `/treinamento`
- `validateCampaign` helper com cache 60s evita query repetida

## 🟡 Hardcoded restante a refatorar (não bloqueante)
- `/(dashboard)/super-admin/page.tsx` — 4 mensagens convite (despriorizado — Miriam fora do radar; relevante só se entrar novo tenant)
- `/(dashboard)/colaboradores`, `minha-celula`, `onboarding` — strings UI/WhatsApp
- Placeholders de inputs e títulos internos (baixa prioridade)

Detalhe em `RELATORIO-MADRUGADA-2026-06-03.md`.
