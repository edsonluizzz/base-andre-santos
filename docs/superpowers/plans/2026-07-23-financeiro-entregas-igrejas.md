# Relatório Financeiro de Entregas (Igrejas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao admin uma aba "Financeiro" dentro de `/igrejas` que calcula, por colaborador, quanto
é devido pelas entregas confirmadas (`ChurchAssignment.status = ENTREGUE`) e permite marcar
pagamentos como feitos, sem contar de novo depois.

**Architecture:** Reaproveita `ChurchAssignment` (novos campos `member1PaidAt`/`member2PaidAt`) e
`Settings` (novo campo `deliveryPaymentValue`, singleton já existente). Sem tabela nova. Uma
função helper compartilhada (`markAssignmentMemberPaid`) concentra a regra "só marca pago se
ENTREGUE e ainda não pago", usada tanto pelo endpoint de pagamento individual quanto pelo de
pagamento em lote — evita duplicar a regra de negócio (ver `[[ponytail]]`: root-cause fix, uma
função só, não uma cópia por caller).

**Tech Stack:** Next.js 14 App Router (route handlers), Prisma 7 + Neon Postgres, Zod, React
client components (sem framework de estado extra), Playwright (e2e, só roda no CI).

## Global Constraints

- Spec de referência: `docs/superpowers/specs/2026-07-23-financeiro-entregas-igrejas-design.md`.
  Qualquer dúvida sobre escopo, esse arquivo é a fonte da verdade.
- Escopo é só o módulo Igrejas — nada de "material" fora de `ChurchAssignment`.
- Pagamento é por **membro** (não por dupla): cada um dos 2 recebe o valor individualmente.
- Valor é **fixo global**, guardado em `Settings.deliveryPaymentValue` (Float — projeto não usa
  `Decimal` em nenhum outro lugar do schema, não vale a pena introduzir agora).
- Sem tabela `Payment` nova — usa timestamps `memberXPaidAt` direto em `ChurchAssignment`.
- **Nunca rode `npm install` na pasta do Drive**
  (`G:\Meu Drive\PROJETOS IA - EDSON\BASE ANDRE SANTOS - OVILE`) — Google Drive corrompe/falha
  com muitos arquivos pequenos. `node_modules` já existe lá, não mexer nisso.
- **Toda validação local (`prisma validate`, `prisma generate`, `tsc --noEmit`, `next lint`) roda
  no clone `C:\dev\ovile-local`**, nunca na pasta do Drive. Fluxo por task: commitar no repo do
  Drive → `git push` → `cd /c/dev/ovile-local && git pull` → rodar validação lá.
- **Nunca rode `npx playwright test` localmente** — o `webServer` depende de `npm run build`
  (que roda `prisma db push` contra um Postgres real). Os specs novos só são exercitados no CI
  (`.github/workflows/deploy-guardian.yml`). Escrever o spec e confiar na revisão de código +
  CI, não tentar rodar localmente.
- Trabalhar numa branch de feature (`feat/financeiro-entregas-igrejas`), seguindo o padrão já
  usado no módulo de Igrejas (revisão de branch completo antes do push final pra `main`).
- Padrão de API já estabelecido (seguir sempre): `auth()` → checar `session.user.id` (401) →
  checar `session.user.role === "ADMIN"` quando aplicável (403) → `getCampaignContext(session)`
  pra obter `{ db, cid }` → filtrar tudo por `campaignId`/`cid`.

---

## Setup: criar branch de feature

- [ ] **Passo 1: Criar e trocar para a branch, no repo do Drive**

```bash
cd "G:/Meu Drive/PROJETOS IA - EDSON/BASE ANDRE SANTOS - OVILE"
git checkout -b feat/financeiro-entregas-igrejas
```

- [ ] **Passo 2: Confirmar branch ativa**

Run: `git branch --show-current`
Expected: `feat/financeiro-entregas-igrejas`

---

### Task 1: Schema — valor de pagamento e timestamps de pagamento

**Files:**
- Modify: `prisma/schema.prisma:435-442` (model `Settings`)
- Modify: `prisma/schema.prisma:599-620` (model `ChurchAssignment`)

