# Auditoria Completa — Ovile Eleitoral / Base André Santos

**Data:** 2026-07-30
**Escopo:** código-fonte completo (main, working tree limpo), segurança + dívida técnica + verificação de achados de auditorias anteriores (Sprint 24 / 2026-06-06 e 2026-05-27).
**Método:** 4 auditorias paralelas (auth/tenant isolation, crypto/secrets/injeção/headers, verificação de achados antigos + dívida técnica, feature de recibos de pagamento). Todos os achados abaixo foram lidos diretamente no código, com arquivo:linha.

## Status das correções (aplicadas na mesma sessão, ainda não commitadas)

| # | Achado | Status |
|---|--------|--------|
| 1 | Cron fail-open (`gcal-sync`, `agenda-telegram`, e `tse-sync` por consistência) | ✅ Corrigido |
| 2 | Webhook Z-API fail-open + `cid` não validado | ✅ Corrigido (segredo agora obrigatório — ver "Pendências de deploy" abaixo) |
| 3 | `AuditLog` sem `campaignId` (vazamento cross-tenant) | ✅ Corrigido (migration aditiva + 6 arquivos de escrita + filtro na leitura) |
| 4 | Blob público dos recibos sem expiração | ⚠️ Mitigado (cron de retenção/purge — ver nota de arquitetura abaixo; não elimina 100%) |
| 5 | Upload sem magic bytes (`zapi/upload`, `churches/upload-photo`) | ✅ Corrigido |
| 6 | `decrypt()` com fallback silencioso em `crypto.ts` | ❌ Não alterado nesta sessão (requer plano de migração dos segredos já gravados — ver nota abaixo) |
| 7 | `PATCH /api/admin/users/[id]` sem `campaignId` (IDOR) | ✅ Corrigido |
| 8 | CSP com `unsafe-inline`/`unsafe-eval` | ❌ Não alterado nesta sessão (requer nonce-based CSP + testes de regressão visual) |
| 9 | Telegram webhook sem `secret_token` | ✅ Corrigido (rota legada + rota `[botToken]`) |
| 10 | Comparação de Bearer não timing-safe | ✅ Corrigido (helper `src/lib/api-auth.ts`, reaproveitado em 12 rotas n8n + 3 crons + telegram) |
| 11 | Resend de recibo sem cooldown | ❌ Não alterado (baixa prioridade, ADMIN-only) |
| — | Bug de login de convidados (queries seriais no callback `jwt`) | ❌ Não alterado nesta sessão (toque em `auth.ts` é alto risco sem ambiente de teste — ver nota abaixo) |

**Notas de arquitetura importantes:**
- **Item 4 (Blob de recibos):** não dá pra tornar o Blob totalmente privado sem quebrar o envio por WhatsApp — a Z-API (serviço terceiro) precisa buscar a URL do PDF diretamente pela internet pra enviar como documento, e não há como autenticar essa requisição de fora. A mitigação aplicada foi um cron diário (`/api/cron/purge-old-receipts`) que apaga o PDF do Blob após `RECEIPT_RETENTION_DAYS` (padrão 180 dias) e zera o `pdfUrl` no banco. Isso limita a janela de exposição, mas não elimina o "público durante N dias". Fechar de vez exigiria repensar o fluxo de envio (ex: Z-API mandar o arquivo por outro meio que não uma URL pública).
- **Item 6 (`decrypt()`):** endurecer o fallback (falhar em vez de tratar como "legado plain") é a correção certa a médio prazo, mas os valores hoje gravados no banco (Z-API tokens, `googleRefreshToken`, `telegramBotToken`) foram criptografados com o comportamento atual — mudar sem migrar/validar cada um antes tem risco real de derrubar integrações que hoje funcionam, sem ambiente de teste pra validar contra o banco de produção. Fica registrado como próximo passo, não faça esse fix "no escuro".
- **Item 8 (CSP):** trocar pra nonce-based exige varrer o app inteiro por `<script>`/handler inline que dependam de `unsafe-inline`/`unsafe-eval` (ex: Next.js hydration scripts, libs de terceiro) — risco de quebrar renderização silenciosamente sem poder testar no navegador nesta sessão. Registrado como próximo passo.
- **Bug de login de convidados:** a hipótese foi confirmada como plausível (queries seriais sem `Promise.all` no caminho de convite pendente do callback `jwt`), mas `auth.ts` é o arquivo de maior blast radius do sistema — uma refatoração errada quebra login pra todo mundo, não só pra convidados. Não mexi sem poder testar o fluxo de login de verdade.

