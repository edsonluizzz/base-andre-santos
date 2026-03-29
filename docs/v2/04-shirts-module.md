# Módulo de Encomendas de Camisetas V2

## Visão Geral

Gerenciamento completo de pedidos de camisetas para congressos e eventos especiais: criação do congresso, registro de pedidos por membro, controle de pagamento e acompanhamento de entrega.

---

## Schema de Dados

```prisma
model Congress {
  id          String         @id @default(cuid())
  name        String         // "Congresso UMADC 2025"
  date        DateTime
  location    String?
  description String?
  status      CongressStatus @default(OPEN)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  shirtOrders ShirtOrder[]
}

model ShirtOrder {
  id            String           @id @default(cuid())
  congressId    String
  memberId      String
  size          ShirtSize
  quantity      Int              @default(1)
  color         String?
  paidAmount    Decimal          @db.Decimal(10, 2) @default(0)
  totalAmount   Decimal          @db.Decimal(10, 2)
  paymentMethod PaymentMethod?
  paymentDate   DateTime?
  status        ShirtOrderStatus @default(PENDING)
  deliveredAt   DateTime?
  notes         String?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  createdBy     String?
  congress      Congress  @relation(fields: [congressId], references: [id], onDelete: Cascade)
  member        Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  @@unique([congressId, memberId])
}

enum ShirtSize        { PP P M G GG XG XXG }
enum ShirtOrderStatus { PENDING PAID PRODUCTION READY DELIVERED CANCELLED }
enum CongressStatus   { OPEN CLOSED FINISHED }
```

---

## Fluxo de Trabalho

```
OPEN (congresso criado, recebendo pedidos)
  ↓ admin fecha pedidos
CLOSED (pedidos encerrados, gerando relatório para gráfica)
  ↓ camisetas chegam
FINISHED (congresso realizado)

Por pedido:
PENDING → PAID → PRODUCTION → READY → DELIVERED
                                     → CANCELLED (a qualquer momento)
```

### Fase 1 — Criar Congresso
- Admin acessa `/camisetas`
- Clica "Novo Congresso"
- Preenche: nome, data, local, descrição opcional
- Status inicial: `OPEN`

### Fase 2 — Registrar Pedidos
- Seleciona o congresso ativo
- Para cada membro: tamanho, quantidade, preço unitário
- Pode registrar pagamento na hora (total ou parcial)
- Status inicial do pedido: `PENDING`

### Fase 3 — Acompanhar Pagamentos
- Dashboard mostra total arrecadado / total esperado com barra de progresso
- Lista de inadimplentes (PENDING sem pagamento)
- Admin marca pagamentos individualmente → status: `PAID`

### Fase 4 — Relatório para Gráfica
- Admin fecha o congresso (status: `CLOSED`)
- Clica "Relatório para Gráfica"
- Gerado: tabela agrupada por tamanho (PP: 2, P: 5, M: 12, G: 8, GG: 3)
- Opção de copiar ou exportar CSV
- Status de todos os pedidos vai para `PRODUCTION`

### Fase 5 — Entrega
- À medida que entrega, admin marca individualmente como `DELIVERED`
- Data de entrega registrada automaticamente

---

## API Routes

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/congresses` | Listar congressos |
| POST | `/api/congresses` | Criar congresso |
| PATCH | `/api/congresses/[id]` | Editar / fechar congresso |
| DELETE | `/api/congresses/[id]` | Deletar (só sem pedidos) |
| GET | `/api/congresses/[id]/orders` | Listar pedidos do congresso |
| POST | `/api/congresses/[id]/orders` | Criar pedido |
| PATCH | `/api/congresses/[id]/orders/[orderId]` | Atualizar status/pagamento |
| DELETE | `/api/congresses/[id]/orders/[orderId]` | Deletar pedido |
| GET | `/api/congresses/[id]/summary` | Resumo: por tamanho, status, financeiro |

---

## Dashboard `/camisetas`

### Cards KPI
- Total de pedidos do congresso ativo
- Total arrecadado vs esperado (R$ X / R$ Y — barra de progresso %)
- Pedidos a entregar (READY + PRODUCTION)
- Distribuição por tamanho (mini-tabela: PP:2, P:5, M:12...)

### Tabela de Pedidos
- Colunas: Nome, Tamanho, Qtd, Valor Total, Pago, Status, Ações
- Filtros: por status, por tamanho, busca por nome
- Ação inline: botão "Marcar Pago", botão "Marcar Entregue"
- Badge colorido por status

### Botão "Relatório para Gráfica"
- Agrupa pedidos por tamanho
- Exibe tabela: Tamanho | Quantidade
- Botão "Copiar" e botão "Exportar CSV"

---

## Permissões

| Ação | ADMIN | LEADER | MEMBER |
|------|-------|--------|--------|
| Ver lista de pedidos | ✓ | ✓ | ✓ (só os seus) |
| Criar pedido | ✓ | ✓ | ✗ |
| Editar pedido | ✓ | ✓ | ✗ |
| Deletar pedido | ✓ | ✗ | ✗ |
| Criar/editar congresso | ✓ | ✗ | ✗ |
| Exportar relatório | ✓ | ✓ | ✗ |