**Interfaces:**
- Produces: `Settings.deliveryPaymentValue: number` (Float, default 10). `ChurchAssignment.member1PaidAt: Date | null`, `ChurchAssignment.member2PaidAt: Date | null`. Todas as tasks seguintes leem/escrevem esses campos via `db.settings` / `db.churchAssignment` do Prisma Client já tipado.

- [ ] **Step 1: Editar `model Settings`**

Estado atual (`prisma/schema.prisma:435-442`):

```prisma
model Settings {
  id                  String   @id @default("singleton")
  campaignName        String   @default("Base Andre Santos")
  logoBase64          String?  @db.Text
  googleRefreshToken  String?  @db.Text
  whatsappGroupLink   String?  // Link de convite do grupo WhatsApp de apoiadores
  updatedAt           DateTime @updatedAt
}
```

Novo conteúdo:

```prisma
model Settings {
  id                   String   @id @default("singleton")
  campaignName         String   @default("Base Andre Santos")
  logoBase64           String?  @db.Text
  googleRefreshToken   String?  @db.Text
  whatsappGroupLink    String?  // Link de convite do grupo WhatsApp de apoiadores
  deliveryPaymentValue Float    @default(10) // R$ por entrega confirmada (ChurchAssignment ENTREGUE), por membro da dupla
  updatedAt            DateTime @updatedAt
}
```

- [ ] **Step 2: Editar `model ChurchAssignment`**

Estado atual (`prisma/schema.prisma:599-620`):

```prisma
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
```

Novo conteúdo:

```prisma
model ChurchAssignment {
  id            String                 @id @default(cuid())
  churchId      String
  status        ChurchAssignmentStatus @default(PENDENTE)
  photoUrl      String?                @db.Text
  notes         String?
  assignedById  String
  member1Id     String
  member2Id     String
  deliveredAt   DateTime?
  member1PaidAt DateTime? // null = pendente de pagamento; preenchido = pago (timestamp = auditoria)
  member2PaidAt DateTime?
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt

  church  Church       @relation(fields: [churchId], references: [id], onDelete: Cascade)
  member1 Collaborator @relation("AssignmentMember1", fields: [member1Id], references: [id], onDelete: Cascade)
  member2 Collaborator @relation("AssignmentMember2", fields: [member2Id], references: [id], onDelete: Cascade)

  @@index([churchId])
  @@index([status])
  @@index([member1Id])
  @@index([member2Id])
}
```

- [ ] **Step 3: Commit e push (repo do Drive)**

```bash
cd "G:/Meu Drive/PROJETOS IA - EDSON/BASE ANDRE SANTOS - OVILE"
git add prisma/schema.prisma
git commit -m "feat(schema): valor de pagamento por entrega e timestamps de pagamento por membro"
git push -u origin feat/financeiro-entregas-igrejas
```

- [ ] **Step 4: Validar no clone local**

```bash
cd /c/dev/ovile-local
git fetch origin
git checkout feat/financeiro-entregas-igrejas
npx prisma validate
npx prisma generate
```

Expected: `The schema at prisma/schema.prisma is valid 🚀` e geração do client sem erro (novos
campos `deliveryPaymentValue`, `member1PaidAt`, `member2PaidAt` disponíveis no client tipado).

---

### Task 2: Helper de pagamento + endpoint individual

**Files:**
- Create: `src/lib/church-payments.ts`
- Create: `src/app/api/church-assignments/[id]/pay/route.ts`

**Interfaces:**
- Consumes: `getCampaignContext(session)` de `src/lib/campaign-context.ts` (já existe) →
  `{ db: PrismaClient, cid: string }`. `auth()` de `src/lib/auth.ts` (já existe).
- Produces: `markAssignmentMemberPaid(db: PrismaClient, assignmentId: string, member: "member1" | "member2", campaignId: string): Promise<{ ok: true } | { ok: false; error: string; status: number }>` — usada por este endpoint e pelo endpoint em lote (Task 3).

- [ ] **Step 1: Criar `src/lib/church-payments.ts`**

