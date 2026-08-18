> **Status:** Passos 1–7 implementados (2026-08-18). Falta: Passo 2 (revisão
> jurídica do texto do termo — bloqueio real antes de publicar), Passo 8
> (opcional, ligar ao financeiro) e Passo 9 (testes em produção).

# PLAN — Termo de Apoiador (solicitação de material com assinatura)

Objetivo: página pública onde o voluntário se cadastra, escolhe o material de
campanha que quer receber (santinho, adesivo, camiseta etc.) e, com os dados já
preenchidos, aceita o **Termo de Apoiador** (declaração de recebimento de
material p/ distribuição voluntária) — que sai assinado (PDF) na hora, pronto
para a equipe aprovar a retirada/entrega.

Decisões fechadas com o Edson:
- **Assinatura**: clickwrap — nome/CPF já digitados no formulário + checkbox
  "Li e concordo com o Termo de Apoiador". Sem canvas de assinatura manuscrita.
  Evidência de aceite = nome + CPF + IP + user-agent + timestamp gravados junto
  do PDF (mesmo padrão de robustez jurídica de um clickwrap comum).
- **Aprovação**: NÃO é self-service. Solicitação nasce `PENDENTE_APROVACAO`;
  alguém da equipe confere estoque/elegibilidade e aprova antes da entrega.
  O termo já é gerado e assinado no momento do cadastro (o aceite é imediato) —
  a aprovação é sobre liberar a *entrega física*, não sobre a assinatura.
- **Texto jurídico do Termo**: PENDENTE DE REVISÃO. Não vou inventar cláusula
  vinculante para prestação de contas eleitoral (Lei 9.504/97) sem revisão de
  advogado/contador da campanha — mesma ressalva que já usamos nos contratos PJ
  (ver `CONTRATOS/`). Passo 2 entrega um rascunho pra revisão, não o texto final.

Reaproveita 100% de infraestrutura já validada em produção:
- Padrão de PDF serverless: `serverComponentsExternalPackages: ["pdfkit"]` +
  `outputFileTracingIncludes` (já configurado em `next.config.mjs`, usado em
  `src/lib/receipts.ts`) — não repetir o incidente de bundling.
- `@vercel/blob` pra guardar o PDF assinado.
- `zapiSendDocument` (WhatsApp) + Resend (`sendPaymentReceiptEmail` como
  referência) pra entregar o PDF automaticamente pro voluntário.
- Padrão do `/api/public/cadastro`: CORS por domínio (`ALLOWED_ORIGINS`),
  `resolvePublicTenant` (multi-tenant por domínio), `isRateLimited` adaptativo,
  dedupe por `phoneNormalized`.
- Model `Collaborator` existente — **não duplicar cadastro**, só estender.

> Build/lint: seguir a mesma regra dos outros planos — nunca `npm run build`
> direto na pasta sincronizada; validar no clone de CI antes de push. Sempre
> commitar e dar push após alteração validada (regra do projeto).

---

## Passo 1 — Schema Prisma: `MaterialRequest` ✅ (feito)

```prisma
model MaterialRequest {
  id               String   @id @default(cuid())
  campaignId       String
  collaboratorId   String
  items            Json     // [{ item: "Santinho", qty: 200 }, ...] — catálogo fixo em código no MVP
  status           MaterialRequestStatus @default(PENDENTE_APROVACAO)

  // snapshot do aceite — não muda se o cadastro do Collaborator for editado depois
  termSnapshotName String
  termSnapshotCpf  String
  termVersion      String   // versão do texto legal aceito (auditável)
  termAcceptedAt   DateTime
  termIp           String?
  termUserAgent    String?

  pdfUrl           String?  // Vercel Blob

  approvedById     String?
  approvedAt       DateTime?
  deliveredById    String?
  deliveredAt      DateTime?
  notes            String?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  campaign     Campaign     @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  collaborator Collaborator @relation(fields: [collaboratorId], references: [id], onDelete: Cascade)
  approvedBy   User?        @relation("ApprovedMaterialRequests", fields: [approvedById], references: [id])
  deliveredBy  User?        @relation("DeliveredMaterialRequests", fields: [deliveredById], references: [id])

  @@index([campaignId, status])
  @@index([collaboratorId])
}

enum MaterialRequestStatus {
  PENDENTE_APROVACAO
  APROVADO
  ENTREGUE
  RECUSADO
}
```

Catálogo de materiais **fixo em código** no MVP (`src/lib/material-catalog.ts`:
array `{ id, label, unidade }`) — não criar tabela própria agora, só migrar se
o catálogo crescer ou precisar de controle de estoque por item.

## Passo 2 — Texto do Termo (rascunho p/ revisão jurídica) ⚠️ (rascunho feito, falta revisão jurídica)

`src/lib/termo-apoiador.ts` — função que monta o texto a partir dos dados
(nome, CPF, cidade, lista de itens, data). Elementos mínimos de um termo desse
tipo (a confirmar com o contador/advogado eleitoral):
- Identificação do apoiador (nome, CPF) e do comitê (dados já salvos em
  memória — CNPJ 68.464.730/0001-87).
- Declaração de que o material é recebido **voluntariamente, sem contrapartida
  financeira**, para distribuição espontânea de apoio à candidatura.
- Relação exata dos itens/quantidades recebidos (evita alegação de doação não
  contabilizada).
- Compromisso de uso dentro das normas da Lei 9.504/97 (sem propaganda
  irregular, sem uso em local proibido).
- Data, versão do termo (`termVersion`) e metadados do aceite.

**Bloqueio real**: mandar esse rascunho pro contador/advogado da campanha
antes de publicar a página — mesma revisão que já é praxe nos contratos PJ.

## Passo 3 — Endpoint público `POST /api/public/material-request` ✅ (feito)

