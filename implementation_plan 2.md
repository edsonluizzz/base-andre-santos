# Plano de Ação: Expansão do SaaS (Multi-Contexto, Financeiro Avançado e Onboarding)

Este plano ataca diretamente os três maiores gargalos para que a plataforma deixe de ser um sistema "fechado" e se torne um SaaS robusto:
1. **Seletor de Contexto Multi-Congregação:** O usuário faz login 1x e pode alternar entre as filiais/igrejas em que possui acesso.
2. **Financeiro Avançado:** Transição de um modelo simples de entradas/saídas para algo rastreável e profissional (contas, anexos, categorias customizadas).
3. **Onboarding Automático:** A porta de entrada para que uma igreja assine/assuma um tenant de forma autônoma (self-service).

---

## 🛑 User Review Required
> [!IMPORTANT]
> - Precisaremos alterar a forma como o `User` é tratado no banco. No momento, o usuário só pode ter *uma* Role global e estar em *um* Establishment global (Porto Belo). Transformaremos para uma relação de **N:N**, onde um mesmo email pode ser ADMIN em "Itapema" e MEMBER em "Porto Belo".
> - Sobre o financeiro: você aprova a inserção de Entidades de "Conta Bancária/Caixa"? Isso muda o fluxo, pois cada Despesa ou Oferta deverá especificar "pra onde o dinheiro foi".

---

## Proposed Changes

### 1. Refatoração do Contexto Base (Multi-Tenant Login)
Em vez do usuário cair direto no dashboard, se ele pertencer a múltiplas congregações, um seletor intermediário aparecerá logo após o login.

#### [MODIFY] `prisma/schema.prisma`
Adicionar a model de junção `UserEstablishment` para registrar papeis por congregação.
Remover `@unique` de `userId` na tabela `Member` (agora um e-mail pode ter fichas em locais diferentes).
```prisma
model UserEstablishment {
  id              String   @id @default(cuid())
  userId          String
  establishmentId String
  role            Role     @default(MEMBER)

  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  establishment Establishment @relation(fields: [establishmentId], references: [id], onDelete: Cascade)
  @@unique([userId, establishmentId])
}
```

#### [NEW] `src/app/(auth)/select-church/page.tsx`
Se na hora de autenticar for detectado >1 vínculos, a NextAuth segura a sessão genérica e obriga a passar por esta tela para definir o `activeEstablishmentId` num cookie (`ovile-context-id`) ou token customizado.

### 2. Financeiro 2.0 (Robusto)
O financeiro atual (`Offering` e `Expense` com um Enum fixo) não atende a uma gestão minuciosa.

#### [MODIFY] `prisma/schema.prisma`
- **[NEW] `BankAccount` / `Wallet`**: Representa "Conta Bradesco", "Caixa Físico", "Sicoob". Toda transação sai/entra de uma carteira específica, possibilitando saldos e extratos.
- **[NEW] `TransactionCategory`**: Substituímos o Enum por tabelas de Plano de Contas. O administrador poderá criar "Dízimos", "Ofertas Culto X", "Aluguel", "Conta de Luz".
- **Modificações em `Offering`/`Expense`**: 
  - Fundimos em uma entidade `Transaction` global com Tipo (IN/OUT)? *OU* mantemos separados mas ambos recebendo upload de recibos (`receiptUrl`) e apontando pra um `BankAccountId`. Recomendo mantermos entidades separadas pelo escopo focado em Membros na Offering.

### 3. Onboarding Self-Service
Para não haver dependência manual de criação de igrejas.

#### [NEW] `src/app/(public)/onboarding/page.tsx`
Uma landing page com um formulário de 3 passos (`Church Name`, `Admin Name`, `Admin Email` -> Finalização).

#### [NEW] `src/app/api/onboarding/route.ts`
Recebe o formulário público:
1. Gera um `Establishment` novo (Ex: ID: `igreja-123`).
2. Verifica se o `User` existe, se sim cria um vinculo `UserEstablishment` como `ADMIN`. Se não, ele entra "pré-autorizado" aguardando o primeiro login com Google deste e-mail.
3. Futuro: Aciona disparo de e-mail de Boas Vindas.

---

## Open Questions
> [!CAUTION]
> 1. Para **Ofertas e Dízimos**, vocês anotam o membro vinculado. Isso vai continuar, certo?
> 2. O conceito de um usuário (o Edson, por exemplo) ter acesso a Porto Belo e também a Itapema faz o login e vê logo de cara o **Seletor de Igreja**. Para pessoas normais (membros da chamada) que só estão num único estabelecimento, eu irei pular essa tela direto pro dashboard deles. Ok agir assim?

---

## Verification Plan

### Automated Tests/Checks
- Fazer Push pro banco e ver se a flag `@default` segura os dados legados de Porto Belo.
- Migrar todo código do `/api/...` antigo que buscava `session.user.role` para validar o role focado no `activeEstablishmentId`.

### Manual Verification
- Testar o fluxo de registro real: acessar `/onboarding`, cadastrar uma Igreja Beta, vincular um email diferente e logar pra ver que ele não enxerga Porto Belo.
- Tentar transitar de conta pelo header.