```ts
import type { PrismaClient } from "@prisma/client";

export type MemberSlot = "member1" | "member2";

export type MarkPaidResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function markAssignmentMemberPaid(
  db: PrismaClient,
  assignmentId: string,
  member: MemberSlot,
  campaignId: string,
): Promise<MarkPaidResult> {
  const assignment = await db.churchAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      status: true,
      member1PaidAt: true,
      member2PaidAt: true,
      church: { select: { campaignId: true } },
    },
  });
  if (!assignment || assignment.church.campaignId !== campaignId) {
    return { ok: false, error: "Atribuição não encontrada", status: 404 };
  }
  if (assignment.status !== "ENTREGUE") {
    return { ok: false, error: "Só é possível marcar como pago uma entrega confirmada", status: 400 };
  }

  const alreadyPaid = member === "member1" ? assignment.member1PaidAt : assignment.member2PaidAt;
  if (alreadyPaid) return { ok: true };

  await db.churchAssignment.update({
    where: { id: assignmentId },
    data: member === "member1" ? { member1PaidAt: new Date() } : { member2PaidAt: new Date() },
  });
  return { ok: true };
}
```

- [ ] **Step 2: Criar `src/app/api/church-assignments/[id]/pay/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { markAssignmentMemberPaid } from "@/lib/church-payments";

const bodySchema = z.object({ member: z.enum(["member1", "member2"]) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem marcar pagamento" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { db, cid: CID } = getCampaignContext(session);
    const result = await markAssignmentMemberPaid(db, params.id, parsed.data.member, CID);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/church-assignments/:id/pay] erro:", err);
    return NextResponse.json({ error: "Erro ao marcar pagamento" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit e push**

```bash
cd "G:/Meu Drive/PROJETOS IA - EDSON/BASE ANDRE SANTOS - OVILE"
git add src/lib/church-payments.ts "src/app/api/church-assignments/[id]/pay/route.ts"
git commit -m "feat(api): endpoint pra marcar entrega individual como paga"
git push
```

- [ ] **Step 4: Validar no clone local**

```bash
cd /c/dev/ovile-local
git pull
npx tsc --noEmit
```

Expected: sem erros de tipo (o helper e a rota compilam contra os tipos gerados na Task 1).

---

### Task 3: Endpoint de pagamento em lote por colaborador

**Files:**
- Create: `src/app/api/church-assignments/pay-bulk/route.ts`

**Interfaces:**
- Consumes: `markAssignmentMemberPaid` de `src/lib/church-payments.ts` (Task 2).
- Produces: `POST /api/church-assignments/pay-bulk` com body `{ collaboratorId: string }`, resposta `{ ok: true, count: number }`.

- [ ] **Step 1: Criar `src/app/api/church-assignments/pay-bulk/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { markAssignmentMemberPaid } from "@/lib/church-payments";