**Pendências de deploy — ação manual necessária antes/depois do push:**
- `ZAPI_WEBHOOK_SECRET` agora é **obrigatória** pro webhook de mensagens recebidas do WhatsApp funcionar — confirme que está setada no Vercel e que a URL configurada na Z-API (`on-message-received`) inclui `&key=<o mesmo valor>`. Sem isso, o recebimento de mensagens do WhatsApp para dentro do CRM para de funcionar após o deploy.
- `TELEGRAM_WEBHOOK_SECRET` precisa ser setada e o webhook **re-registrado** chamando `GET /api/telegram/register-webhook` depois do deploy (a rota agora recusa registrar sem essa env var, e o Telegram só vai autenticar updates que carreguem esse secret).
- `CRON_SECRET` precisa estar setada — os 3 crons existentes (e o novo `purge-old-receipts`) agora recusam qualquer chamada sem ela (antes, sem ela configurada, os crons ficavam abertos).
- Opcional: `RECEIPT_RETENTION_DAYS` (padrão 180) controla quantos dias o PDF do recibo fica acessível antes de ser apagado do Blob.

---

## Resumo executivo

Achados **novos** desde a última auditoria (2026-06-06), por ordem de risco:

| # | Achado | Severidade | Esforço do fix |
|---|--------|-----------|-----------------|
| 1 | Crons `gcal-sync` e `agenda-telegram` ficam **abertos** (sem auth) se `CRON_SECRET` não estiver setada | Alto | Trivial (1 linha cada) |
| 2 | Webhook Z-API (`/api/zapi/webhook`) aceita `cid` da query string sem validar origem — injeção cross-tenant se `ZAPI_WEBHOOK_SECRET` não estiver setada | Alto | Pequeno |
| 3 | `AuditLog` não tem `campaignId` — qualquer ADMIN de qualquer campanha vê o log de auditoria de **todas** as campanhas | Alto | Médio (migration) |
| 4 | PDFs de recibo (CPF + valor pago + dados eleitorais) sobem pro Vercel Blob com `access: "public"`, sem expiração nem assinatura | Alto (LGPD) | Médio |
| 5 | 2 rotas de upload (`zapi/upload`, `churches/upload-photo`) validam só o MIME declarado pelo cliente, não magic bytes — abre SVG stored-XSS | Alto | Pequeno (reusar `detectMime()` já existente) |
| 6 | `decrypt()` em `crypto.ts` faz fallback silencioso: sem prefixo `v1:` retorna o valor cru; chave com tamanho errado é "consertada" via SHA-256; sem `APP_ENCRYPTION_KEY` retorna texto puro sem avisar | Alto | Médio (requer plano de migração dos valores já gravados) |
| 7 | `PATCH /api/admin/users/[id]` deleta `UserCampaign` sem checar `campaignId` (IDOR entre tenants, exige adivinhar cuid) | Médio-Alto | Trivial |
| 8 | CSP existe (contradiz achado antigo "sem CSP") mas usa `unsafe-inline`+`unsafe-eval` — XSS não é mitigado | Médio | Médio (nonce-based CSP) |
| 9 | Telegram webhook sem `secret_token` oficial; rota legada sem token na URL nenhuma | Médio | Pequeno |
| 10 | Comparação de Bearer (`N8N_API_KEY`, `CRON_SECRET`) não é timing-safe | Baixo | Trivial |
| 11 | `resend` de recibo sem cooldown entre tentativas `FAILED` (spam/custo, mas ADMIN-only) | Baixo | Trivial |

