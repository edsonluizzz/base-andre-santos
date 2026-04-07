# Ovile Gestão — Instruções para Claude

## Stack

- **Framework:** Next.js 14 (App Router)
- **Banco:** PostgreSQL via NeonDB + Prisma ORM
- **Auth:** NextAuth v5 Beta (Google OAuth, JWT strategy)
- **Storage:** Vercel Blob
- **Pagamentos:** Stripe
- **E-mail:** Resend
- **Deploy:** Vercel

## Regras Obrigatórias de Segurança

### 1. Todo `route.ts` deve verificar autenticação

O middleware **não protege rotas de API** — a guarda é feita em cada handler.
Todo novo `route.ts` deve começar com:

```typescript
const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### 2. Todo endpoint deve filtrar por `establishmentId`

O Ovile é multi-tenant. **Nunca** buscar dados sem incluir `establishmentId` do token:

```typescript
const eid = session.user.establishmentId;
// ✅ Correto — inclui tenant no filtro
const member = await db.member.findFirst({ where: { id: params.id, establishmentId: eid } });
// ❌ Errado — pode retornar dados de outro tenant
const member = await db.member.findUnique({ where: { id: params.id } });
```

### 3. Endpoints com dados sensíveis devem usar `hasPermission()`

Para módulos com controle fino (FINANCIAL, REPORTS, MEMBERS, etc.):

```typescript
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";

const allowed = await hasPermission(session.user.role as Role, "FINANCIAL", "VIEW", eid);
if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

### 4. Upload de arquivos exige validação de magic bytes

Usar sempre o padrão de `/api/upload/route.ts` ou `/api/portal/photo/route.ts`:
- Verificar magic bytes (não apenas extensão)
- Limitar tamanho (máx 4-5MB para fotos, 5MB para planilhas)
- Usar `contentType: detectedMime` ao fazer `put()` no Vercel Blob

### 5. Variáveis de ambiente

- Chaves secretas **nunca** com prefixo `NEXT_PUBLIC_`
- Usar `APP_URL` (não `NEXT_PUBLIC_URL`) para URL base do servidor

## Workflow de Deploy

O Edson testa direto no Vercel — não roda o projeto localmente.
**Sempre commitar e fazer push após qualquer alteração.**

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
