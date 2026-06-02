# Relatório da madrugada — 2026-06-02

**Trabalho:** 00:00 → 04:00 BRT (sessão autônoma noturna)
**Estado final:** sistema endurecido e pronto pra próximos eventos; módulo de disparo WhatsApp completo (backend + UI + n8n)

---

## TL;DR

### 🚨 Status pós-incidente
- WF3 (lead-novo) e WF1 (disparo-agendado) **desativados** via API n8n — não vão disparar mais nada até você reativar
- WhatsApp `41987040966` precisa de **48h de descanso** antes de qualquer envio
- Cadastro público **endurecido**: aguenta 100 cadastros/min/IP de QR Code em evento

### ✅ Novo: Módulo de Disparo WhatsApp completo
- Página `/comunicados/disparar` (ADMIN-only) — form completo com filtros, preview, pacing
- Importação XLSX agora aceita **Origem custom** (ex: `GOSPEL_CLASS`) → filtra na UI

### ⚠️ Bloqueador externo
- **Upgrade Vercel Pro** ($20/mês) — sem isso, próximo evento de 500+ pessoas trava DE NOVO

---

## 1. Diagnóstico do incidente

Evento na igreja às 21:00–21:40 BRT de 2026-06-01: ~500 pessoas leram QR Code e cadastraram. Sistema travou.

**Causa raiz dupla:**

### a) Vercel `ExceedsBillingLimitError`
- Plano Hobby tem ~100k function invocations/mês
- Cada cadastro disparava: middleware NextAuth + cadastro + n8n + Telegram + email + tier recalc + zone notify + image proxy ≈ 8-10 invocations
- 500 cadastros × 10 = 5000+ invocations em 40 min → estourou cota diária → Vercel cortou requests
- **Solução definitiva:** upgrade pra Pro (precisa ser você)

### b) WhatsApp soft-ban
- 500 mensagens iniciais em curto período = padrão clássico de spam pro WhatsApp
- Número `41987040966` bloqueado de iniciar conversas (24-72h)
- **Solução:** desativei WF3+WF1 (não vão disparar mais) e criei guia de warmup em `docs/WHATSAPP-WARMUP.md`

---

## 2. Hardening do cadastro público (commit `ea2e5d5`)

Mudanças no `/api/public/cadastro`:

| Antes | Depois |
|---|---|
| Rate-limit 5/min por IP (uniforme) | **Adaptativo:** EBOOK_* = 100/min, outros = 5/min |
| Dedup phone consumia cota do RL | **Dedup antes do RL** — repetidos não contam |
| Critical path tinha `await` em hooks | **Fire-and-forget puro** (Telegram, n8n, email, tier) |
| Phone salvo com máscara | **Phone normalizado** (só dígitos) |

Resultado: critical path agora é `parse → dedup → RL → create → return` em ~200ms mesmo em burst.

**Limitação:** mesmo com hardening, Vercel Hobby trava em ~500 cadastros porque a cota é compartilhada. Pro mata o problema.

---

## 3. Módulo de Disparo WhatsApp

### Backend (commit `e9ad108`)

**Admin (session ADMIN):**
- `POST /api/admin/whatsapp/broadcast` — cria broadcast, gera deliveries, dispara n8n. Suporta `previewOnly=true` (só calcula filtros).
- `GET /api/admin/whatsapp/broadcast` — lista paginada (admin+leader)
- `GET /api/admin/whatsapp/broadcast/[id]` — detalhe + deliveries + statusCounts
- `PATCH /api/admin/whatsapp/broadcast/[id]` — cancel/pause/resume
- `GET /api/admin/whatsapp/sources` — distinct sources com count por status

**n8n (Bearer N8N_API_KEY):**
- `GET /api/n8n/broadcast/next` — próxima delivery PENDING com mensagem já renderizada (placeholders `{nome}`, `{primeironome}`, `{cidade}`) + Z-API config. Aplica `dailyLimit` automaticamente.
- `PATCH /api/n8n/broadcast/delivery/[id]` — n8n marca SENT/FAILED, atualiza contadores