Clonar o esqueleto de `api/public/cadastro/route.ts`:
- Mesmo `corsHeaders`/`ALLOWED_ORIGINS`, `resolvePublicTenant`, `isRateLimited`
  (perfil "público" — 5/min por IP; considerar `EVENTO` como no cadastro se
  a entrega ocorrer em evento físico com QR code).
- Zod schema: nome, CPF (validar dígito verificador — ainda não há helper de
  validação de CPF no repo, só `formatCpf`; criar `isValidCpf`), telefone,
  email opcional, cidade/bairro, `items` (array não vazio, qty > 0 por item do
  catálogo fixo), `termAccepted: z.literal(true)`.
- Dedup: mesma lógica de `phoneNormalized` do cadastro — se já existe
  `Collaborator`, atualiza; senão cria (`source: "MATERIAL"`, `status: "LEAD"`
  ou `ACTIVE` conforme regra atual).
- Cria `MaterialRequest` com `termIp` (`x-forwarded-for`), `termUserAgent`,
  `termAcceptedAt: new Date()`, `termVersion` fixo no código.
- Gera o PDF (Passo 4), sobe pro Blob, salva `pdfUrl`.
- Dispara envio (Passo 5) — não bloquear a resposta HTTP nisso (fire-and-forget
  com log de erro, como já é feito com `sendTelegram`/webhooks no cadastro).

## Passo 4 — Geração do PDF do Termo ✅ (feito)

`src/lib/termo-apoiador-pdf.ts`, clonando a estrutura de `buildReceiptPdf` em
`receipts.ts` (mesmo `PDFDocument({ size: "A4", margin: 56 })`, mesmo padrão de
`Promise<Buffer>`). Conteúdo: texto do Passo 2 + tabela dos itens solicitados +
bloco de "evidência de aceite eletrônico" (nome, CPF, data/hora, IP).
Reaproveita `formatCpf`. **Não** precisa de fonte/assinatura manuscrita
(decisão: clickwrap) — só texto, então nenhum risco novo de bundling além do
que `serverComponentsExternalPackages` já cobre.

## Passo 5 — Envio automático do PDF assinado ✅ (feito)

- WhatsApp: `zapiSendDocument` (mesmo helper usado nos recibos) mandando o PDF
  pro telefone cadastrado, com mensagem curta ("Recebemos sua solicitação,
  aguarde a aprovação da equipe pra retirada").
- E-mail: se `email` foi informado, usar Resend no mesmo padrão de
  `sendPaymentReceiptEmail` (anexo do PDF).
- Fallback: se os dois falharem, não bloquear a criação da solicitação — só
  logar erro (o PDF já está no Blob e acessível pelo painel admin).

## Passo 6 — Página pública `/material` ✅ (feito)

`src/app/material/page.tsx` (+ `material-form.tsx` client, mesmo padrão de
`cadastro-form.tsx`). Fluxo em 2 telas (sem canvas, então cabe numa página só
ou num wizard leve de 2 passos):
1. Dados (nome, CPF, WhatsApp, e-mail opcional, cidade, bairro) + checklist de
   materiais com campo de quantidade por item (catálogo do Passo 1).
2. Texto do Termo renderizado inline (scroll/expand) + checkbox de aceite +
   botão "Confirmar e gerar meu Termo".
3. Tela de sucesso: "Solicitação enviada, aguardando aprovação" + botão baixar
   o PDF que acabou de ser gerado (mesmo se ainda pendente — o termo já está
   assinado, só a entrega que está pendente).

Multi-tenant: mesma resolução de campanha por domínio do `/cadastro` (não
aceitar `campaignId` no body).

## Passo 7 — Painel admin `/materiais` ✅ (feito)

Nova rota em `(dashboard)/materiais/page.tsx`, papel mínimo a definir (sugestão:
`LIDER_BAIRRO`+, igual outras telas operacionais):
- Lista `MaterialRequest` por status, com filtro por cidade/bairro/zona.
- Ação "Aprovar" (seta `APROVADO`, `approvedById`, `approvedAt`).
- Ação "Marcar entregue" (seta `ENTREGUE`, `deliveredById`, `deliveredAt`).
- Ação "Recusar" com motivo (`notes`).
- Botão baixar/reenviar o PDF a qualquer momento (link do Blob).

## Passo 8 — (opcional) Ligar ao módulo financeiro

Ao marcar `ENTREGUE`, opcionalmente criar um `FinancialEntry` (categoria
"Material de Campanha") pra manter a trilha de prestação de contas — mesmo
padrão usado pro registro dos contratos PJ (CT-001) no financeiro. Decidir se
isso é automático ou uma ação manual separada — depende de terem valor
unitário definido pra cada item do catálogo.

## Passo 9 — Testes e verificação

- CPF inválido/duplicado, telefone inválido, item sem quantidade.
- Rate-limit (mesmo teste de sequência que já causou o ban de 24h no
  WhatsApp — **não repetir envios em sequência rápida pro mesmo número em
  teste**, usar números de teste distintos).
- PDF abre corretamente em produção (Vercel, não só local) — é exatamente o
  ponto que quebrou antes com pdfkit.
- Dedup: mesma pessoa solicitando material duas vezes deve atualizar, não
  duplicar `Collaborator`.
- Painel admin: aprovar → entregar → PDF ainda acessível.

---

### Retomar no Passo 1
Cole no chat:

> Continue o PLAN-TERMO-APOIADOR.md a partir do Passo 1: adicione o model
> `MaterialRequest` e o enum `MaterialRequestStatus` ao `prisma/schema.prisma`
> (relations com `Campaign`, `Collaborator` e `User` conforme o plano), gere a
> migration e valide que o schema não conflita com os relation names já
> existentes em `User` (`RegisteredCollaborators` etc.).
