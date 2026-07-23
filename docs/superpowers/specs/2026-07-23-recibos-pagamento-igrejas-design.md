# Recibos de Pagamento + Exportação (Financeiro de Entregas — Igrejas) — Design

**Data:** 2026-07-23
**Status:** Aprovado, aguardando plano de implementação

## Contexto

O módulo "Financeiro de Entregas" (`2026-07-23-financeiro-entregas-igrejas-design.md`) já calcula
quanto cada colaborador tem a receber por entregas confirmadas (`ChurchAssignment.status =
ENTREGUE`) e permite marcar como pago (individual ou em lote), usando `ChurchAssignment.member1PaidAt`/
`member2PaidAt` + `Settings.deliveryPaymentValue`.

Falta: dar comprovante formal de pagamento a cada colaborador (recibo em PDF), enviar esse
recibo automaticamente por email e/ou WhatsApp, e permitir exportar o relatório agregado (a
tabela da aba Financeiro) pra planilha.

Decisões tomadas com o usuário (Edson):
- Exporta **os dois**: relatório agregado (planilha) e recibo individual (PDF).
- Recibo é gerado e enviado **automaticamente** ao marcar pago (individual ou "pagar tudo") —
  sem passo manual de "gerar recibo" separado.
- Envia **nos dois canais quando disponíveis** (email E WhatsApp, não escolhe um só).
- Recibo é **PDF de verdade** (documento anexo/baixável), não só mensagem de texto.
- Recibo é **consolidado por ação de pagamento**: se "pagar tudo" cobre 5 igrejas numa
  chamada, sai 1 PDF listando as 5 e o total — não 5 recibos separados.
- Introduzir tabela nova `PaymentReceipt` (revertendo o "fora de escopo" do spec anterior) —
  necessário pra rastrear "recibo já enviado", permitir reenvio se falhar, e guardar snapshot do
  valor pago (auditoria, independente de mudança futura em `Settings.deliveryPaymentValue`).

## Modelo de dados

```prisma
model PaymentReceipt {
  id             String   @id @default(cuid())
  collaboratorId String
  amount         Float                  // total pago neste recibo (rate × count, snapshot)
  rate           Float                  // valor unitário aplicado no momento (auditoria)
  assignmentIds  String[]               // ChurchAssignment cobertos por este recibo
  pdfUrl         String?  @db.Text
  emailStatus    ReceiptChannelStatus @default(SKIPPED)
  whatsappStatus ReceiptChannelStatus @default(SKIPPED)
  emailError     String?  @db.Text
  whatsappError  String?  @db.Text
  createdAt      DateTime @default(now())

  collaborator Collaborator @relation(fields: [collaboratorId], references: [id], onDelete: Cascade)
  @@index([collaboratorId])
}

enum ReceiptChannelStatus {
  SKIPPED  // sem email/telefone cadastrado nesse colaborador
  SENT
  FAILED
}
```

- Sem `campaignId` direto — segue o mesmo padrão de `ChurchAssignment` (filtra via
  `collaborator.campaignId` nas queries).
- `amount`/`rate` são snapshot: se `Settings.deliveryPaymentValue` mudar depois, recibos já
  emitidos não recalculam — é histórico fechado.
- `assignmentIds` é `String[]` (array nativo do Postgres via Prisma) — não precisa de tabela de
  junção só pra isso, a lista é só leitura/auditoria, nunca filtrada por elemento individual.

## Fluxo de geração e envio

`markAssignmentMemberPaid` (helper existente, por-assignment) **não muda** — continua só
marcando `memberXPaidAt`. A geração de recibo vive num helper novo, `generateAndSendReceipt(db,
collaboratorId, assignmentIds, campaignId)`, chamado **uma vez por request** nos dois pontos de
entrada, depois que o loop de pagamento (se houver) já terminou:

- `POST /:id/pay`: chama com `assignmentIds = [id]` só se `markAssignmentMemberPaid` retornou
  sucesso E não era um no-op (já estava pago antes).
- `POST /pay-bulk`: acumula os `assignmentId` de cada iteração do loop que **não era no-op**,
  e chama uma vez só no final com a lista completa daquele colaborador.

Dentro de `generateAndSendReceipt`, envio é **best-effort e não bloqueia nem desfaz o
pagamento** (que já foi commitado antes desta função ser chamada):

