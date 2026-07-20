# Equipes de Distribuição em Igrejas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an ADMIN import a spreadsheet of congregations, assign a fixed pair of collaborators to each one, and let that pair mark delivery (with mandatory photo proof) or failure from their phone — giving full accountability of who visited which church and when.

**Architecture:** Two new Prisma models (`Church`, `ChurchAssignment`) hang off the existing `Campaign`/`Collaborator` models. Assignment reuses direct `member1Id`/`member2Id` columns (not a join table) because the "always exactly 2" rule is fixed. A new ADMIN page (`/igrejas`) handles import + assignment; a new member-facing page (`/minhas-igrejas`) handles delivery reporting. Photo upload goes through the server (mirrors the existing WhatsApp-media fix, avoiding the CSP/CORS bug that already bit this project once) rather than a direct browser-to-Blob PUT.

**Tech Stack:** Next.js 14 (App Router), Prisma 7 + PostgreSQL (Neon), NextAuth v5, Vercel Blob, `xlsx` (client-side parsing, already a dependency), Playwright (e2e), Tailwind + shadcn/ui components already in the repo.

## Global Constraints

- **Never run `npm run build` in the Drive clone** — the `build` script runs `prisma db push` against the **production** database (`package.json`: `"build": "prisma db push || ... && prisma generate && next build"`). Schema changes only reach prod via the Vercel deploy build. Locally, validate with `npx prisma validate` / `npx prisma generate` only (no DB connection).
- **Lint before push:** run `next lint` from the clone `C:\Users\usuario\ovile-ci` (has no `.env`, so its own `db push` step no-ops offline), not from the Drive folder.
- **PT-BR, sênior, direto** — all UI copy and code comments in Portuguese where the surrounding file already is (matches `CLAUDE.md`).
- **All routes must:** check `session?.user?.id` first (401 if absent), resolve tenant via `getCampaignContext(session)` (never hardcode `"andre-santos-2026"`), and wrap DB calls in try/catch returning `{ error }` with a proper status.
- **Every `route.ts` handler needs try/catch** per the project's security rule #7 in `CLAUDE.md`.
- **Commit after every task** (project workflow: "Sempre commitar e fazer push após qualquer alteração"). Push is left to the user's judgement per task unless stated otherwise — batch pushes are fine, but each task must at least be committed locally so work is never lost mid-stream.

---

### Task 1: Prisma schema — `Church` + `ChurchAssignment`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Church` model (`id, campaignId, name, regional, denominacao, createdAt, updatedAt`), `ChurchAssignment` model (`id, churchId, status, photoUrl, notes, assignedById, member1Id, member2Id, deliveredAt, createdAt, updatedAt`), `ChurchAssignmentStatus` enum (`PENDENTE | ENTREGUE | NAO_FOI_POSSIVEL`). All later tasks import these via `@prisma/client`.

- [ ] **Step 1: Add the enum and models to `prisma/schema.prisma`**

Insert after the existing `enum TaskPriority { ... }` block (end of file):

```prisma
model Church {
  id          String   @id @default(cuid())
  campaignId  String   @default("andre-santos-2026")
  name        String
  regional    String?
  denominacao String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  campaign    Campaign           @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  assignments ChurchAssignment[]

  @@index([campaignId])
  @@index([regional])
  @@index([denominacao])
}

model ChurchAssignment {
  id           String                 @id @default(cuid())
  churchId     String
  status       ChurchAssignmentStatus @default(PENDENTE)
  photoUrl     String?                @db.Text
  notes        String?
  assignedById String
  member1Id    String
  member2Id    String
  deliveredAt  DateTime?
  createdAt    DateTime               @default(now())
  updatedAt    DateTime               @updatedAt

  church  Church       @relation(fields: [churchId], references: [id], onDelete: Cascade)
  member1 Collaborator @relation("AssignmentMember1", fields: [member1Id], references: [id], onDelete: Cascade)
  member2 Collaborator @relation("AssignmentMember2", fields: [member2Id], references: [id], onDelete: Cascade)

  @@index([churchId])
  @@index([status])
  @@index([member1Id])
  @@index([member2Id])
}

enum ChurchAssignmentStatus {
  PENDENTE
  ENTREGUE
  NAO_FOI_POSSIVEL
}
```

- [ ] **Step 2: Wire the back-relations on `Campaign` and `Collaborator`**

In `model Campaign`, add to the relations block (next to `collaborators Collaborator[]`):

```prisma
  churches       Church[]
```

In `model Collaborator`, add to the relations block (next to `rsvps EventRsvp[]`):

```prisma
  assignmentsAsMember1 ChurchAssignment[] @relation("AssignmentMember1")
  assignmentsAsMember2 ChurchAssignment[] @relation("AssignmentMember2")
```

- [ ] **Step 3: Validate the schema (no DB connection needed)**

Run: `cd "G:\Meu Drive\PROJETOS IA - EDSON\BASE ANDRE SANTOS - OVILE" && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client` — this only regenerates local TS types, it does not touch any database.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): adiciona Church e ChurchAssignment (equipes de distribuição)"
```

---

### Task 2: Espelhar o schema em `tenant-init-sql.ts`

**Files:**
- Modify: `src/lib/tenant-init-sql.ts`

**Interfaces:**
- Consumes: nada de código — é um espelho manual do schema do Task 1, usado só quando um tenant novo é provisionado do zero.

- [ ] **Step 1: Adicionar o enum na seção `-- Enums`**

Depois de `CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');`, adicionar:

