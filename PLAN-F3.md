# PLAN — F3: Inbox de WhatsApp (receber mensagens via webhook)

Objetivo: receber e exibir as mensagens recebidas no WhatsApp (inbox, conversas,
não-lidas) no painel `/whatsapp`. Como a Z-API multi-device NÃO fornece histórico
(`chat-messages` retorna 400), construímos o inbox do **"agora pra frente"** via
**webhook**: cada mensagem que chega é gravada no banco.

Decisões fechadas:
- Arquitetura: **Z-API on-message-received → nosso endpoint `/api/zapi/webhook?cid=...`**
  que (1) **salva** `WhatsappMessage` e (2) **repassa ao WF2** (n8n SIM/NÃO) para não
  quebrar a automação existente — "webhook fail-safe".
- Peso no banco é OK: texto é barato; mídia fica como URL (Blob/Z-API), não entra no banco.
- Duplicados já limpos (2026-06-12). Redesign concluído.

> Build/lint: lintar no clone `C:\Users\usuario\ovile-ci` antes de cada push (next do Drive
> é quebrado de propósito; build local roda `prisma db push`). Validar no Vercel.

---

## Passo 1 — Schema + endpoint receptor do webhook
- `model WhatsappMessage` (phone, phoneNormalized, fromMe, senderName, type, body, mediaUrl,
  zapiMessageId @unique p/ dedup, isGroup, read, timestamp). Índices p/ conversa e não-lidas.
- `POST /api/zapi/webhook` (público, em `isPublic`): parseia o payload Z-API (defensivo,
  espelha `RawZapiMessage`), deduplica por `zapiMessageId`, grava na campanha (`?cid=`,
  default `andre-santos-2026`); repassa o corpo ao WF2 se `N8N_RESPOSTA_WEBHOOK_URL` setado
  (best-effort, fire-and-forget). Ignora mensagens de grupo por enquanto (só 1:1).

## Passo 2 — Apontar o webhook da Z-API (sem quebrar o WF2)
- ANTES: setar `N8N_RESPOSTA_WEBHOOK_URL` no Vercel (URL do WF2 `ovile-resposta-wa`).
- Configurar o `update-webhook-received` da Z-API para `/api/zapi/webhook?cid=andre-santos-2026`
  (helper admin ou Edson no painel Z-API).
- Verificar: SIM/NÃO continua funcionando (relay) + mensagens aparecendo no banco.

## Passo 3 — Inbox na UI (/whatsapp → aba "Conversas")
- Lista de conversas (agrupadas por telefone: última mensagem, horário, nome do contato/
  colaborador, badge de não-lidas). Abrir conversa → mensagens (recebidas + enviadas)
  em ordem cronológica; responder reusa `POST /api/zapi/send`. Marca como lida ao abrir.

## Passo 4 — Não-lidas + tempo real (polling)
- Contador de não-lidas (badge no menu/aba); polling ~15s só com aba visível; mark-as-read.

## Passo 5 — Vincular ao colaborador
- Casar `phone` com `Collaborator` (telefone) → mostra nome/contexto; integra com o
  histórico do perfil do lead.

---

### Retomar no Passo 2
> Continue o PLAN-F3.md a partir do Passo 2: configurar o webhook recebido da Z-API para
> apontar ao `/api/zapi/webhook`, garantindo o relay ao WF2 (env N8N_RESPOSTA_WEBHOOK_URL).
