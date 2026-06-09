# Estado Atual da Produção — 2026-06-09

**Última atualização:** 2026-06-09 BRT

---

## 📌 Sessão 2026-06-09 (auditoria com skills ECC) — RETOMAR AQUI

Auditoria do código (em sync com git `edsonluizzz/base-andre-santos`) via skills novas (silent-failure-hunter / postgres-patterns / e2e-testing).

**Feito nesta sessão:**
- ✅ **Falhas silenciosas corrigidas** (commit `c9b79cf`): 6 telas do dashboard (configuracoes, colaboradores, mapa, agenda, completar-perfil, disparar) tinham `.catch(() => {})` vazios que deixavam a tela vazia sem avisar o usuário. Agora usam `toast.error` (loads críticos) ou `console.error` (loads de fundo). **Conferir se buildou OK no Vercel.**
- ✅ Confirmado que o bug do `/api/n8n/config` já estava resolvido (validateCampaign).

**Próximos passos (ordem):**
1. **#1 Testes E2E do `/cadastro`** (maior valor, seguro). Pendente OK do Edson para: instalar Playwright como devDependency + tocar em `.github/workflows/deploy-guardian.yml` (rodar no CI, já que node_modules local está incompleto).
2. **#3 Resiliência de pico** (fila Upstash/QStash no cadastro + connection_limit Prisma). Fazer **depois do upgrade Vercel Pro** (sem ele, o teto de billing ainda derruba em evento grande).

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

### Campanha Miriam Ferreira (`miriam-ferreira`)
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

## ⚠️ Dependências de você (humano)

### 🔴 Crítico
1. **Upgrade Vercel Pro** ($20/mês) — sem isso, próximo evento de 300+ pessoas trava de novo
2. **Email do admin da Miriam** — pra eu criar UserCampaign e ela conseguir logar
3. **Migrar `METRICOOL_TOKEN` pra `Campaign(andre).metricoolToken`** via UI em https://ovile.com.br/configuracoes (Integrações) — caso contrário, Instagram do André fica 503

### 🟡 Médio
4. **DNS no Vercel:** adicionar `miriam.ovile.com.br` e `andre.ovile.com.br` no projeto base-andre-santos
5. **Vercel Pro Spend Management** — define limite máximo após upgrade
6. **Rotacionar token Upstash** — colado no chat antes (já está nos arquivos)
7. **WhatsApp warmup** — depois de 48h, plano em `docs/WHATSAPP-WARMUP.md`

### 🟢 Baixo (faço sozinho quando autorizar)
8. Limpar UserCampaigns duplicadas do André
9. Remover endpoints debug temporários (`/api/n8n/debug-tenants`, `/api/n8n/normalize-phones`)
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

## 🎯 Próximas 3 ações recomendadas

1. **Você me passa email admin Miriam** → eu crio UserCampaign + popula `Campaign.domain`
2. **Você adiciona `miriam.ovile.com.br` no Vercel** ✅ FEITO 2026-06-02
3. **Eu rodo migration multi-tenant** → schema Miriam atualizado, ela pode usar todas as features

## 🔒 Anti-vazamento (NOVO 2026-06-03 madrugada)
- 7 endpoints `/api/n8n/*` validam Campaign existe → 404 se não existe (era HTTP 200 com dados do André antes)
- Cookie domain `.ovile.com.br` permite SSO entre subdomínios
- Hardcoded "André Santos" removido de `lib/email.ts`, `/api/n8n/config`, `/treinamento`
- `validateCampaign` helper com cache 60s evita query repetida

## 🟡 Hardcoded restante a refatorar (não bloqueante)
- `/(dashboard)/super-admin/page.tsx` — 4 mensagens convite (CRÍTICO antes da Miriam ter admin)
- `/(dashboard)/colaboradores`, `minha-celula`, `onboarding` — strings UI/WhatsApp
- Placeholders de inputs e títulos internos (baixa prioridade)

Detalhe em `RELATORIO-MADRUGADA-2026-06-03.md`.