```sql
CREATE TYPE "ChurchAssignmentStatus" AS ENUM ('PENDENTE', 'ENTREGUE', 'NAO_FOI_POSSIVEL');
```

- [ ] **Step 2: Adicionar as tabelas na seção `-- Tables` (depois de `Task`)**

```sql
CREATE TABLE "Church" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL DEFAULT 'andre-santos-2026',
    "name" TEXT NOT NULL,
    "regional" TEXT,
    "denominacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "ChurchAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "churchId" TEXT NOT NULL,
    "status" "ChurchAssignmentStatus" NOT NULL DEFAULT 'PENDENTE',
    "photoUrl" TEXT,
    "notes" TEXT,
    "assignedById" TEXT NOT NULL,
    "member1Id" TEXT NOT NULL,
    "member2Id" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
```

- [ ] **Step 3: Adicionar os índices na seção `-- Indexes` (depois dos índices de `Task`)**

```sql
CREATE INDEX "Church_campaignId_idx" ON "Church"("campaignId");
CREATE INDEX "Church_regional_idx" ON "Church"("regional");
CREATE INDEX "Church_denominacao_idx" ON "Church"("denominacao");
CREATE INDEX "ChurchAssignment_churchId_idx" ON "ChurchAssignment"("churchId");
CREATE INDEX "ChurchAssignment_status_idx" ON "ChurchAssignment"("status");
CREATE INDEX "ChurchAssignment_member1Id_idx" ON "ChurchAssignment"("member1Id");
CREATE INDEX "ChurchAssignment_member2Id_idx" ON "ChurchAssignment"("member2Id");
```

- [ ] **Step 4: Adicionar as foreign keys na seção `-- Foreign Keys` (no final do arquivo)**

```sql
ALTER TABLE "Church" ADD CONSTRAINT "Church_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchAssignment" ADD CONSTRAINT "ChurchAssignment_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchAssignment" ADD CONSTRAINT "ChurchAssignment_member1Id_fkey" FOREIGN KEY ("member1Id") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChurchAssignment" ADD CONSTRAINT "ChurchAssignment_member2Id_fkey" FOREIGN KEY ("member2Id") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenant-init-sql.ts
git commit -m "chore(tenant-init): espelha Church/ChurchAssignment pro bootstrap de tenant novo"
```

---

### Task 3: Módulo de lógica pura (`src/lib/churches.ts`)

Extrai normalização/dedup/validação como funções puras, testáveis sem sessão nem banco — é o que dá pra testar de verdade nesse projeto (não há runner de unit test configurado; roda com `ts-node`, igual ao `db:seed`).

**Files:**
- Create: `src/lib/churches.ts`
- Test: `src/lib/churches.test-manual.ts` (script standalone, não framework de teste)

**Interfaces:**
- Produces: `normalizeRegional(raw: string): string`, `dedupeChurchRows(rows: {name: string; regional: string}[]): {name: string; regional: string}[]`, `assertDistinctMembers(member1Id: string, member2Id: string): void` (throws `Error` if equal).
- Consumes: nada — módulo independente.

- [ ] **Step 1: Escrever o script de verificação (roda antes de existir a implementação, pra confirmar que falha)**

```typescript
// src/lib/churches.test-manual.ts
import { normalizeRegional, dedupeChurchRows, assertDistinctMembers } from "./churches";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`FALHOU: ${label}\n  esperado: ${e}\n  recebido: ${a}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${label}`);
  }
}

assertEqual(normalizeRegional("  Santa felicidade "), "Santa Felicidade", "normaliza case/trim");
assertEqual(normalizeRegional("CIC"), "CIC", "mantém sigla já normalizada");

assertEqual(
  dedupeChurchRows([
    { name: "Água Verde", regional: "Matriz" },
    { name: "água verde", regional: "matriz" }, // duplicata (case/acentuação)
    { name: "Ahú", regional: "Matriz" },
  ]),
  [
    { name: "Água Verde", regional: "Matriz" },
    { name: "Ahú", regional: "Matriz" },
  ],
  "dedup por nome normalizado dentro da mesma regional",
);

try {
  assertDistinctMembers("abc", "abc");
  console.error("FALHOU: assertDistinctMembers deveria lançar erro para IDs iguais");
  process.exitCode = 1;
} catch {
  console.log("OK: assertDistinctMembers rejeita IDs iguais");
}

try {
  assertDistinctMembers("abc", "def");
  console.log("OK: assertDistinctMembers aceita IDs diferentes");
} catch {
  console.error("FALHOU: assertDistinctMembers não deveria lançar erro para IDs diferentes");
  process.exitCode = 1;
}
```

- [ ] **Step 2: Rodar e confirmar que falha (módulo `./churches` ainda não existe)**

Run: `cd "G:\Meu Drive\PROJETOS IA - EDSON\BASE ANDRE SANTOS - OVILE" && npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/lib/churches.test-manual.ts`
Expected: erro de módulo não encontrado (`Cannot find module './churches'`)

- [ ] **Step 3: Implementar `src/lib/churches.ts`**

