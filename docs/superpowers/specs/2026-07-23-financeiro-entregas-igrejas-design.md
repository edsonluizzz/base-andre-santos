# Relatório Financeiro de Entregas (Igrejas) — Design

**Data:** 2026-07-23
**Status:** Aprovado, aguardando plano de implementação

## Contexto

O módulo "Equipes de Distribuição em Igrejas" (`2026-07-20-equipes-distribuicao-igrejas-design.md`)
já rastreia, por `ChurchAssignment`, qual dupla (`member1Id`/`member2Id`) entregou material em
qual congregação, com status `PENDENTE/ENTREGUE/NAO_FOI_POSSIVEL`.

Falta: transformar "quantas entregas cada colaborador confirmou" em "quanto pagar pra cada um" —
cada membro da dupla recebe um valor fixo por igreja com status `ENTREGUE`, e o admin precisa
marcar o que já foi pago pra não contar de novo depois.

Decisões tomadas com o usuário (Edson):
- Escopo só do módulo Igrejas — nada de material distribuído em outros contextos (rua, eventos).
- Pagamento é por **membro**, não por dupla (os 2 da dupla recebem o valor cada um, dobrando o
  custo por igreja entregue).
- Valor **fixo global** (não varia por igreja/regional) — configurável pelo admin.
- Precisa **marcar como pago** (não é só uma soma "photo" do total devido) — relatórios seguintes
  não devem contar de novo o que já foi pago.
- UI vive como aba dentro da página `/igrejas` já existente (não é página nova no menu).

## Modelo de dados

Reaproveita `ChurchAssignment` e `Settings` (singleton de config já existente) — sem tabela nova.
Justificativa: o valor é global e único (não há necessidade de snapshot histórico de "quanto
valia quando pagou"); se o valor mudar, isso só afeta o que ainda não foi marcado como pago, o
que já está pago fica congelado por já ter saído da lista de pendentes. Se no futuro for preciso
auditar valores pagos por período, migra pra tabela `Payment` separada — não faz sentido agora
(YAGNI).

```prisma
model Settings {
  // ...campos existentes...
  deliveryPaymentValue Decimal @default(10) @db.Decimal(10, 2) // R$ por entrega confirmada, por membro
}

model ChurchAssignment {
  // ...campos existentes...
  member1PaidAt DateTime?
  member2PaidAt DateTime?
}
```

- `memberXPaidAt = null` → pendente. Preenchido → pago (timestamp serve de histórico/auditoria).
- Só faz sentido marcar pago quando `status == ENTREGUE`; a API valida isso.
- Reatribuição (redistribuir) já cria uma nova linha de `ChurchAssignment` preservando histórico
  — os `paidAt` da linha antiga não são tocados nem herdados pela nova.

## API

Todas as rotas exigem `session.user.role === "ADMIN"` (mesmo padrão de `/api/churches`).

### `GET /api/church-assignments/payments`

Agrega por colaborador (`member1` + `member2` de todas as `ChurchAssignment` com
`status = ENTREGUE`, unindo as duas posições por `collaboratorId`):

```json
{
  "rate": 10,
  "collaborators": [
    {
      "collaboratorId": "...",
      "name": "...",
      "deliveredCount": 5,
      "paidCount": 3,
      "pendingCount": 2,
      "amountPending": 20,
      "amountPaid": 30,
      "pendingAssignments": [
        { "assignmentId": "...", "churchName": "...", "deliveredAt": "..." }
      ]
    }
  ],
  "totals": { "amountPending": 120, "amountPaid": 340 }
}
```

`pendingAssignments` alimenta o drill-down (marcar pago item a item) sem precisar de outra
chamada.

### `POST /api/church-assignments/[id]/pay`

Body: `{ "member": "member1" | "member2" }`. Marca `memberXPaidAt = now()` **só se**
`status === ENTREGUE` e o campo ainda estiver `null` (idempotente — não sobrescreve timestamp já
setado). 404 se assignment não existe; 400 se não está `ENTREGUE`.

### `POST /api/church-assignments/pay-bulk`

Body: `{ "collaboratorId": "..." }`. Marca pago (idempotente) em todas as posições
(member1/member2) desse colaborador em assignments `ENTREGUE` ainda pendentes. Usado pelo botão
"pagar tudo" por colaborador. Implementado como loop server-side sobre o mesmo caminho do
endpoint singular (sem duplicar a regra de negócio).

### `PUT /api/settings` (rota já existente — estender, não criar nova)

Já é admin-only e faz `upsert` do singleton. Adicionar `deliveryPaymentValue` ao destructure do
body, ao `update`/`create` do upsert, e ao `select` do `GET` (hoje não lista todos os campos —
incluir `deliveryPaymentValue` explicitamente nas duas rotas).

## UI

Aba "Financeiro" na página `/igrejas` (tabs "Igrejas" | "Financeiro", client component, mesmo
arquivo `page.tsx` vira um shell com abas ou dois componentes client separados — decidir na hora
da implementação conforme tamanho do arquivo resultante).

Conteúdo da aba:
- Campo "Valor por entrega" (R$, input numérico + botão salvar) no topo — só leitura visual do
  valor atual até o admin editar.
- Card de totais: total pendente / total pago (geral).
- Tabela por colaborador: nome, entregas confirmadas, pagas, pendentes, valor devido, botão
  "Pagar tudo" (chama `pay-bulk`) + linha expansível listando as igrejas pendentes individuais
  com botão "Marcar pago" cada uma (chama o endpoint singular).
- Sem paginação/exportação nessa primeira versão — lista é do tamanho da equipe de distribuição,
  não deve crescer além de dezenas de linhas.

## Fora de escopo (YAGNI, revisar se pedirem depois)

- Exportar relatório em PDF/XLSX.
- Histórico de valor por período (tabela `Payment` com snapshot).
- Pagamento por igreja/regional com valor diferenciado.
- Qualquer coisa fora do módulo Igrejas (rua, eventos, ebooks).
