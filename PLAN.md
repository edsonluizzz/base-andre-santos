# PLAN — #4 Notificações de Eventos

## Escopo
- Evento **com ministryId** → notifica só membros daquele ministério (`MinistryMember`)
- Evento **geral** (sem ministryId) → notifica todos os membros ATIVOS do estabelecimento
- **In-app** (sino): apenas membros com `userId` (têm conta)
- **E-mail Resend**: membros com `email` cadastrado
- **Gatilho**: criação do evento (POST) — não na edição

## Passos

### ✅ Passo 1 — `src/lib/email.ts`
Adicionar `sendEventCreatedEmail(...)`.

### ✅ Passo 2 — `src/lib/event-notifications.ts` (novo)
Helper `notifyEventCreated(event, churchName)`:
- Busca membros afetados (ministério ou todos ativos)
- `db.notification.createMany` para userIds não-nulos
- `Promise.allSettled` de emails para membros com email

### ✅ Passo 3 — `src/app/api/events/route.ts`
No `POST`, após `db.event.create`:
- Buscar `establishment.name`
- Chamar `notifyEventCreated` (fire-and-forget com `.catch(console.error)`)

## Status: ✅ Concluído