const bodySchema = z.object({ collaboratorId: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem marcar pagamento" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const { collaboratorId } = parsed.data;
    const { db, cid: CID } = getCampaignContext(session);

    const pending = await db.churchAssignment.findMany({
      where: {
        status: "ENTREGUE",
        church: { campaignId: CID },
        OR: [
          { member1Id: collaboratorId, member1PaidAt: null },
          { member2Id: collaboratorId, member2PaidAt: null },
        ],
      },
      select: { id: true, member1Id: true },
    });

    for (const a of pending) {
      const member = a.member1Id === collaboratorId ? "member1" : "member2";
      await markAssignmentMemberPaid(db, a.id, member, CID);
    }

    return NextResponse.json({ ok: true, count: pending.length });
  } catch (err) {
    console.error("[api/church-assignments/pay-bulk] erro:", err);
    return NextResponse.json({ error: "Erro ao marcar pagamentos" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit e push**

```bash
cd "G:/Meu Drive/PROJETOS IA - EDSON/BASE ANDRE SANTOS - OVILE"
git add "src/app/api/church-assignments/pay-bulk/route.ts"
git commit -m "feat(api): endpoint pra marcar todas as entregas pendentes de um colaborador como pagas"
git push
```

- [ ] **Step 3: Validar no clone local**

```bash
cd /c/dev/ovile-local
git pull
npx tsc --noEmit
```

Expected: sem erros de tipo.

---

### Task 4: Endpoint agregado do relatório financeiro

**Files:**
- Create: `src/app/api/church-assignments/payments/route.ts`

**Interfaces:**
- Consumes: `db.settings`, `db.churchAssignment` (Prisma Client, campos da Task 1).
- Produces: `GET /api/church-assignments/payments` retornando:
  ```ts
  {
    rate: number;
    collaborators: {
      collaboratorId: string; name: string;
      deliveredCount: number; paidCount: number; pendingCount: number;
      amountPending: number; amountPaid: number;
      pendingAssignments: { assignmentId: string; churchName: string; deliveredAt: string | null; member: "member1" | "member2" }[];
    }[];
    totals: { amountPending: number; amountPaid: number };
  }
  ```
  Este é o shape consumido pelo componente da Task 6 (`FinanceiroTab`).

- [ ] **Step 1: Criar `src/app/api/church-assignments/payments/route.ts`**

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

type PendingAssignment = {
  assignmentId: string;
  churchName: string;
  deliveredAt: string | null;
  member: "member1" | "member2";
};
type CollaboratorRow = {
  collaboratorId: string;
  name: string;
  deliveredCount: number;
  paidCount: number;
  pendingCount: number;
  amountPending: number;
  amountPaid: number;
  pendingAssignments: PendingAssignment[];
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem ver o financeiro" }, { status: 403 });
    }

    const { db, cid: CID } = getCampaignContext(session);

    const settings = await db.settings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton", campaignName: "Base Andre Santos", updatedAt: new Date() },
      select: { deliveryPaymentValue: true },
    });
    const rate = settings.deliveryPaymentValue;

    const assignments = await db.churchAssignment.findMany({
      where: { status: "ENTREGUE", church: { campaignId: CID } },
      select: {
        id: true,
        deliveredAt: true,
        member1PaidAt: true,
        member2PaidAt: true,
        member1: { select: { id: true, name: true } },
        member2: { select: { id: true, name: true } },
        church: { select: { name: true } },
      },
    });

    const map = new Map<string, CollaboratorRow>();
    function touch(
      collaboratorId: string,
      name: string,
      paidAt: Date | null,
      assignmentId: string,
      churchName: string,
      deliveredAt: Date | null,
      member: "member1" | "member2",
    ) {
      let row = map.get(collaboratorId);
      if (!row) {
        row = {
          collaboratorId, name,
          deliveredCount: 0, paidCount: 0, pendingCount: 0,
          amountPending: 0, amountPaid: 0,
          pendingAssignments: [],
        };
        map.set(collaboratorId, row);
      }
      row.deliveredCount++;
      if (paidAt) {
        row.paidCount++;
        row.amountPaid += rate;
      } else {
        row.pendingCount++;
        row.amountPending += rate;
        row.pendingAssignments.push({
          assignmentId, churchName,
          deliveredAt: deliveredAt ? deliveredAt.toISOString() : null,
          member,
        });
      }
    }

    for (const a of assignments) {
      touch(a.member1.id, a.member1.name, a.member1PaidAt, a.id, a.church.name, a.deliveredAt, "member1");
      touch(a.member2.id, a.member2.name, a.member2PaidAt, a.id, a.church.name, a.deliveredAt, "member2");
    }

    const collaborators = Array.from(map.values()).sort((a, b) => b.amountPending - a.amountPending);
    const totals = collaborators.reduce(
      (acc, c) => ({
        amountPending: acc.amountPending + c.amountPending,
        amountPaid: acc.amountPaid + c.amountPaid,
      }),
      { amountPending: 0, amountPaid: 0 },
    );

    return NextResponse.json({ rate, collaborators, totals });
  } catch (err) {
    console.error("[api/church-assignments/payments] erro:", err);
    return NextResponse.json({ error: "Erro ao gerar relatório financeiro" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit e push**

```bash
cd "G:/Meu Drive/PROJETOS IA - EDSON/BASE ANDRE SANTOS - OVILE"
git add "src/app/api/church-assignments/payments/route.ts"
git commit -m "feat(api): relatorio financeiro agregado por colaborador (entregas x pago x devido)"
git push
```

- [ ] **Step 3: Validar no clone local**

```bash
cd /c/dev/ovile-local
git pull
npx tsc --noEmit
```

Expected: sem erros de tipo.

---

### Task 5: Estender API de Settings com o valor da entrega

**Files:**
- Modify: `src/app/api/settings/route.ts` (arquivo inteiro, 54 linhas — GET e PUT)

**Interfaces:**
- Produces: `GET /api/settings` agora inclui `deliveryPaymentValue: number` na resposta.
  `PUT /api/settings` aceita `deliveryPaymentValue?: number` no body. Consumido pelo
  `FinanceiroTab` (Task 6) pra ler/editar o valor.

- [ ] **Step 1: Substituir `src/app/api/settings/route.ts` inteiro**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db } = getCampaignContext(session);
    const settings = await db.settings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton", campaignName: "Base Andre Santos", updatedAt: new Date() },
      select: {
        id: true,
        campaignName: true,
        logoBase64: true,
        whatsappGroupLink: true,
        googleRefreshToken: true,
        deliveryPaymentValue: true,
        updatedAt: true,
      },
    });
    // Nunca expor o refresh token (mesmo criptografado) ao client — só o status.
    const { googleRefreshToken, ...rest } = settings;
    return NextResponse.json({ ...rest, googleCalendarConnected: Boolean(googleRefreshToken) });
  } catch (err) {
    console.error("[settings GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { db } = getCampaignContext(session);
    const { campaignName, logoBase64, whatsappGroupLink, deliveryPaymentValue } = await req.json();
    if (deliveryPaymentValue !== undefined && (typeof deliveryPaymentValue !== "number" || deliveryPaymentValue < 0)) {
      return NextResponse.json({ error: "Valor de pagamento inválido" }, { status: 400 });
    }
    const settings = await db.settings.upsert({
      where: { id: "singleton" },
      update: {
        ...(campaignName && { campaignName }),
        ...(logoBase64 !== undefined && { logoBase64 }),
        ...(whatsappGroupLink !== undefined && { whatsappGroupLink: whatsappGroupLink || null }),
        ...(deliveryPaymentValue !== undefined && { deliveryPaymentValue }),
        updatedAt: new Date(),
      },
      create: {
        id: "singleton",
        campaignName: campaignName ?? "Base Andre Santos",
        logoBase64: logoBase64 ?? null,
        whatsappGroupLink: whatsappGroupLink ?? null,
        deliveryPaymentValue: deliveryPaymentValue ?? 10,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[settings PUT]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit e push**

```bash
cd "G:/Meu Drive/PROJETOS IA - EDSON/BASE ANDRE SANTOS - OVILE"
git add src/app/api/settings/route.ts
git commit -m "feat(api): settings aceita e retorna valor de pagamento por entrega"
git push
```

- [ ] **Step 3: Validar no clone local**

```bash
cd /c/dev/ovile-local
git pull
npx tsc --noEmit
```

Expected: sem erros de tipo. Confirmar manualmente (leitura do diff) que nenhum outro consumidor
de `GET /api/settings` quebra por causa do campo novo (busca rápida: `grep -rn "/api/settings"
src` — consumidores existentes só leem campos que continuam iguais).

---

### Task 6: Aba "Financeiro" na página `/igrejas`

**Files:**
- Create: `src/components/churches/financeiro-tab.tsx`
- Modify: `src/app/(dashboard)/igrejas/page.tsx` (arquivo inteiro, 186 linhas)

**Interfaces:**
- Consumes: `GET /api/church-assignments/payments` (Task 4), `POST /api/church-assignments/:id/pay` (Task 2), `POST /api/church-assignments/pay-bulk` (Task 3), `PUT /api/settings` (Task 5).
- Produces: componente `FinanceiroTab` (sem props) exportado de `src/components/churches/financeiro-tab.tsx`, renderizado dentro da aba "Financeiro" de `IgrejasPage`.

- [ ] **Step 1: Criar `src/components/churches/financeiro-tab.tsx`**

```tsx
"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type PendingAssignment = {
  assignmentId: string;
  churchName: string;
  deliveredAt: string | null;
  member: "member1" | "member2";
};
type CollaboratorRow = {
  collaboratorId: string;
  name: string;
  deliveredCount: number;
  paidCount: number;
  pendingCount: number;
  amountPending: number;
  amountPaid: number;
  pendingAssignments: PendingAssignment[];
};
type PaymentsData = {
  rate: number;
  collaborators: CollaboratorRow[];
  totals: { amountPending: number; amountPaid: number };
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinanceiroTab() {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rateInput, setRateInput] = useState("");
  const [savingRate, setSavingRate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/church-assignments/payments");
    if (res.ok) {
      const j: PaymentsData = await res.json();
      setData(j);
      setRateInput(String(j.rate));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveRate() {
    const value = Number(rateInput.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Valor inválido");
      return;
    }
    setSavingRate(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryPaymentValue: value }),
    });
    if (res.ok) { toast.success("Valor atualizado"); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao salvar"); }
    setSavingRate(false);
  }

  async function payOne(assignmentId: string, member: "member1" | "member2") {
    setBusyId(assignmentId);
    const res = await fetch(`/api/church-assignments/${assignmentId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member }),
    });
    if (res.ok) { toast.success("Marcado como pago"); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao marcar pago"); }
    setBusyId(null);
  }

  async function payAll(collaboratorId: string) {
    setBusyId(collaboratorId);
    const res = await fetch("/api/church-assignments/pay-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId }),
    });
    if (res.ok) { toast.success("Pagamentos marcados"); load(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao marcar pagos"); }
    setBusyId(null);
  }

  if (loading || !data) {
    return <p className="text-sm text-muted-foreground px-1">Carregando...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/[0.08] p-4 flex items-center gap-3 flex-wrap">
        <label className="text-xs font-medium text-muted-foreground">Valor por entrega (por membro)</label>
        <input
          type="text"
          inputMode="decimal"
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
          className="w-28 rounded-lg px-3 py-1.5 text-sm bg-secondary border border-border outline-none"
        />
        <Button size="sm" onClick={saveRate} disabled={savingRate}>
          {savingRate ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.08] p-4">
          <p className="text-xs text-muted-foreground">Total pendente</p>
          <p className="text-xl font-bold text-foreground">{fmt(data.totals.amountPending)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] p-4">
          <p className="text-xs text-muted-foreground">Total pago</p>
          <p className="text-xl font-bold text-foreground">{fmt(data.totals.amountPaid)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]" style={{ background: "rgba(13,27,42,0.5)" }}>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Colaborador</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Entregas</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Pagas</th>
              <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Devido</th>
              <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {data.collaborators.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhuma entrega confirmada ainda.</td></tr>
            ) : (
              data.collaborators.map((c) => (
                <Fragment key={c.collaboratorId}>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-foreground">
                      <button
                        onClick={() => setExpanded(expanded === c.collaboratorId ? null : c.collaboratorId)}
                        className="flex items-center gap-1.5 disabled:opacity-50"
                        disabled={c.pendingAssignments.length === 0}
                      >
                        {c.pendingAssignments.length > 0 ? (
                          expanded === c.collaboratorId ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                        ) : null}
                        {c.name}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.deliveredCount}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.paidCount}</td>
                    <td className="px-4 py-2.5 text-foreground">{fmt(c.amountPending)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {c.pendingCount > 0 && (
                        <Button
                          size="sm" variant="outline" className="gap-1.5"
                          disabled={busyId === c.collaboratorId}
                          onClick={() => payAll(c.collaboratorId)}
                        >
                          <Wallet className="w-3.5 h-3.5" /> Pagar tudo
                        </Button>
                      )}
                    </td>
                  </tr>
                  {expanded === c.collaboratorId && c.pendingAssignments.map((p) => (
                    <tr key={p.assignmentId + p.member} className="bg-white/[0.015]">
                      <td className="px-4 py-2 pl-9 text-muted-foreground text-xs" colSpan={3}>{p.churchName}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{fmt(data.rate)}</td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm" variant="outline"
                          disabled={busyId === p.assignmentId}
                          onClick={() => payOne(p.assignmentId, p.member)}
                        >
                          Marcar pago
                        </Button>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Substituir `src/app/(dashboard)/igrejas/page.tsx` inteiro**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Upload, Users, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImportChurchesDialog } from "@/components/churches/import-churches-dialog";
import { AssignDialog } from "@/components/churches/assign-dialog";
import { EditChurchDialog } from "@/components/churches/edit-church-dialog";
import { FinanceiroTab } from "@/components/churches/financeiro-tab";

type Assignment = {
  id: string;
  status: "PENDENTE" | "ENTREGUE" | "NAO_FOI_POSSIVEL";
  member1: { name: string };
  member2: { name: string };
};
type Church = {
  id: string;
  name: string;
  regional: string | null;
  denominacao: string | null;
  pastor: { id: string; name: string } | null;
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
  const [tab, setTab] = useState<"igrejas" | "financeiro">("igrejas");
  const [churches, setChurches] = useState<Church[]>([]);
  const [allChurches, setAllChurches] = useState<Church[]>([]);
  const [regionalFilter, setRegionalFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Church | null>(null);
  const [editTarget, setEditTarget] = useState<Church | null>(null);

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

  useEffect(() => {
    const fetchAllChurches = async () => {
      const res = await fetch("/api/churches");
      if (res.ok) {
        const j = await res.json();
        setAllChurches(j.data);
      }
    };
    fetchAllChurches();
  }, []);

  const regionais = Array.from(new Set(allChurches.map((c) => c.regional).filter(Boolean))) as string[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          <h1 className="text-xl lg:text-2xl font-bold gradient-title">Igrejas</h1>
        </div>
        {tab === "igrejas" && (
          <Button onClick={() => setImportOpen(true)} className="bg-primary text-primary-foreground gap-2">
            <Upload className="w-4 h-4" /> Importar planilha
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab("igrejas")}
          className={`px-3 py-1.5 rounded-lg text-sm border ${tab === "igrejas" ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
        >
          Igrejas
        </button>
        <button
          onClick={() => setTab("financeiro")}
          className={`px-3 py-1.5 rounded-lg text-sm border ${tab === "financeiro" ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
        >
          Financeiro
        </button>
      </div>

      {tab === "financeiro" ? (
        <FinanceiroTab />
      ) : (
        <>
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
                  <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Pastor</th>
                  <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Status</th>
                  <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Dupla</th>
                  <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
                ) : churches.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma igreja importada ainda.</td></tr>
                ) : (
                  churches.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-foreground">{c.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{c.regional ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{c.pastor?.name ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLOR[c.latestAssignment?.status ?? "SEM_DUPLA"] ?? "border-border text-muted-foreground"}`}>
                          {c.latestAssignment ? STATUS_LABEL[c.latestAssignment.status] : "Sem dupla"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {c.latestAssignment ? `${c.latestAssignment.member1.name} + ${c.latestAssignment.member2.name}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setEditTarget(c)} className="gap-1.5">
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setAssignTarget(c)} className="gap-1.5">
                            {c.latestAssignment?.status === "NAO_FOI_POSSIVEL" ? <RefreshCw className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                            {c.latestAssignment ? "Redistribuir" : "Atribuir dupla"}
                          </Button>
                          {c.latestAssignment && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-destructive hover:bg-destructive/10"
                              onClick={async () => {
                                if (!confirm(`Excluir a dupla atribuída a "${c.name}"?`)) return;
                                const res = await fetch(`/api/church-assignments/${c.latestAssignment!.id}`, { method: "DELETE" });
                                if (res.ok) { toast.success("Atribuição excluída"); load(); }
                                else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Erro ao excluir"); }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Excluir
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

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
      <EditChurchDialog
        open={!!editTarget}
        church={editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        onSuccess={load}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit e push**

```bash
cd "G:/Meu Drive/PROJETOS IA - EDSON/BASE ANDRE SANTOS - OVILE"
git add src/components/churches/financeiro-tab.tsx "src/app/(dashboard)/igrejas/page.tsx"
git commit -m "feat(ui): aba Financeiro em /igrejas - valor da entrega, totais, marcar pago"
git push
```

- [ ] **Step 4: Validar no clone local**

```bash
cd /c/dev/ovile-local
git pull
npx tsc --noEmit
npx next lint
```

Expected: sem erros de tipo nem de lint.

---

### Task 7: e2e (auth-redirect) + fechar branch

**Files:**
- Create: `e2e/church-assignments-payments.spec.ts`
- Modify: `ESTADO-ATUAL.md` (adicionar seção da sessão, no topo, seguindo o formato das seções
  anteriores)

**Interfaces:** nenhuma (specs de fumaça, seguem o padrão já existente dos outros arquivos em
`e2e/*.spec.ts` — só checam redirect pra `/login` sem sessão, mesmo padrão de
`churches-assignments.spec.ts` e `church-assignments-mine.spec.ts`).

- [ ] **Step 1: Criar `e2e/church-assignments-payments.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test.describe("API financeiro de entregas (Igrejas)", () => {
  test("GET /payments sem sessão redireciona para /login", async ({ request }) => {
    const res = await request.get("/api/church-assignments/payments", { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("/login");
  });

  test("POST /:id/pay sem sessão redireciona para /login", async ({ request }) => {
    const res = await request.post("/api/church-assignments/algum-id/pay", {
      data: { member: "member1" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("/login");
  });

  test("POST /pay-bulk sem sessão redireciona para /login", async ({ request }) => {
    const res = await request.post("/api/church-assignments/pay-bulk", {
      data: { collaboratorId: "algum-id" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("/login");
  });
});
```

- [ ] **Step 2: Commit e push**

```bash
cd "G:/Meu Drive/PROJETOS IA - EDSON/BASE ANDRE SANTOS - OVILE"
git add e2e/church-assignments-payments.spec.ts
git commit -m "test(e2e): checagem de auth-redirect nas rotas novas de financeiro de entregas"
git push
```

- [ ] **Step 3: Confirmar CI verde na branch**

Verificar no GitHub (Actions do repo `edsonluizzz/base-andre-santos`, branch
`feat/financeiro-entregas-igrejas`) que o workflow `deploy-guardian.yml` passou, incluindo o job
`e2e-cadastro` (que também sobe o servidor e roda todos os specs de `e2e/`, inclusive o novo).

- [ ] **Step 4: Revisão final de branch completa**

Antes de abrir PR/merge pra `main`: reler o diff inteiro da branch
(`git diff main...feat/financeiro-entregas-igrejas`) conferindo os pontos do padrão do módulo de
Igrejas que já causaram bug antes (ver `2026-07-20-equipes-distribuicao-igrejas-design.md`):
checagem de ADMIN em toda rota nova, filtro por `campaignId`/`cid` em toda query, idempotência do
"marcar pago" (não reprocessa quem já tem `paidAt`).

- [ ] **Step 5: Atualizar `ESTADO-ATUAL.md` e merge**

Adicionar uma seção nova no topo do arquivo (mesmo formato das sessões anteriores) descrevendo o
que foi construído (aba Financeiro, valor configurável, marcar pago individual/em lote). Depois:

```bash
cd "G:/Meu Drive/PROJETOS IA - EDSON/BASE ANDRE SANTOS - OVILE"
git add ESTADO-ATUAL.md
git commit -m "docs: encerra sessao - financeiro de entregas em Igrejas no ar"
git push
git checkout main
git merge --no-ff feat/financeiro-entregas-igrejas
git push origin main
```

---

## Fora de escopo (não implementar nesta plan)

- Exportar relatório em PDF/XLSX.
- Tabela `Payment` com snapshot histórico de valor.
- Pagamento diferenciado por igreja/regional.
- Qualquer entrega de material fora do módulo Igrejas.