**Confirmado:** a hipótese do bug "Erro do servidor" no login de colaboradores convidados é plausível — o callback `jwt` faz várias queries seriais (não paralelizadas) só no caminho de convite pendente, candidato real a estourar timeout serverless em cold start.

**Refutado / corrigido desde a última auditoria:**
- `googleRefreshToken` já está criptografado (era achado de 2026-05-27, hoje falso).
- `joinCode` hardcoded `"andre2026"` não existe mais — hoje é `process.env.CAMPAIGN_JOIN_CODE ?? "ovile2026"`, e nem sequer é validado em nenhum fluxo (campo órfão).
- Token de impersonation tem TTL de 2h implementado corretamente; sem uso no client hoje.
- `as never` em bulk updates é dívida de tipagem, não vulnerabilidade (Prisma valida em runtime).
- Não há `$queryRaw`/`$executeRaw` no código atual — não há risco de SQL injection.
- Nenhum segredo hardcoded no código-fonte.
- Os 5 endpoints de debug (`debug-env`, `debug-tenants`, `debug-city`, `backfill-toledo`, `normalize-phones`) seguem removidos; nenhum novo endpoint de debug esquecido foi encontrado.
- Rate limit migrado para Upstash Redis (`@upstash/ratelimit`) — mas cai silenciosamente em fallback in-memory (ineficaz) se as env vars `UPSTASH_REDIS_REST_URL/TOKEN` não estiverem setadas em produção. **Precisa confirmar se estão configuradas** (mesma classe de risco do `RESEND_API_KEY`/`APP_ENCRYPTION_KEY` — ver seção de pendências operacionais).

---

## Achados de segurança — detalhados

### 1. Cron jobs abrem sem `CRON_SECRET` (falha aberta)

**Severidade: Alto** · `src/app/api/cron/gcal-sync/route.ts:12` e `src/app/api/cron/agenda-telegram/route.ts:24`

```ts
if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) { ... 401 }
```

Se `CRON_SECRET` não estiver setada, `process.env.CRON_SECRET` é `undefined` (falsy) → o `&&` curto-circuita → a checagem inteira é pulada → a rota aceita qualquer request. `CRON_SECRET` **não está** na lista de env vars obrigatórias do `CLAUDE.md` do projeto, o que é sinal de que pode estar faltando em produção.

Compare com `src/app/api/cron/tse-sync/route.ts:10`, que faz certo: `if (secret !== process.env.CRON_SECRET) return 401` — nesse caso, `null !== undefined` é `true`, então rejeita mesmo sem a env var (fail-closed).

**Exploração:** `curl https://.../api/cron/agenda-telegram` sem header nenhum dispara envio de mensagens Telegram/WhatsApp pra todas as campanhas ativas. `curl https://.../api/cron/gcal-sync` dispara sync do Google Calendar de qualquer campanha.

**Fix:** trocar as duas rotas para o padrão de `tse-sync` (comparação sem short-circuit).

---

### 2. Webhook Z-API aceita `cid` da query string sem validar origem

**Severidade: Alto** · `src/app/api/zapi/webhook/route.ts:69-86`

Mesmo padrão de falha aberta: `if (secret && ...)` — sem `ZAPI_WEBHOOK_SECRET` setada, qualquer request passa. Combinado com `cid = searchParams.get("cid") || DEFAULT_CID` vindo direto da query string sem cruzar contra o `instanceId` do payload, um atacante anônimo pode fazer `POST /api/zapi/webhook?cid=<outra-campanha>` com corpo forjado (`phone`, `text.message`, `senderName`) e criar `whatsappMessage` falsas em **qualquer campanha**, poluindo o inbox de leads ou forjando respostas de terceiros.