```
1. Recebe a lista de assignmentIds recém-pagos nesta chamada (já filtrada e garantida
   não-vazia pelo caller — ver acima).
2. Busca `Settings.deliveryPaymentValue` (rate atual) e cria `PaymentReceipt` (amount = rate ×
   assignmentIds.length, rate snapshot, assignmentIds, status inicial SKIPPED nos dois canais).
3. Gera PDF (pdfkit): nome do colaborador, nome do candidato/campanha (Campaign.candidateName),
   data de emissão, tabela com as igrejas cobertas (nome + data da entrega), valor unitário,
   valor total, texto "Recibo de pagamento — [candidato]".
4. Upload do PDF no Vercel Blob — mesmo padrão de src/app/api/churches/upload-photo/route.ts
   (upload via servidor com token explícito, store público, nunca PUT direto do navegador).
   Atualiza PaymentReceipt.pdfUrl.
5. Se collaborator.email existe: envia por Resend com o PDF como anexo.
   emailStatus = SENT (sucesso) ou FAILED + emailError (mensagem).
6. Se collaborator.phone existe: envia por zapiSendDocument (nova função em src/lib/zapi.ts,
   mesmo padrão de zapiSendImage — POST send-document/pdf com { phone, document: pdfUrl,
   fileName }). whatsappStatus = SENT ou FAILED + whatsappError.
7. Sem email nem telefone: os dois campos ficam SKIPPED, sem erro (não é falha, é ausência de
   contato) — PDF continua existindo em pdfUrl pra download manual.
```

Qualquer exceção nos passos 3–6 é capturada e vira `FAILED` (ou impede o `pdfUrl` do passo 4 em
diante se o próprio PDF falhar) — `generateAndSendReceipt` nunca propaga erro pra fora, os
callers (`pay`/`pay-bulk`) chamam ela depois de já responder a lógica de pagamento, então uma
falha aqui não muda o status HTTP nem desfaz `memberXPaidAt`.

## API

Todas as rotas exigem `session.user.role === "ADMIN"` (mesmo padrão já estabelecido).

### `POST /api/payment-receipts/[id]/resend`

Body: `{ "channel": "email" | "whatsapp" }`. Reusa o `pdfUrl` já existente no `PaymentReceipt`
(não gera o PDF de novo) e tenta reenviar só aquele canal. Regras:
- 404 se o `PaymentReceipt` não existe ou não pertence à campanha do admin (via
  `collaborator.campaignId`).
- 400 se aquele canal já está `SENT` (idempotente — não reenvia o que já foi confirmado).
- 400 se o colaborador não tem contato pro canal pedido (email/phone ausente).
- Sucesso: atualiza o status do canal (`SENT` ou `FAILED` + error), sempre respondendo 200 com o
  resultado (a tentativa em si não "falha" a request — só o envio pode falhar).

### `GET /api/church-assignments/payments/export`

Mesmo agregado de `GET /api/church-assignments/payments` (por colaborador: entregas, pagas,
pendentes, devido, pago + totais), serializado em XLSX via `exceljs` (já é dependência do
projeto, mesmo padrão de `src/app/api/collaborators/export/route.ts`). Resposta com
`Content-Type` de spreadsheet e `Content-Disposition: attachment`.

## UI (extensão de `FinanceiroTab`)

- Botão "Exportar XLSX" no topo da aba (ao lado do card de totais) → link direto pro endpoint de
  export (`<a href=... download>`, sem precisar de estado de loading separado).
- Cada linha de colaborador já pago ganha indicadores de canal: ✓ (SENT) / ✗ com botão
  "Reenviar" (FAILED) / — (SKIPPED, sem contato). Link "Baixar PDF" sempre visível quando
  `pdfUrl` existe, independente do status de envio.
- Sem lista separada de "histórico de recibos" nesta versão — o status vive inline na mesma
  tabela de colaboradores já existente (um `PaymentReceipt` mais recente por colaborador é
  suficiente pra exibir; múltiplos recibos por colaborador ao longo do tempo ficam no banco pra
  auditoria, mas a UI só precisa mostrar o mais recente relevante a cada linha).

## Fora de escopo (YAGNI, revisar se pedirem depois)

- Editar/customizar o template do PDF (logo, cores da campanha) além do texto básico.
- Histórico de recibos navegável na UI (fica só no banco).
- Exportar o relatório agregado em PDF (só XLSX).
- Reenvio automático agendado (cron) para `FAILED` — reenvio é sempre manual, um clique.
- Qualquer coisa fora do módulo Igrejas.
