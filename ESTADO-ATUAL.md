# Estado Atual da Produção — 2026-06-10

**Última atualização:** 2026-06-10 BRT

---

## 📌 Sessão 2026-06-10 (WhatsApp: bug de mídia + F2 inbox) — RETOMAR AQUI

**Bug reportado pelo Edson:** envio de **imagem e voz** falhava com
`Vercel Blob: Failed to retrieve the client token`.

**Diagnóstico (via runtime logs Vercel):** `POST /api/zapi/upload` → **400** com `BlobError`.
Imagem e voz falham idênticas → falha na **geração do client token**, antes de validar
formato. Causa: `BLOB_READ_WRITE_TOKEN` ausente/inválido no runtime de produção (o redeploy
de 09/06 21:05 "ativar BLOB_READ_WRITE_TOKEN" não resolveu — store provavelmente não ficou
conectado ao projeto). Em prod as env vars vêm do painel Vercel, não do `.env` (build mostra
`injecting env (0)`).

**Feito nesta sessão:**
- ✅ **Step A — fix upload** (commit `ccbd3da`, READY): check explícito de
  `BLOB_READ_WRITE_TOKEN` → 503 com mensagem acionável (em vez de BlobError opaco);
  `allowedContentTypes` por wildcard (`image/*`,`video/*`,`audio/*`) — cobre o
  `audio/webm;codecs=opus` do áudio gravado no navegador; log do servidor legível.
- ✅ **Step B — F2 inbox** (commits `e7d3d9f`→`0216afc`, READY): histórico real da conversa
  (Z-API `/chat-messages`) acima do composer no perfil do lead; polling 15s só com aba visível;
  recarrega ao enviar. `zapiChatMessages()` + `GET /api/zapi/messages` + `whatsapp-history.tsx`.
  ⚠️ `e7d3d9f` quebrou o build (`no-explicit-any` é ERROR no `next build`); corrigido em
  `0216afc` (tipo `RawZapiMessage`). **Lição:** validar lint no clone `ovile-ci` antes do push.

**⚠️ AÇÃO PENDENTE DO EDSON (destrava imagem+voz):** configurar `BLOB_READ_WRITE_TOKEN` em
Production no Vercel → painel → projeto base-andre-santos → **Storage → conectar um Blob store
ao projeto** (injeta a env automaticamente) → Redeploy. Sem isso o upload responde 503 com a
mensagem clara. Depois testar imagem e voz no painel.

**Próximo (Step C / F3 — AGUARDA OK):** relay do webhook p/ tempo real + não-lidas. Risco:
reconfigurar o webhook RECEBIDO da Z-API é outward-facing e hoje alimenta o **WF2 (SIM/NÃO de
presença, ATIVO)** — relay vira ponto único de falha; e exige schema novo (`prisma db push` em
prod). Decidir: (a) webhook fail-safe que sempre repassa ao WF2 + tabela `WhatsappMessage`,
(b) só persistir sem tocar o webhook do WF2, ou (c) adiar. Detalhe no `PLAN.md`.

**Sobre a voz (quando o token for resolvido):** o áudio sobe como `audio/webm;codecs=opus`.
Se a Z-API rejeitar/descartar o WebM (WhatsApp PTT espera ogg/opus), será preciso converter
antes de enviar (sprint próprio — serverless sem ffmpeg exige solução à parte).

---

## 📌 Sessão 2026-06-09 (auditoria com skills ECC)

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

✅ **RESOLVIDO 2026-06-09 (commits `7ceb0c8` + `550cc5b`)** — guardian VERDE pela
primeira vez. 3 causas raiz: (1) `set -e` matava o step de captura; (2) Prisma 7 lança
erro em `new PrismaClient()` sem options → build sem DATABASE_URL morria (fix: adapter
pg com URL placeholder em db.ts); (3) `google-calendar/callback` sem force-dynamic —
try/catch engolia DYNAMIC_SERVER_USAGE (rota podia virar estática = callback OAuth
cacheado). tsc agora é informativo (::warning::); auto-heal é best-effort (skip sem
ANTHROPIC_API_KEY). **Validação local possível:** clone em `C:\Users\usuario\ovile-ci`
(sem .env — db push cai no skip offline; lint/build rodam sem tocar prod).

## 📱 Módulo Grupos — reescrito 100% AO VIVO (2026-06-09, commits `61b3382`→`39e89c2`)

Decisão do Edson: "manter só o ao vivo e excluir os outros, pegar os links reais".
- `/grupos` lista APENAS os grupos reais do número da campanha (Z-API, `lib/zapi.ts`)
- Região do roteamento (WF2) definida no grupo real via select → `route-config` faz
  upsert do registro espelhado (WhatsAppGroup.zapiGroupId) com nome + invite link REAIS;
  garante 1 grupo/região e 1 fallback (estrela)
- Participantes reais: ver/adicionar/remover pelo painel (ADMIN-only no backend)
- Cadastros manuais antigos = seção "órfãos" com excluir (⚠️ Edson: definir regiões nos
  grupos reais ANTES de excluir os 4 antigos OESTE/LITORAL/SUDOESTE/GERAL)
- Removidos: criação manual, gestão de membros anotada, vínculo zonas, rota /import

**Próximo (proposta aguardando OK):** "WhatsApp Web" no painel em 3 fases —
F1 enviar texto/áudio/foto/vídeo p/ grupos e leads (Blob + Z-API send-*);
F2 inbox com histórico (Z-API /chat-messages, polling só com aba aberta);
F3 tempo real via relay do webhook (Z-API → nossa API → grava → repassa n8n WF2).

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
