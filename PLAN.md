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

## Step A — Fix do upload de mídia (imagem + voz) [CRÍTICO] — EM EXECUÇÃO
1. `upload/route.ts`: check explícito de `BLOB_READ_WRITE_TOKEN` → 503 com mensagem clara
   quando ausente (em vez de `BlobError` opaco que o client mascara).
2. `allowedContentTypes` por wildcard (`image/*`, `video/*`, `audio/*`) — cobre o
   `audio/webm;codecs=opus` que o match exato `audio/webm` rejeitava.
3. Log do servidor legível (`err.message`, não o objeto minificado).
4. **Edson (config Vercel):** garantir `BLOB_READ_WRITE_TOKEN` em Production
   (conectar o store ao projeto → redeploy).
5. Commit + push.

## Step B — F2: Inbox com histórico
1. `lib/zapi.ts`: `zapiChatMessages(cid, phone)` (Z-API `/chat-messages/{phone}`).
2. `GET /api/zapi/messages?to=` (ADMIN) — histórico de uma conversa.
3. UI: histórico no perfil do lead; polling só com aba aberta.
4. Commit + push.

## Step C — F3: Relay do webhook (tempo real)
1. `POST /api/zapi/webhook` recebe da Z-API → grava → repassa n8n WF2.
2. Marca não-lidas; integra com a inbox da F2.
3. `PUT /update-webhook-received` na Z-API.
4. Commit + push.

---
**Retomar:** colar `Continue o PLAN.md do BASE ANDRE SANTOS — step em andamento`.