**Fix:** exigir `ZAPI_WEBHOOK_SECRET` sempre (fail-closed) e validar `cid` contra `Campaign.zApiInstance` recebido no payload, em vez de confiar no parâmetro.

---

### 3. `AuditLog` vaza entre campanhas

**Severidade: Alto** · `src/app/api/admin/audit/route.ts:19-22`

```ts
const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
```

O model `AuditLog` (schema.prisma:459-468) não tem campo `campaignId` — é global. A rota só checa `role === "ADMIN"`, sem (nem poder) filtrar por tenant. Qualquer ADMIN de qualquer campanha do sistema multi-tenant vê os 50 eventos mais recentes (`GRANT_ACCESS`, `REVOKE_ACCESS`, `UPDATE_USER`, `IMPERSONATE`) de **todas** as campanhas cadastradas, incluindo nome/e-mail de atores e alvos de outros tenants. Viola diretamente a regra 2 do `CLAUDE.md` ("todo endpoint deve filtrar por campaignId").

**Fix:** adicionar `campaignId` ao `AuditLog`, popular em todo `create`, filtrar por `cid` no `findMany`. Requer migration Prisma.

---

### 4. PDFs de recibo (CPF + valor) em Vercel Blob público sem expiração

**Severidade: Alto (LGPD)** · `src/lib/receipts.ts:185-190`

```ts
const blob = await put(`payment-receipts/${safeName}-${receipt.id}.pdf`, pdfBuffer, {
  access: "public",
  addRandomSuffix: true,
  ...
});
```

O PDF contém CPF completo, nome, valor pago e dados eleitorais. `access: "public"` significa acesso irrestrito e permanente pra quem tiver a URL — sem token, sem expiração, sem possibilidade de revogação. A URL é distribuída por WhatsApp (via Z-API, terceiro) e email, ficando em caches de CDN, previews de link e históricos de navegador indefinidamente. A segurança depende só da dificuldade de adivinhar o nome do arquivo (cuid + sufixo aleatório) — isso não é controle de acesso.

**Fix:** `access: "private"` + URL assinada com expiração curta, ou servir via rota autenticada que faz proxy do Blob após checar sessão/role/campaignId.

*(Resto da feature de recibos — autorização no `resend`, escopo do export XLSX, validação de CPF, idempotência — foi verificado e está correto. Ver seção "Verificado sem problema" abaixo.)*

---

### 5. Upload de imagem sem validação real de magic bytes em 2 rotas

**Severidade: Alto** · `src/app/api/zapi/upload/route.ts:47` e `src/app/api/churches/upload-photo/route.ts:42`

Essas duas rotas validam apenas `file.type` (MIME declarado pelo cliente no `FormData`, totalmente falsificável) via regex `/^image\//` — sem checar os bytes reais. O regex aceita `image/svg+xml`; um usuário autenticado (não precisa ser ADMIN em `churches/upload-photo`, só sessão) pode subir um SVG com `<script>` embutido. O Blob grava com `contentType: file.type` e, se a URL pública for aberta diretamente no navegador, o script executa (stored XSS).

Compare com `src/app/api/upload/route.ts:8-26`, que já faz a validação certa (magic bytes reais). Viola a regra 4 do `CLAUDE.md`.

Bônus menor: `src/app/api/settings/route.ts:47` (logo da campanha) grava `logoBase64` direto no banco sem nenhuma validação de tipo/tamanho — mitigado por exigir ADMIN, mas ainda fora do padrão do projeto.

**Fix:** reaproveitar `detectMime()` de `src/app/api/upload/route.ts` nas 3 rotas.

---

### 6. `decrypt()` com fallback silencioso perigoso

**Severidade: Alto** · `src/lib/crypto.ts:24-63`

