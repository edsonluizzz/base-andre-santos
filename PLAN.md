# PLAN — WhatsApp pelo painel (continuação 2026-06-10)

> Retomada da sessão 2026-06-09. Fase 1 entregue, mas **envio de imagem e voz falha**
> em produção com `Vercel Blob: Failed to retrieve the client token`.
> Validação SEMPRE no Vercel — nunca rodar `npm run build` local (executa `prisma db push` contra prod).

## Diagnóstico (confirmado via runtime logs Vercel 2026-06-10)
- `POST /api/zapi/upload` → **400** com `BlobError` (classe `u [Error]` minificada do `@vercel/blob`).
- Imagem **e** voz falham idênticas → falha na **geração do client token** (antes de validar
  formato/tamanho). Sintoma clássico de `BLOB_READ_WRITE_TOKEN` ausente/inválido no runtime.
  O redeploy de 09/06 21:05 ("ativar BLOB_READ_WRITE_TOKEN") não resolveu — store `banco-wpp`
  provavelmente não ficou conectado ao projeto base-andre-santos.

## Step A — Fix do upload de mídia (imagem + voz) [CRÍTICO] ✅ (commit `ccbd3da`)
1. ✅ `upload/route.ts`: check explícito de `BLOB_READ_WRITE_TOKEN` → 503 com mensagem clara.
2. ✅ `allowedContentTypes` por wildcard — cobre `audio/webm;codecs=opus`.
3. ✅ Log do servidor legível.
4. ⚠️ **Edson (config Vercel) — PENDENTE:** garantir `BLOB_READ_WRITE_TOKEN` em Production.
   Painel Vercel → projeto base-andre-santos → Storage → conectar um Blob store ao projeto
   (injeta a env automaticamente) → Redeploy. Sem isso o upload responde 503 (mensagem clara).

## Step B — F2: Inbox com histórico ✅ (commits `e7d3d9f` → `0216afc`, READY)
1. ✅ `lib/zapi.ts`: `zapiChatMessages(cid, phone)` (Z-API `/chat-messages/{phone}`).
2. ✅ `GET /api/zapi/messages?to=` (ADMIN).
3. ✅ UI no perfil do lead; polling 15s só com aba visível; recarrega ao enviar.
4. ⚠️ `e7d3d9f` quebrou o build: `@typescript-eslint/no-explicit-any` é ERROR no `next build`.
   Corrigido em `0216afc` (tipo `RawZapiMessage`). Lint validado no clone `ovile-ci` antes do push.

## Step C — F3: Relay do webhook (tempo real) — ⏸️ AGUARDA OK DO EDSON
**Risco que exige decisão antes de implementar/deploy:**
- Reconfigurar o webhook RECEBIDO da Z-API (`PUT /update-webhook-received`) é outward-facing:
  hoje ele alimenta o **WF2 (SIM/NÃO de presença, ATIVO)** direto. Se apontar para a nossa API,
  o relay vira ponto único de falha do WF2 — se cair, quebra a confirmação de presença.
- "Não-lidas" + histórico persistido exigem **schema novo** (modelo de mensagem) e o build roda
  `prisma db push` contra produção.

**Proposta (a validar):** webhook na nossa API com try/catch que SEMPRE repassa ao WF2 (fail-safe),
+ tabela `WhatsappMessage` (campaignId, phone, fromMe, kind, text, mediaUrl, momment, read) para
não-lidas e tempo real sem polling. Decidir: (a) seguir assim, (b) só persistir sem mexer no
webhook do WF2, ou (c) adiar F3.

---
**Retomar:** colar `Continue o PLAN.md do BASE ANDRE SANTOS — step em andamento`.
