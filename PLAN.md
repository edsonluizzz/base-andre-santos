# PLAN — #7 Import + #8 Convite WhatsApp

## #7 Import 100+ linhas

**Causa raiz:** updates são feitos em loop sequencial dentro de `$transaction`.
100 updates × ~150ms = 15s; 200 updates = 30s (limite da transação).

**Fix:** substituir loop sequencial por `Promise.all` em chunks de 50.

### ✅ Passo 1 — `src/app/api/members/import/route.ts`
Trocar:
```typescript
await db.$transaction(async (tx) => {
  for (const { id, data } of toUpdate) await tx.member.update(...)
}, { timeout: 30000 });
```
Por:
```typescript
const CHUNK = 50;
for (let i = 0; i < toUpdate.length; i += CHUNK) {
  await Promise.all(toUpdate.slice(i, i + CHUNK).map(({ id, data }) =>
    db.member.update({ where: { id }, data })
  ));
}
```

---

## #8 Convite via WhatsApp pelo card

**Fluxo:**
1. Admin/Líder clica no botão WhatsApp do card de um membro sem conta vinculada
2. Abre WhatsApp com mensagem: `Olá [Nome]! Você foi cadastrado em [Igreja]. Acesse o sistema: [URL]/entrar?c=[CODE]&mid=[memberId]`
3. Membro clica no link, faz login com Google
4. `/api/join` reconhece o `mid` e vincula ao membro existente (sem criar duplicata)

### ✅ Passo 2 — `src/app/api/join/route.ts`
Aceitar `memberId` opcional no body do POST.
Se fornecido: buscar o membro, validar que pertence ao establishment e não tem userId, então atualizar `member.userId` em vez de criar novo membro.

### ✅ Passo 3 — `src/app/entrar/page.tsx`
Ler `?mid` da URL e passar para `POST /api/join`. Incluir `mid` no callbackUrl do signIn.

### ✅ Passo 4 — `src/app/(dashboard)/membros/page.tsx`
- Buscar `joinCode` e `churchName` de `GET /api/settings` no mount
- `MemberCard`: recebe `inviteUrl?: string`; renderiza botão WhatsApp (ícone MessageCircle) para membros sem userId com phone + joinCode ativo

## Status: Em andamento