Três comportamentos perigosos empilhados:
- Sem prefixo `v1:`, `decrypt()` retorna o valor cru, sem checagem de integridade — qualquer valor corrompido/malicioso no campo (ex. `zApiToken`) é tratado como token válido em vez de falhar. **Já causou o incidente de 2026-06-06** (Client-Token corrompido aceito como "legado plain").
- `getKey()` deriva a chave via SHA-256 se `APP_ENCRYPTION_KEY` não tiver exatamente 32 bytes — mascara configuração errada da env var em vez de falhar.
- Sem `APP_ENCRYPTION_KEY` setada, `decrypt()` retorna o valor bruto sem decifrar nem avisar ("modo dev") — perigoso se isso acontecer em produção por env var faltando.

**Fix:** fazer `decrypt()` falhar explicitamente (lançar ou retornar `null` + log de alerta) quando o prefixo `v1:` estiver ausente e já se souber que o valor deveria estar migrado; remover a derivação silenciosa de chave via SHA-256.

---

### 7. `PATCH /api/admin/users/[id]` sem filtro de `campaignId`

**Severidade: Médio-Alto** · `src/app/api/admin/users/[id]/route.ts:68-86`

```ts
const uc = await db.userCampaign.findUnique({ where: { id: params.id } });
await db.userCampaign.delete({ where: { id: params.id } });
```

Diferente do PUT/DELETE da mesma rota, que corretamente fazem `findFirst({ where: { userId, campaignId: CID }})`, o PATCH não valida que o `UserCampaign` pertence à campanha do admin logado. Um ADMIN da campanha A que descubra o cuid de um convite pendente da campanha B pode revogá-lo via IDOR (exploração exige conhecer um ID não sequencial, o que reduz a probabilidade prática, mas é uma violação clara de isolamento).

**Fix:** `db.userCampaign.deleteMany({ where: { id: params.id, campaignId: CID } })`.

---

### 8. CSP fraca (`unsafe-inline` + `unsafe-eval`)

**Severidade: Médio** · `next.config.mjs:35`

CSP existe (o achado antigo "sem CSP" está desatualizado), mas `script-src 'self' 'unsafe-inline' 'unsafe-eval'` neutraliza a principal proteção contra XSS — qualquer injeção de HTML/atributo já executa JS livremente. Combinado com o achado #5 (upload de SVG sem validação), o impacto é real.

**Fix:** migrar para CSP baseada em nonce (Next.js suporta via middleware), remover `unsafe-eval`.

---

### 9. Telegram webhook sem `secret_token` oficial

**Severidade: Médio** · `src/app/api/telegram/webhook/[botToken]/route.ts` e `src/app/api/telegram/webhook/route.ts` (legado)

A rota atual usa o próprio bot token como parte da URL pra identificar a campanha — funciona como segredo compartilhado de alta entropia, mas não usa o `X-Telegram-Bot-Api-Secret-Token` oficial do Telegram. Quem descobrir/vazar o botToken (logs, config, rota `register-webhook`) pode forjar updates e disparar `/novo`, `/lista`, `/stats`, `/municipio`. A rota **legada** (sem token na URL) é ainda mais exposta: qualquer POST não autenticado é processado pra campanha fixa `andre-santos-2026`.

**Fix:** implementar `secret_token` no `setWebhook` e validar o header em ambas rotas; considerar remover a rota legada se não estiver mais em uso. Vale também checar se `handleTelegramUpdate` valida `chat.id`/`from.id` contra allowlist de operadores (fora do escopo desta auditoria).

---

### 10. Comparação de Bearer não é timing-safe

**Severidade: Baixo** · todas as rotas `/api/n8n/*` e `/api/cron/*`

`===` simples em vez de `crypto.timingSafeEqual`. Fecha em falha (`if (!key) return false` antes), então não é fail-open — é risco teórico de side-channel, baixa prioridade, mas fácil de corrigir.

---