```typescript
/**
 * Normaliza um nome de regional para comparação/dedup: trim + Title Case
 * simples (primeira letra de cada palavra maiúscula, resto minúscula).
 * Resolve variações de digitação como "Santa felicidade" vs "Santa Felicidade".
 */
export function normalizeRegional(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function normalizeName(raw: string): string {
  return raw
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos p/ comparação
    .toLowerCase();
}

/**
 * Remove linhas duplicadas (mesmo nome normalizado dentro da mesma regional
 * normalizada), mantendo a primeira ocorrência com sua grafia original.
 */
export function dedupeChurchRows(
  rows: { name: string; regional: string }[],
): { name: string; regional: string }[] {
  const seen = new Set<string>();
  const out: { name: string; regional: string }[] = [];
  for (const row of rows) {
    const regional = normalizeRegional(row.regional);
    const key = `${normalizeName(row.name)}|${normalizeName(regional)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: row.name.trim(), regional });
  }
  return out;
}

/** Lança erro se os dois membros da dupla forem a mesma pessoa. */
export function assertDistinctMembers(member1Id: string, member2Id: string): void {
  if (member1Id === member2Id) {
    throw new Error("Os dois membros da dupla precisam ser pessoas diferentes.");
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/lib/churches.test-manual.ts`
Expected: 5 linhas `OK: ...`, nenhuma `FALHOU`, `process.exitCode` não setado (0).

- [ ] **Step 5: Commit**

```bash
git add src/lib/churches.ts src/lib/churches.test-manual.ts
git commit -m "feat(churches): normalização/dedup/validação puras + script de verificação"
```

---

### Task 4: API — listar e importar igrejas

**Files:**
- Create: `src/app/api/churches/route.ts`
- Create: `src/app/api/churches/import/route.ts`
- Test: `e2e/churches-import.spec.ts`

**Interfaces:**
- Consumes: `getCampaignContext` (`@/lib/campaign-context`), `auth` (`@/lib/auth`), `dedupeChurchRows`/`normalizeRegional` (`@/lib/churches`, Task 3).
- Produces: `GET /api/churches?regional=&denominacao=&status=` → `{ data: ChurchWithLatestAssignment[] }`; `POST /api/churches/import` body `{ rows: {name: string; regional: string}[]; denominacao?: string }` → `{ created: number; skipped: number }`. Both consumed by the `/igrejas` page (Task 6).

- [ ] **Step 1: Escrever o teste e2e (falha — rotas não existem)**

```typescript
// e2e/churches-import.spec.ts
import { test, expect } from "@playwright/test";

test.describe("API /api/churches", () => {
  test("GET sem sessão retorna 401", async ({ request }) => {
    const res = await request.get("/api/churches");
    expect(res.status()).toBe(401);
  });

  test("POST /api/churches/import sem sessão retorna 401", async ({ request }) => {
    const res = await request.post("/api/churches/import", {
      data: { rows: [{ name: "Igreja Teste", regional: "Matriz" }] },
    });
    expect(res.status()).toBe(401);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx playwright test e2e/churches-import.spec.ts`
Expected: FAIL (rotas retornam 404, não 401 — ainda não existem)

- [ ] **Step 3: Implementar `src/app/api/churches/route.ts` (GET)**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { db, cid: CID } = getCampaignContext(session);
    const { searchParams } = new URL(req.url);
    const regional = searchParams.get("regional") ?? "";
    const denominacao = searchParams.get("denominacao") ?? "";

    const churches = await db.church.findMany({
      where: {
        campaignId: CID,
        ...(regional && { regional }),
        ...(denominacao && { denominacao }),
      },
      include: {
        assignments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            member1: { select: { id: true, name: true } },
            member2: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const data = churches.map((c) => ({
      id: c.id,
      name: c.name,
      regional: c.regional,
      denominacao: c.denominacao,
      latestAssignment: c.assignments[0] ?? null,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[api/churches GET] erro:", err);
    return NextResponse.json({ error: "Erro ao listar igrejas" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implementar `src/app/api/churches/import/route.ts` (POST)**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { dedupeChurchRows } from "@/lib/churches";

const rowSchema = z.object({
  name: z.string().min(1).max(255),
  regional: z.string().min(1).max(100),
});
const importSchema = z.object({
  rows: z.array(rowSchema).min(1).max(1000),
  denominacao: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem importar igrejas" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { rows, denominacao } = parsed.data;

    const { db, cid: CID } = getCampaignContext(session);
    const deduped = dedupeChurchRows(rows);

    const existing = await db.church.findMany({
      where: { campaignId: CID },
      select: { name: true, regional: true },
    });
    const existingKeys = new Set(
      existing.map((e) => `${e.name.trim().toLowerCase()}|${(e.regional ?? "").trim().toLowerCase()}`),
    );

    const toCreate = deduped.filter(
      (row) => !existingKeys.has(`${row.name.toLowerCase()}|${row.regional.toLowerCase()}`),
    );

    if (toCreate.length > 0) {
      await db.church.createMany({
        data: toCreate.map((row) => ({
          campaignId: CID,
          name: row.name,
          regional: row.regional,
          denominacao: denominacao?.trim() || null,
        })),
      });
    }

    return NextResponse.json({ created: toCreate.length, skipped: rows.length - toCreate.length });
  } catch (err) {
    console.error("[api/churches/import] erro:", err);
    return NextResponse.json({ error: "Erro ao importar igrejas" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx playwright test e2e/churches-import.spec.ts`
Expected: 2 passed

- [ ] **Step 6: Commit**

```bash
git add src/app/api/churches/route.ts src/app/api/churches/import/route.ts e2e/churches-import.spec.ts
git commit -m "feat(api): lista e importação de igrejas (Church)"
```

---

### Task 5: API — atribuir dupla e redistribuir

**Files:**
- Create: `src/app/api/churches/[id]/assignments/route.ts`
- Test: `e2e/churches-assignments.spec.ts`

**Interfaces:**
- Consumes: `assertDistinctMembers` (`@/lib/churches`, Task 3).
- Produces: `POST /api/churches/:id/assignments` body `{ member1Id: string; member2Id: string }` → `{ id: string }` (novo `ChurchAssignment`, status `PENDENTE`). Consumido pelo modal de atribuição (Task 7).

- [ ] **Step 1: Escrever o teste e2e**

```typescript
// e2e/churches-assignments.spec.ts
import { test, expect } from "@playwright/test";

test.describe("API /api/churches/:id/assignments", () => {
  test("sem sessão retorna 401", async ({ request }) => {
    const res = await request.post("/api/churches/algum-id/assignments", {
      data: { member1Id: "a", member2Id: "b" },
    });
    expect(res.status()).toBe(401);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx playwright test e2e/churches-assignments.spec.ts`
Expected: FAIL (404, rota não existe)

- [ ] **Step 3: Implementar `src/app/api/churches/[id]/assignments/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { assertDistinctMembers } from "@/lib/churches";

const assignSchema = z.object({
  member1Id: z.string().min(1),
  member2Id: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem atribuir duplas" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { member1Id, member2Id } = parsed.data;

    try {
      assertDistinctMembers(member1Id, member2Id);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Dupla inválida" }, { status: 400 });
    }

    const { db, cid: CID } = getCampaignContext(session);

    const church = await db.church.findFirst({ where: { id: params.id, campaignId: CID }, select: { id: true } });
    if (!church) {
      return NextResponse.json({ error: "Igreja não encontrada" }, { status: 404 });
    }

    const [m1, m2] = await Promise.all([
      db.collaborator.findFirst({ where: { id: member1Id, campaignId: CID }, select: { id: true } }),
      db.collaborator.findFirst({ where: { id: member2Id, campaignId: CID }, select: { id: true } }),
    ]);
    if (!m1 || !m2) {
      return NextResponse.json({ error: "Colaborador inválido" }, { status: 400 });
    }

    const assignment = await db.churchAssignment.create({
      data: {
        churchId: church.id,
        member1Id,
        member2Id,
        assignedById: session.user.id,
        status: "PENDENTE",
      },
      select: { id: true },
    });

    return NextResponse.json({ id: assignment.id }, { status: 201 });
  } catch (err) {
    console.error("[api/churches/:id/assignments] erro:", err);
    return NextResponse.json({ error: "Erro ao atribuir dupla" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx playwright test e2e/churches-assignments.spec.ts`
Expected: 1 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/api/churches/[id]/assignments/route.ts e2e/churches-assignments.spec.ts
git commit -m "feat(api): atribuição/redistribuição de dupla por igreja"
```

---

### Task 6: API — upload de foto de entrega

**Files:**
- Create: `src/app/api/churches/upload-photo/route.ts`

**Interfaces:**
- Produces: `POST /api/churches/upload-photo` (multipart, campo `file`) → `{ url: string }`. Consumido pela página `/minhas-igrejas` (Task 9).

- [ ] **Step 1: Implementar (mirror de `src/app/api/zapi/upload/route.ts`, sem restrição de ADMIN — quem envia é a própria dupla)**

```typescript
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = /^image\//;

/**
 * Upload de foto de comprovação de entrega VIA SERVIDOR — mesmo padrão do
 * upload de mídia do WhatsApp (evita o PUT direto do navegador pro Blob,
 * que já travou em silêncio por causa de CSP/CORS neste projeto).
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[churches/upload-photo] BLOB_READ_WRITE_TOKEN ausente");
    return NextResponse.json(
      { error: "Armazenamento de mídia indisponível. Tente novamente mais tarde." },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requisição inválida (esperado multipart/form-data)" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  }
  if (!ALLOWED.test(file.type)) {
    return NextResponse.json({ error: `Tipo não suportado: ${file.type || "desconhecido"}. Envie uma foto.` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Foto acima de 8MB" }, { status: 400 });
  }

  try {
    const safeName = (file.name || "entrega").replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`church-deliveries/${safeName}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
      contentType: file.type || undefined,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha no upload";
    console.error("[churches/upload-photo] %s", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Verificação manual (upload real exige `BLOB_READ_WRITE_TOKEN` de produção — não dá pra rodar local sem o env de prod)**

Documentar no PR: testar no Vercel preview enviando uma foto pela tela `/minhas-igrejas` (Task 9) e conferir que a URL retornada abre publicamente (mesmo smoke test já usado pro upload do WhatsApp: `curl` na URL retornada deve dar HTTP 200 sem autenticação).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/churches/upload-photo/route.ts
git commit -m "feat(api): upload de foto de comprovação via servidor"
```

---

### Task 7: API — marcar entregue / não foi possível / minhas atribuições

**Files:**
- Create: `src/app/api/church-assignments/mine/route.ts`
- Create: `src/app/api/church-assignments/[id]/route.ts`
- Test: `e2e/church-assignments-mine.spec.ts`

**Interfaces:**
- Consumes: nada de tasks anteriores além do schema.
- Produces: `GET /api/church-assignments/mine` → `{ data: MyAssignment[] }` (assignments do colaborador logado com status ≠ `ENTREGUE`); `PATCH /api/church-assignments/:id` body `{ status: "ENTREGUE"; photoUrl: string } | { status: "NAO_FOI_POSSIVEL"; notes?: string }` → `{ ok: true }`. Ambos consumidos pela página `/minhas-igrejas` (Task 9).

- [ ] **Step 1: Escrever o teste e2e**

```typescript
// e2e/church-assignments-mine.spec.ts
import { test, expect } from "@playwright/test";

test.describe("API /api/church-assignments", () => {
  test("GET /mine sem sessão retorna 401", async ({ request }) => {
    const res = await request.get("/api/church-assignments/mine");
    expect(res.status()).toBe(401);
  });

  test("PATCH /:id sem sessão retorna 401", async ({ request }) => {
    const res = await request.patch("/api/church-assignments/algum-id", {
      data: { status: "ENTREGUE", photoUrl: "https://example.com/foto.jpg" },
    });
    expect(res.status()).toBe(401);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx playwright test e2e/church-assignments-mine.spec.ts`
Expected: FAIL (404)

- [ ] **Step 3: Implementar `src/app/api/church-assignments/mine/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { db } = getCampaignContext(session);

    const collaborator = await db.collaborator.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!collaborator) {
      return NextResponse.json({ data: [] });
    }

    const assignments = await db.churchAssignment.findMany({
      where: {
        status: { not: "ENTREGUE" },
        OR: [{ member1Id: collaborator.id }, { member2Id: collaborator.id }],
      },
      include: {
        church: { select: { id: true, name: true, regional: true } },
        member1: { select: { id: true, name: true } },
        member2: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: assignments });
  } catch (err) {
    console.error("[api/church-assignments/mine] erro:", err);
    return NextResponse.json({ error: "Erro ao listar suas igrejas" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implementar `src/app/api/church-assignments/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

const patchSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ENTREGUE"), photoUrl: z.string().url() }),
  z.object({ status: z.literal("NAO_FOI_POSSIVEL"), notes: z.string().max(500).optional() }),
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }

    const { db } = getCampaignContext(session);

    const collaborator = await db.collaborator.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!collaborator) {
      return NextResponse.json({ error: "Colaborador não encontrado para este usuário" }, { status: 403 });
    }

    const assignment = await db.churchAssignment.findUnique({
      where: { id: params.id },
      select: { member1Id: true, member2Id: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: "Atribuição não encontrada" }, { status: 404 });
    }
    if (assignment.member1Id !== collaborator.id && assignment.member2Id !== collaborator.id) {
      return NextResponse.json({ error: "Você não faz parte desta dupla" }, { status: 403 });
    }

    const data = parsed.data;
    await db.churchAssignment.update({
      where: { id: params.id },
      data:
        data.status === "ENTREGUE"
          ? { status: "ENTREGUE", photoUrl: data.photoUrl, deliveredAt: new Date(), notes: null }
          : { status: "NAO_FOI_POSSIVEL", notes: data.notes?.trim() || null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/church-assignments/:id] erro:", err);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx playwright test e2e/church-assignments-mine.spec.ts`
Expected: 2 passed

- [ ] **Step 6: Commit**

```bash
git add src/app/api/church-assignments/mine/route.ts src/app/api/church-assignments/[id]/route.ts e2e/church-assignments-mine.spec.ts
git commit -m "feat(api): marcar entregue/não foi possível e listar minhas igrejas"
```

---

### Task 8: Componente — modal de importação de planilha

**Files:**
- Create: `src/components/churches/import-churches-dialog.tsx`

**Interfaces:**
- Consumes: `POST /api/churches/import` (Task 4), `normalizeRegional` (`@/lib/churches`, Task 3), `xlsx` package (já usado em `src/components/collaborators/import-csv-dialog.tsx`).
- Produces: `<ImportChurchesDialog open onOpenChange onSuccess />` — usado pela página `/igrejas` (Task 10).

- [ ] **Step 1: Implementar (mesmo fluxo upload → preview → done de `import-csv-dialog.tsx`, com um passo extra de revisão de regionais)**

```tsx
"use client";

import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { normalizeRegional } from "@/lib/churches";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void };
type Step = "upload" | "review" | "done";
type Row = { name: string; regional: string };

function parseFile(file: File): Promise<Row[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const rows: Row[] = json
          .map((r) => {
            const keys = Object.keys(r);
            const nameKey = keys.find((k) => /congrega|nome/i.test(k)) ?? keys[0];
            const regionalKey = keys.find((k) => /regional/i.test(k)) ?? keys[1];
            return { name: String(r[nameKey] ?? "").trim(), regional: String(r[regionalKey] ?? "").trim() };
          })
          .filter((r) => r.name && r.regional);
        resolve(rows);
      } catch {
        reject(new Error("Falha ao ler o arquivo. Verifique se é um XLSX válido com colunas de congregação e regional."));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

export function ImportChurchesDialog({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<Row[]>([]);
  const [denominacao, setDenominacao] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setRows([]);
    setDenominacao("");
    setImporting(false);
    setError("");
    setResult(null);
  }
  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleFile(file: File) {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
      setError("Apenas arquivos .xlsx, .xls ou .csv são aceitos");
      return;
    }
    setError("");
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) { setError("Nenhuma linha com congregação + regional encontrada."); return; }
      setRows(parsed);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
    }
  }

  const regionalCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = normalizeRegional(r.regional);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  async function handleImport() {
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/churches/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, denominacao: denominacao.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao importar"); setImporting(false); return; }
      setResult(data);
      setStep("done");
      onSuccess();
    } catch {
      setError("Erro de conexão");
    }
    setImporting(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" /> Importar Congregações
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-white/[0.12] rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Clique para selecionar a planilha</p>
              <p className="text-xs text-muted-foreground mt-1">Colunas: nome da congregação + regional</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
            </div>
            {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{rows.length} congregações encontradas</p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Denominação (opcional, vale para todas as linhas)</label>
              <input
                type="text"
                value={denominacao}
                onChange={(e) => setDenominacao(e.target.value)}
                placeholder="Ex: Assembleia de Deus"
                className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
              />
            </div>

            <div className="rounded-xl border border-white/[0.08] p-3 space-y-1 max-h-64 overflow-y-auto">
              <p className="text-xs font-medium text-foreground/70 mb-2">Regionais detectados — confira antes de importar</p>
              {regionalCounts.map(([regional, count]) => (
                <div key={regional} className="flex items-center justify-between text-xs py-1">
                  <span className="text-foreground/80">{regional}</span>
                  <span className="text-muted-foreground">{count} congregaç{count !== 1 ? "ões" : "ão"}</span>
                </div>
              ))}
            </div>

            {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Trocar arquivo</Button>
              <Button onClick={handleImport} disabled={importing} className="bg-primary text-primary-foreground gap-2">
                <Upload className="w-4 h-4" />
                {importing ? "Importando..." : `Importar ${rows.length} congregações`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
            <p className="text-lg font-bold text-foreground">Importação concluída</p>
            <p className="text-sm text-muted-foreground">
              {result.created} criada{result.created !== 1 ? "s" : ""}
              {result.skipped > 0 && ` · ${result.skipped} já existiam (ignoradas)`}
            </p>
            <Button onClick={() => handleClose(false)} className="bg-primary text-primary-foreground">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificação manual**

Rodar `next dev` local (não precisa de banco pra renderizar o componente isoladamente — mas o submit final precisa do Vercel preview). Verificar: arrastar/selecionar a planilha real (`lista assembleia de deus - curitiba.xlsx`) mostra 165 linhas e 12 regionais na tela de revisão, incluindo a variação de case ("Santa Felicidade" aparecendo uma vez só, count 11, já deduplicada visualmente pela normalização).

- [ ] **Step 3: Commit**

```bash
git add src/components/churches/import-churches-dialog.tsx
git commit -m "feat(ui): modal de importação de planilha de congregações"
```

---

### Task 9: Componente — modal de atribuição de dupla

**Files:**
- Create: `src/components/churches/assign-dialog.tsx`

**Interfaces:**
- Consumes: `GET /api/collaborators?q=&status=ALL` (rota já existente), `POST /api/churches/:id/assignments` (Task 5).
- Produces: `<AssignDialog open churchId churchName onOpenChange onSuccess />` — usado pela página `/igrejas` (Task 10).

- [ ] **Step 1: Implementar (2 buscas independentes, mesmo padrão debounced de `src/app/(dashboard)/agenda/page.tsx:628-641`)**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, X, AlertCircle } from "lucide-react";

type Collab = { id: string; name: string };
type Props = {
  open: boolean;
  churchId: string;
  churchName: string;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
};

function CollaboratorSearch({
  label, selected, exclude, onSelect,
}: {
  label: string;
  selected: Collab | null;
  exclude: string | undefined;
  onSelect: (c: Collab | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Collab[]>([]);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/collaborators?q=${encodeURIComponent(query)}&status=ALL`);
      if (r.ok) {
        const j = await r.json();
        const data: Collab[] = (j.data ?? j).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
        setResults(data.filter((c) => c.id !== exclude).slice(0, 8));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, exclude]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-primary/10 border border-primary/25">
        <span className="text-sm text-foreground">{selected.name}</span>
        <button onClick={() => onSelect(null)} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar colaborador pelo nome"
        className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
      />
      {results.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); setQuery(""); setResults([]); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary border-b border-border last:border-0"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AssignDialog({ open, churchId, churchName, onOpenChange, onSuccess }: Props) {
  const [member1, setMember1] = useState<Collab | null>(null);
  const [member2, setMember2] = useState<Collab | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleClose(v: boolean) {
    if (!v) { setMember1(null); setMember2(null); setError(""); }
    onOpenChange(v);
  }

  async function handleSave() {
    if (!member1 || !member2) { setError("Selecione as 2 pessoas da dupla."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/churches/${churchId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member1Id: member1.id, member2Id: member2.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao atribuir"); setSaving(false); return; }
      onSuccess();
      handleClose(false);
    } catch {
      setError("Erro de conexão");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Atribuir dupla — {churchName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <CollaboratorSearch label="Primeira pessoa" selected={member1} exclude={member2?.id} onSelect={setMember1} />
          <CollaboratorSearch label="Segunda pessoa" selected={member2} exclude={member1?.id} onSelect={setMember2} />
          {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? "Salvando..." : "Atribuir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificação manual**

No Vercel preview: abrir `/igrejas` (Task 10), atribuir dupla numa igreja, confirmar que a mesma pessoa não pode ser escolhida duas vezes (campo já selecionado some da lista de busca do outro campo via `exclude`).

- [ ] **Step 3: Commit**

```bash
git add src/components/churches/assign-dialog.tsx
git commit -m "feat(ui): modal de atribuição de dupla por igreja"
```

---

### Task 10: Página admin `/igrejas`

**Files:**
- Create: `src/app/(dashboard)/igrejas/page.tsx`

**Interfaces:**
- Consumes: `GET /api/churches` (Task 4), `ImportChurchesDialog` (Task 8), `AssignDialog` (Task 9).

- [ ] **Step 1: Implementar**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Upload, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportChurchesDialog } from "@/components/churches/import-churches-dialog";
import { AssignDialog } from "@/components/churches/assign-dialog";

type Assignment = {
  status: "PENDENTE" | "ENTREGUE" | "NAO_FOI_POSSIVEL";
  member1: { name: string };
  member2: { name: string };
};
type Church = {
  id: string;
  name: string;
  regional: string | null;
  denominacao: string | null;
  latestAssignment: Assignment | null;
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  ENTREGUE: "Entregue",
  NAO_FOI_POSSIVEL: "Não foi possível",
};
const STATUS_COLOR: Record<string, string> = {
  PENDENTE: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  ENTREGUE: "bg-green-500/15 text-green-400 border-green-500/30",
  NAO_FOI_POSSIVEL: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function IgrejasPage() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [regionalFilter, setRegionalFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Church | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (regionalFilter) params.set("regional", regionalFilter);
    const res = await fetch(`/api/churches?${params}`);
    if (res.ok) {
      const j = await res.json();
      setChurches(j.data);
    }
    setLoading(false);
  }, [regionalFilter]);

  useEffect(() => { load(); }, [load]);

  const regionais = Array.from(new Set(churches.map((c) => c.regional).filter(Boolean))) as string[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          <h1 className="text-xl lg:text-2xl font-bold gradient-title">Igrejas</h1>
        </div>
        <Button onClick={() => setImportOpen(true)} className="bg-primary text-primary-foreground gap-2">
          <Upload className="w-4 h-4" /> Importar planilha
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setRegionalFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs border ${!regionalFilter ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
        >
          Todas
        </button>
        {regionais.map((r) => (
          <button
            key={r}
            onClick={() => setRegionalFilter(r)}
            className={`px-3 py-1.5 rounded-full text-xs border ${regionalFilter === r ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]" style={{ background: "rgba(13,27,42,0.5)" }}>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Congregação</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Regional</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Status</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Dupla</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : churches.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhuma igreja importada ainda.</td></tr>
            ) : (
              churches.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-foreground">{c.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.regional ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLOR[c.latestAssignment?.status ?? "SEM_DUPLA"] ?? "border-border text-muted-foreground"}`}>
                      {c.latestAssignment ? STATUS_LABEL[c.latestAssignment.status] : "Sem dupla"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {c.latestAssignment ? `${c.latestAssignment.member1.name} + ${c.latestAssignment.member2.name}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="sm" variant="outline" onClick={() => setAssignTarget(c)} className="gap-1.5">
                      {c.latestAssignment?.status === "NAO_FOI_POSSIVEL" ? <RefreshCw className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                      {c.latestAssignment ? "Redistribuir" : "Atribuir dupla"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ImportChurchesDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={load} />
      {assignTarget && (
        <AssignDialog
          open={!!assignTarget}
          churchId={assignTarget.id}
          churchName={assignTarget.name}
          onOpenChange={(v) => !v && setAssignTarget(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificação manual no Vercel preview**

Checklist: (1) importar a planilha real → 165 igrejas aparecem; (2) filtro por regional funciona; (3) atribuir dupla numa igreja sem dupla → status vira "Pendente" com os 2 nomes; (4) reimportar a mesma planilha → 0 criadas, 165 puladas (dedup).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/igrejas/page.tsx"
git commit -m "feat(ui): página admin /igrejas (lista, filtro, atribuição)"
```

---

### Task 11: Página `/minhas-igrejas` (dupla no celular)

**Files:**
- Create: `src/app/(dashboard)/minhas-igrejas/page.tsx`

**Interfaces:**
- Consumes: `GET /api/church-assignments/mine` (Task 7), `POST /api/churches/upload-photo` (Task 6), `PATCH /api/church-assignments/:id` (Task 7).

- [ ] **Step 1: Implementar**

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Church, Camera, X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type MyAssignment = {
  id: string;
  status: "PENDENTE" | "NAO_FOI_POSSIVEL";
  church: { id: string; name: string; regional: string | null };
};

export default function MinhasIgrejasPage() {
  const [assignments, setAssignments] = useState<MyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/church-assignments/mine");
    if (res.ok) {
      const j = await res.json();
      setAssignments(j.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCamera(assignmentId: string) {
    setActiveId(assignmentId);
    fileInputRef.current?.click();
  }

  async function handlePhoto(file: File) {
    if (!activeId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/churches/upload-photo", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { toast.error(uploadData.error ?? "Erro ao enviar foto"); return; }

      const patchRes = await fetch(`/api/church-assignments/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ENTREGUE", photoUrl: uploadData.url }),
      });
      if (!patchRes.ok) { const d = await patchRes.json(); toast.error(d.error ?? "Erro ao marcar entregue"); return; }

      toast.success("Entrega registrada!");
      setAssignments((prev) => prev.filter((a) => a.id !== activeId));
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setUploading(false);
      setActiveId(null);
    }
  }

  async function handleNotPossible(assignmentId: string) {
    const res = await fetch(`/api/church-assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "NAO_FOI_POSSIVEL", notes: notes.trim() || undefined }),
    });
    if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Erro ao registrar"); return; }
    toast.success("Registrado. Você pode tentar de novo depois.");
    setNotesFor(null);
    setNotes("");
    load();
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Church className="w-6 h-6 text-primary" />
        <h1 className="text-xl lg:text-2xl font-bold gradient-title">Minhas Igrejas</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">Congregações atribuídas a você para entrega de material.</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handlePhoto(e.target.files[0]); }}
      />

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : assignments.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhuma igreja pendente. 🎉</p>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a.id} className="glass-card rounded-2xl p-4 space-y-3 border border-white/[0.08]">
              <div>
                <p className="font-semibold text-foreground">{a.church.name}</p>
                {a.church.regional && <p className="text-xs text-muted-foreground">{a.church.regional}</p>}
                {a.status === "NAO_FOI_POSSIVEL" && (
                  <p className="text-xs text-amber-400 mt-1">Tentativa anterior não deu certo — pode tentar de novo.</p>
                )}
              </div>

              {notesFor === a.id ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Motivo (opcional): igreja fechada, ninguém atendeu..."
                    className="w-full rounded-lg px-3 py-2 text-sm bg-secondary border border-border outline-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setNotesFor(null); setNotes(""); }}
                      className="flex-1 py-2 rounded-lg text-sm text-muted-foreground border border-border"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleNotPossible(a.id)}
                      className="flex-1 py-2 rounded-lg text-sm bg-destructive/10 text-destructive border border-destructive/25"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => openCamera(a.id)}
                    disabled={uploading && activeId === a.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60"
                  >
                    {uploading && activeId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    Marcar entregue
                  </button>
                  <button
                    onClick={() => setNotesFor(a.id)}
                    className="px-3 py-2.5 rounded-xl text-sm text-muted-foreground border border-border"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificação manual no Vercel preview**

Checklist: (1) logar como colaborador que é `member1` ou `member2` de uma atribuição → vê a igreja na lista; (2) "Marcar entregue" sem foto é impossível (o input `file` é obrigatório para chegar no upload); (3) marcar "não foi possível" → item continua na lista com o aviso de tentativa anterior; (4) marcar entregue com foto → item some da lista.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/minhas-igrejas/page.tsx"
git commit -m "feat(ui): página /minhas-igrejas (marcar entrega com foto)"
```

---

### Task 12: Sidebar

**Files:**
- Modify: `src/components/sidebar.tsx`

- [ ] **Step 1: Adicionar os 2 itens ao array `navItems`**

Em `src/components/sidebar.tsx:21-41`, importar os ícones novos na linha 7-11 (adicionar `Church` à lista de imports do `lucide-react`), e adicionar duas linhas:

```typescript
  { href: "/minhas-igrejas", icon: Church,    label: "Minhas Igrejas", minRole: "MEMBER", superAdminOnly: false },
```

logo após a linha do `/celulas` (grupo "Base", visível a qualquer colaborador), e:

```typescript
  { href: "/igrejas",        icon: Building2, label: "Igrejas",        minRole: "ADMIN",  superAdminOnly: false },
```

logo após a linha do `/convites` (grupo "Administração"). `Building2` já está importado (linha 9); só falta adicionar `Church` ao import.

- [ ] **Step 2: Verificação manual**

No Vercel preview: logar como MEMBER → vê "Minhas Igrejas" no grupo Base, não vê "Igrejas". Logar como ADMIN → vê os dois.

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat(ui): adiciona Minhas Igrejas e Igrejas ao menu"
```

---

## Self-Review

**Spec coverage:**
- Modelo de dados (`Church`/`ChurchAssignment`, member1/member2 diretos, regional/denominação texto livre) → Task 1.
- Espelho de tenant provisioning → Task 2.
- Normalização/dedup de planilha → Task 3.
- Importação (com denominação por lote, review de regionais) → Tasks 4, 8.
- Atribuição/redistribuição pelo admin (qualquer colaborador, `member1Id !== member2Id`) → Tasks 5, 9, 10.
- Upload de foto via servidor → Task 6.
- Marcar entregue (foto obrigatória)/não foi possível (mesma dupla pode tentar de novo) → Task 7, 11.
- Onboarding de pessoas novas → **não precisa de task de código**: reaproveita `/convites` já existente, mencionado explicitamente no plano como pré-requisito operacional, não uma lacuna de implementação.
- Sidebar → Task 12.
- Fora de escopo (fila offline, estoque, dashboard de cobertura, Zone pra regional) → conscientemente omitido, nenhuma task cobre isso.

**Placeholder scan:** nenhum "TBD"/"implement later" encontrado; todo passo de código tem o código completo.

**Type consistency:** `ChurchAssignmentStatus` usado igual em todas as tasks (`PENDENTE | ENTREGUE | NAO_FOI_POSSIVEL`); `member1Id`/`member2Id` (não `memberOneId` nem variações) consistente do schema (Task 1) até a UI (Tasks 9-11); `getCampaignContext(session)` retorna sempre `{ db, cid }` em todas as rotas.

---

**Plano completo e salvo em `docs/superpowers/plans/2026-07-20-equipes-distribuicao-igrejas.md`.**
