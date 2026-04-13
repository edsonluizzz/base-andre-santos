# Ovile Gestão — Instruções para Agentes (Claude & Gemini)

> **Estado dinâmico do projeto:** `.claude/estado.md` (Sempre ler ao iniciar e atualizar ao encerrar).
> **Comando de saída:** Ao ouvir "encerre e atualize", o agente deve atualizar o `.claude/estado.md`, realizar commit/push e finalizar.

## AI Preferences
- **Idioma:** Português Brasil (PT-BR).
- **Estilo:** Sênior, técnico, direto e conciso.
- **Workflow:** Edson testa em produção — sempre commitar e fazer push após alterações.

## Stack
...
- **Framework:** Next.js 14 (App Router)
- **Banco:** PostgreSQL via NeonDB + Prisma ORM
- **Auth:** NextAuth v5 Beta (Google OAuth, JWT strategy)
- **Storage:** Vercel Blob
- **Pagamentos:** Stripe
- **E-mail:** Resend
- **Deploy:** Vercel

## Workflow de Deploy

O Edson testa direto no Vercel — não roda o projeto localmente.
**Sempre commitar e fazer push após qualquer alteração.**

## Regras Obrigatórias de Segurança

### 1. Todo `route.ts` deve verificar autenticação

O middleware **não protege rotas de API** — a guarda é feita em cada handler.

```typescript
const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### 2. Todo endpoint deve filtrar por `establishmentId`

```typescript
const eid = session.user?.establishmentId ?? "default-porto-belo";
// ✅ Correto
const member = await db.member.findFirst({ where: { id: params.id, establishmentId: eid } });
// ❌ Errado — sem filtro de tenant
const member = await db.member.findUnique({ where: { id: params.id } });
```

> ⚠️ **`User.establishmentId` é campo legado** — não é atualizado no join via link. Para queries sobre usuários do tenant, usar `UserEstablishment`:
> ```typescript
> // ✅
> db.user.findMany({ where: { userEstablishments: { some: { establishmentId: eid, inviteStatus: "ACCEPTED" } } } })
> // ❌
> db.user.findMany({ where: { establishmentId: eid } })
> ```

### 3. Endpoints sensíveis devem usar `hasPermission()`

```typescript
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";

const allowed = await hasPermission(session.user.role as Role, "FINANCIAL", "VIEW", eid);
if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

### 4. Upload de arquivos exige validação de magic bytes

- Verificar magic bytes (não apenas extensão)
- Limitar tamanho (máx 4-5MB para fotos, 5MB para planilhas)
- Usar `contentType: detectedMime` ao fazer `put()` no Vercel Blob

### 5. Variáveis de ambiente

- Chaves secretas **nunca** com prefixo `NEXT_PUBLIC_`
- Usar `APP_URL` (não `NEXT_PUBLIC_URL`) para URL base do servidor

### 6. Transações Prisma com lotes grandes

`{ timeout }` só existe na forma callback — nunca na forma array:

```typescript
// ✅ Callback com timeout
await db.$transaction(async (tx) => {
  for (const item of items) await tx.model.update({ where: { id: item.id }, data: item.data });
}, { timeout: 30000 });

// ✅ Criações em massa — createMany é um único INSERT
await db.model.createMany({ data: items });

// ❌ Não compila
await db.$transaction(items.map(i => db.model.update(...)), { timeout: 30000 });
```

### 7. Todo handler deve ter try/catch

Sem try/catch, exceções retornam HTML 500. O frontend não consegue parsear como JSON e exibe "Erro de conexão".

```typescript
export async function POST(req: NextRequest) {
  try {
    // ...
    return NextResponse.json(result);
  } catch (err) {
    console.error("[rota] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

## Módulos e Permissões

Roles: `ADMIN` > `LEADER` > `MEMBER`

| Módulo | ADMIN | LEADER | MEMBER (default) |
|--------|-------|--------|-----------------|
| MEMBERS | ✅ | VIEW/CREATE/EDIT | ❌ |
| FINANCIAL | ✅ | VIEW/CREATE/EDIT | ❌ |
| REPORTS | ✅ | VIEW/EXPORT | ❌ |
| ATTENDANCE | ✅ | VIEW/CREATE/EDIT | VIEW |
| EVENTS | ✅ | VIEW/CREATE/EDIT | VIEW |
| MINISTRIES | ✅ | VIEW/CREATE/EDIT | VIEW |