### 11. Reenvio de recibo sem cooldown

**Severidade: Baixo** · `src/app/api/payment-receipts/[id]/resend/route.ts`

Bloqueia reenvio se o canal já estiver `SENT`, mas não tem rate-limit se estiver `FAILED` — um ADMIN pode acionar reenvios repetidos (script, double-click), gerando custo com Z-API/Resend e spam ao colaborador. Como já é ADMIN-only, risco de abuso malicioso é baixo.

---

## Verificado — sem problema encontrado

- **Autorização no resend de recibo** (`payment-receipts/[id]/resend`): checa `auth()`, `role === "ADMIN"`, e escopa corretamente por `campaignId` — sem IDOR.
- **Export XLSX financeiro** (`church-assignments/payments/export`): ADMIN + `getCampaignContext` — sem problema.
- **Validação de CPF**: módulo-11 aplicado antes de salvar; campo não é exposto em listagens acessíveis a outros colaboradores.
- **Rotas de negócio `[id]`** (collaborators, events, groups, zones, tasks, church-assignments, invite-links): seguem o padrão `findFirst({ id, campaignId: CID })` corretamente.
- **Rotas `/api/n8n/*`**: fail-closed consistente (sem o problema de fail-open do cron/zapi-webhook).
- **`/api/upload`** (rota principal): magic bytes reais, correto.
- **Impersonation token**: TTL de 2h implementado e checado a cada request; sem exposição no client hoje.
- **`googleRefreshToken`**: criptografado corretamente com `encrypt()`/`decrypt()`.
- **Mensagens de erro do Z-API**: não vazam URL/credenciais internas ao cliente.
- **Envio best-effort de recibo**: falha de email/WhatsApp não desfaz o pagamento já commitado (comportamento de negócio correto e intencional).
- **`$queryRaw`/`$executeRaw`**: não existe no código atual — sem SQL injection.
- **Segredos hardcoded**: nenhum encontrado no código-fonte.

---

## Bug não resolvido — login de colaboradores convidados

**Status: hipótese confirmada como plausível pela leitura do código.**

`src/lib/auth.ts:23-170` (callback `jwt`): no caminho de convite pendente (só executa no primeiro login, exatamente o cenário reportado — Jimmy Alan e outros colaboradores convidados), o código roda sequencialmente: `findMany` de convites pendentes → `$transaction` (timeout 10s) com updates seriais por convite → fora da transação, mais `findFirst`/`update` de `userCampaign` e `getCampaignDbUrl`. Nada é paralelizado com `Promise.all`. Múltiplas idas seriais à rede (Neon) em cold start é candidato real a estourar o timeout da function serverless — o `catch` genérico evita crash mas não evita timeout se a soma ultrapassar o limite do runtime.

**Fix sugerido:** paralelizar queries independentes com `Promise.all` dentro do callback `jwt`, e/ou mover a resolução de `dbUrl`/role pra fora do hot path do primeiro login (processar convite pendente de forma assíncrona/lazy, como já cogitado no `estado.md`).

---

## Dívida técnica — status atual

| Item | Status 2026-06-06 | Status hoje (2026-07-30) |
|---|---|---|
| `typescript.ignoreBuildErrors` | `true` | **ainda `true`** |
| `eslint.ignoreDuringBuilds` | `true` | **removido — ESLint volta a rodar no build** ✅ |
| Erros de `tsc --noEmit` | 23 (não-funcionais) | **23** (estável; composição mudou levemente, nenhum é funcional) |
| Rate limit em `/api/public/cadastro` | in-memory (ineficaz) | **migrado pra Upstash Redis** ✅ — mas cai em fallback in-memory se as env vars não estiverem setadas (confirmar em produção) |
| Endpoints debug (`debug-env` etc.) | removidos | **confirmado ainda removidos**, nenhum novo esquecido |
| `joinCode` hardcoded `"andre2026"` | achado | **não existe mais** — hoje é env var, campo órfão sem validação |
| TODO/FIXME no código | não medido | **zero ocorrências** |
| `temporaria/` no deploy | risco de 4.3GB | **confirmado fora do deploy** via `.vercelignore` |

