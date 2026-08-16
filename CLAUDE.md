# Base André Santos — CRM de Campanha 2026

> **Estado dinâmico do projeto:** `.claude/estado.md` (ler ao iniciar, atualizar ao encerrar).
> **Plano:** `../Andre Santos/PLAN-TROPA.md`
> **GitHub:** https://github.com/edsonluizzz/base-andre-santos
> **Comando de saída:** Ao ouvir "encerre e atualize", atualizar `.claude/estado.md`, commit e push.

## AI Preferences
- **Idioma:** Português Brasil (PT-BR).
- **Estilo:** Sênior, técnico, direto e conciso.
- **Workflow:** Edson testa em produção — sempre commitar e fazer push após alterações.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Banco:** PostgreSQL via NeonDB + Prisma ORM
- **Auth:** NextAuth v5 Beta (Google OAuth, JWT strategy)
- **Storage:** Vercel Blob
- **E-mail:** Resend
- **Google Calendar:** googleapis (sync bidirecional de eventos)
- **Deploy:** Vercel

## Domínio do Produto

Sistema interno de gestão da campanha do candidato André Santos (nº 30777) a Deputado Estadual PR 2026.

### Hierarquia de Cargos (CollaboratorRole)
```
COORD_GERAL → COORD_REGIONAL → LIDER_MUNICIPAL → LIDER_BAIRRO → VOLUNTARIO
```

### Módulos
| Módulo | Rota | Descrição |
|---|---|---|
| Dashboard | `/dashboard` | KPIs da campanha |
| Colaboradores | `/colaboradores` | CRUD de pessoas da campanha |
| Zonas | `/zonas` | Regiões / Municípios / Bairros |
| Grupos WhatsApp | `/grupos` | Grupos de comunicação |
| Agenda | `/agenda` | Eventos + sync Google Calendar |
| Comunicados | `/comunicados` | Broadcast por zona/cargo |
| Configurações | `/configuracoes` | Configurações gerais |

## Workflow de Deploy

Edson testa direto no Vercel — não roda o projeto localmente.
**Sempre commitar e fazer push após qualquer alteração.**

## Regras Obrigatórias de Segurança

### 1. Todo `route.ts` deve verificar autenticação

```typescript
const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### 2. Todo endpoint deve filtrar por `campaignId`

```typescript
const cid = "andre-santos-2026"; // tenant único
const collaborator = await db.collaborator.findFirst({
  where: { id: params.id, campaignId: cid }
});
```

### 3. Endpoints sensíveis devem verificar role

```typescript
if (session.user.role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### 4. Upload de arquivos exige validação de magic bytes

- Verificar magic bytes (não apenas extensão)
- Limitar tamanho (máx 4-5MB para fotos)
- Usar `contentType: detectedMime` ao fazer `put()` no Vercel Blob

### 5. Variáveis de ambiente

- Chaves secretas **nunca** com prefixo `NEXT_PUBLIC_`
- Usar `APP_URL` para URL base do servidor

### 6. Transações Prisma

```typescript
// ✅ Callback com timeout
await db.$transaction(async (tx) => { ... }, { timeout: 30000 });
// ❌ Não compila
await db.$transaction([...], { timeout: 30000 });
```

### 7. Todo handler deve ter try/catch

```typescript
export async function POST(req: NextRequest) {
  try {
    return NextResponse.json(result);
  } catch (err) {
    console.error("[rota] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

## Env Vars Necessárias (Vercel)

```
DATABASE_URL
AUTH_SECRET
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
APP_URL
RESEND_API_KEY
BLOB_READ_WRITE_TOKEN
GOOGLE_CALENDAR_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI
GOOGLE_CALENDAR_ID
```
