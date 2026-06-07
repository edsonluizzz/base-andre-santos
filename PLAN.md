# PLAN — phoneNormalized (dedup de telefone indexável)

## Objetivo
Eliminar o full-scan do dedup por telefone (busca `contains` slice(-8)) adicionando o campo
`phoneNormalized` (últimos 8 dígitos) com índice. Fecha o último risco de burst do tipo
"Gospel Class" no cadastro público.

## Steps

### Step 1 — coluna + escrita + dedup seguro  ← este commit
- `lib/utils.ts`: helper `normalizePhone()` (últimos 8 dígitos)
- `schema.prisma`: campo `phoneNormalized String?` + `@@index([campaignId, phoneNormalized])`
- Cadastro público + import: **popular** `phoneNormalized` na escrita (novos registros)
- Dedup: igualdade por `phoneNormalized` (indexada) **com fallback `contains`** para os legados
  ainda não backfilled — garante correção durante a transição, sem quebrar nada.
- Deploy aplica a coluna (via `db push`). Novos cadastros já populam.

### Step 2 — backfill dos existentes
- Endpoint admin one-shot `POST /api/admin/backfill-phone` (UPDATE SQL em lote, protegido ADMIN).
- Edson aciona uma vez → popula os ~2.400 registros existentes.
- Confirmar cobertura (quantos atualizados).

### Step 3 — cleanup / otimização final
- Remover o fallback `contains` do dedup (todos já backfilled) → dedup 100% indexado.
- Remover o endpoint `backfill-phone`.

## Retomar no Step 2
Prompt: "continuar PLAN phoneNormalized — step 2 (endpoint backfill)"