Endpoints públicos hoje **sem** rate-limit real: `GET /api/public/stats`, `GET /api/invite/validate`, `GET /api/cep/[cep]`, `POST /api/telegram/webhook`. Baixa prioridade (sem exclusões pedidas nesta auditoria, mas registrado).

Débito de UX ainda pendente, baixa prioridade: `htmlFor`/`id` em Labels de 5 dialogs, contraste `text-muted-foreground/30-40` (26 ocorrências), empty-CTA em `/mapa`.

---

## Pendências operacionais já conhecidas (não são bugs de código — precisam de ação manual no Vercel)

Estas já estavam registradas e **não foram verificadas nesta auditoria** por exigirem acesso autenticado ao dashboard/CLI da Vercel (não fiz login interativo no `vercel` CLI durante esta sessão):

1. **`RESEND_API_KEY` ausente em produção** — todo envio de email (recibos, convites, broadcast) está com código correto mas nunca envia nada até a chave ser adicionada (`vercel env add RESEND_API_KEY production`).
2. **Z-API não descriptografa** com a `APP_ENCRYPTION_KEY` atual (erro AES-GCM auth tag mismatch) — provavelmente todo o WhatsApp da campanha está quebrado, não só recibos. Fix conhecido: re-colar o Client-Token em Configurações → Integrações.
3. **`UPSTASH_REDIS_REST_URL`/`TOKEN`** — confirmar se estão setadas; se não, o rate-limit "corrigido" (item da tabela acima) volta a ser in-memory/ineficaz silenciosamente.
4. **`CRON_SECRET`** — não está na lista de env vars documentadas como obrigatórias no `CLAUDE.md`; dado o achado #1 desta auditoria, é crítico confirmar que está setada em produção.

**Recomendo verificar as 4 env vars acima no dashboard da Vercel como primeira ação, antes mesmo dos fixes de código** — são a diferença entre "vulnerabilidade teórica" e "aberto agora".

---

## Plano de ação sugerido (por impacto/esforço)

**Fazer primeiro (trivial, alto impacto):**
1. Confirmar as 4 env vars da seção acima em produção (`RESEND_API_KEY`, `APP_ENCRYPTION_KEY`/Z-API, `UPSTASH_REDIS_REST_URL/TOKEN`, `CRON_SECRET`)
2. Corrigir o padrão fail-open nos 2 crons (`gcal-sync`, `agenda-telegram`) — copiar o padrão de `tse-sync`
3. Corrigir `zapi/webhook` pro mesmo padrão fail-closed + validar `cid`
4. Adicionar filtro `campaignId` no `PATCH /api/admin/users/[id]`

**Depois (esforço pequeno-médio):**
5. Trocar `access: "public"` por Blob privado + URL assinada (ou proxy autenticado) nos recibos de pagamento
6. Aplicar `detectMime()` nas 3 rotas de upload sem magic bytes
7. Implementar `secret_token` no webhook do Telegram

**Estrutural (esforço maior, planejar):**
8. Adicionar `campaignId` ao `AuditLog` (migration)
9. Endurecer `decrypt()`/`getKey()` em `crypto.ts` (requer plano de migração dos valores já gravados no banco)
10. CSP nonce-based
11. Investigar e corrigir o callback `jwt` (paralelizar queries) — resolve o bug de login dos convidados

---

*Auditoria realizada via leitura direta de código-fonte (4 análises paralelas cobrindo auth/tenant isolation, crypto/secrets/injeção/headers, feature de recibos de pagamento, e verificação de achados de auditorias anteriores). Não inclui teste de penetração ativo nem verificação de configuração de produção na Vercel.*