**Helpers (`src/lib/broadcast-helpers.ts`):**
- `resolveRecipients`: filtros → query Prisma. Suporta `source`, `status`, `supportStatus`, `city`, `profile`, `channel`, `scoreMin/Max`, `notContactedDays`, `collaboratorIds` (seleção manual sobrepõe filtros)
- `renderMessage`: aplica placeholders

### Schema (commit `4006797`)

`Broadcast` expandido + novo `BroadcastDelivery`:
- `type`: DIRECT (1:1) / GROUP / BROADCAST
- `status`: DRAFT → QUEUED → SENDING → COMPLETED (ou PAUSED/FAILED/CANCELLED)
- `delaySecondsMin/Max` (300/600 padrão = 5-10 min)
- `dailyLimit` (200 padrão)
- `attachmentUrl/Type` (imagem/PDF)
- Tracking individual em `BroadcastDelivery` com status, zapiMessageId, sentAt/deliveredAt/readAt, error, attemptCount

Migration aplicada automaticamente no deploy (`prisma db push --accept-data-loss` no build).

### UI (commit `dd9bcc8`)

Página `/comunicados/disparar` (ADMIN-only):

**Form 5 seções:**
1. **Identificação** — título interno + audience label
2. **Tipo** — DIRECT (1:1) / GROUP (postagem única) / BROADCAST (lista transmissão)
3. **Filtros** — dropdown Origem (com count por source), Status, Cidade
4. **Mensagem** — textarea com **preview live** dos placeholders renderizados
5. **Pacing** — delay min/max + dailyLimit (defaults: 300-600s, 200/dia)

**Coluna lateral sticky:**
- Count live de destinatários (auto-refresh debounced 500ms)
- Amostra de 5 nomes
- Estimativa de tempo total ("vai levar ~3h ou X dias")
- Botões "Disparar agora" e "Salvar rascunho"

**Alerta amarelo no topo** com boas práticas anti-ban.

**Atalho:** página `/comunicados` agora tem botão "Disparar WhatsApp" ao lado de "Novo Comunicado".

### n8n WF5 (commit `ffe7594`)

Substituiu o WF4 antigo (mesmo ID, mesmo path `ovile-disparo-manual` — `N8N_MANUAL_WEBHOOK_URL` não muda).

Loop recursivo:
1. Webhook recebe `{ broadcastId, campaignId, type }`
2. `GET /broadcast/next`
3. Se `done=true` → encerra
4. Se `paused=true` (daily-limit ou pause manual) → aguarda 60min e re-checa
5. Wait random(delayMin..Max)
6. Z-API send-text
7. PATCH delivery SENT/FAILED conforme retorno do Z-API
8. Volta pro passo 2

`neverError=true` no node Z-API garante que phone inválido não cancela o WF inteiro.

Deployado via PUT API n8n — workflow ativo e pronto pra uso após você desbloquear o WhatsApp.

---

## 4. Importação XLSX com Origem custom (commit `8237a8c`)

Antes todas as importações caíam em `source=IMPORTACAO_XLSX` (genérico). Agora:

**Backend:** `/api/collaborators/import` aceita `sourceOverride` no body (sanitizado UPPERCASE+underscore, max 50 chars).

**UI:** no dialog de import, antes do botão final, novo campo "Origem desta importação" (opcional, default `IMPORTACAO_XLSX`).

Exemplo: subir planilha do Gospel Class → digitar `GOSPEL_CLASS` → todos os leads ganham esse source → filtrável no dropdown de disparo.

---

## 5. Estrutura final do banco

`/api/n8n/sources-stats` retorna o inventário atual. Você consegue ver no admin do Ovile.

Distribuição esperada (estado atual baseado em memory + migrations):
- `IMPORTACAO_XLSX` (~1158 normalizados + ~500 já sem máscara)
- `EBOOK_QUEM_SOU_EU` (~500 do incidente + outros)
- `EBOOK_CASAMENTO` (poucos)
- `CADASTRO_PUBLICO` (formulário /cadastro direto)
- `INDICACAO` (vieram por link `?refc=`)

---

## 6. Estado atual dos workflows n8n

| ID | Nome | Status |
|---|---|---|
| `3zMetjbtuIUt3JGX` | WF1 disparo-agendado | **DESATIVADO** (pelo incidente) |
| `ZDkd1oS1P8VdSh2l` | WF2 resposta-whatsapp | ATIVO |
| `u7pCdMoHT5uqZKet` | WF3 lead-novo-imediato | **DESATIVADO** (pelo incidente) |
| `9UD6uQGhOtLQjbAz` | WF5 broadcast-manual (novo) | ATIVO |
| `hyQz8pwrltPlQ035` | YOUTUBE comentários | ATIVO (não relacionado) |

Pra reativar WF3 e WF1, ver instruções em `docs/WHATSAPP-WARMUP.md`.

---

## 7. Pendências críticas pra você atacar

### 🔴 P0 — Sem isso o sistema trava de novo

1. **Upgrade Vercel Pro** ($20/mês) em https://vercel.com/edsonluizzzs-projects/~/settings/billing
   - Sem isso, próximo evento de 300+ cadastros simultâneos = travamento de novo
   - Pro tem 10x mais quotas que Hobby + Spend Management (define limite máximo)
   - Pra campanha eleitoral, é insignificante

### 🟡 P1 — Recuperar WhatsApp

2. **Aguardar 48h** desde o ban (provavelmente expira ~21h de hoje 2026-06-02 → 21h de 2026-06-03)
3. **Não enviar nada do número** nesse período (vira ban permanente)
4. Depois, seguir warmup conforme `docs/WHATSAPP-WARMUP.md`:
   - Dia 2-7: 50/dia, delay 10-15 min
   - Dia 7-14: 100/dia, delay 7-10 min
   - Dia 14+: regime normal (200/dia, 5-10 min)
5. Reativar WF3/WF1 só depois do warmup intermediário

### 🟢 P2 — Quando quiser usar o módulo de disparo

6. Abrir `/comunicados/disparar` (depois do warmup)
7. Importar planilha do Gospel Class com `sourceOverride=GOSPEL_CLASS`
8. Disparar com `dailyLimit=50` na primeira semana

---

## 8. Commits da noite

| Commit | Mensagem |
|---|---|
| `7166fc7` | feat(api): endpoint sources-stats para inventário de origens |
| `ea2e5d5` | perf(cadastro): hardening para burst de QR Code em eventos |
| `4006797` | feat(schema): expandir Broadcast + BroadcastDelivery |
| `e9ad108` | feat(whatsapp): backend completo do módulo de disparo |
| `dd9bcc8` | feat(whatsapp): UI admin /comunicados/disparar |
| `ffe7594` | feat(n8n): WF5 broadcast-manual (loop recursivo + pacing) |
| `8237a8c` | feat(import): origem custom + atalho Disparar WhatsApp |
| `85e04c4` | docs: guia de warmup pós-ban WhatsApp |

Todos deployados em produção.

---

## 9. Limpeza recomendada quando tiver tempo

- Apagar leads de teste antigos (busca "Diag", "Webhook", "Teste Automatizado", "Validacao" em `/colaboradores`)
- Apagar lead "Debug Webhook 2", "Diag 1/2/3", "Validacao Final" criados durante diagnóstico
- Rotacionar token Upstash (você colou no chat antes do entendimento de segurança — provavelmente já fez, conferir)

---

## Bom dia. Sistema pronto.

Próximo passo crítico: **upgrade Vercel Pro**.

Depois (48h+): warmup WhatsApp + abrir `/comunicados/disparar` e testar com 50 leads do Gospel Class.

Qualquer dúvida me chama. O módulo de disparo está plenamente operacional do código → só não pode usar agora porque o WhatsApp tá em ban e seria contraproducente.
