# Mala direta por email — Implementation Plan (base-andre-santos)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ferramenta interna `/mala-direta` que envia propaganda eleitoral por email (Resend) para a base de cadastros da campanha André Santos, com descadastro funcional (link + one-click), supressão automática de bounces/reclamações e envio idempotente em ondas diárias.

**Architecture:** Lógica pura e testável em `src/lib/mala-direta/*` (normalização, token de descadastro, montagem da lista, template, tamanho da onda) + um orquestrador `sendWave` com injeção de dependências (`SendStore` e `Mailer`) para testar idempotência sem banco/Resend. Três modelos Prisma novos (`EmailSuppression`, `EmailCampaign`, `EmailCampaignSend`). Rotas admin sob `/api/mala-direta/*` (gate `requireFinanceAdmin`), rotas públicas sob `/api/public/*` e página pública `/descadastro`.

**Tech Stack:** Next.js 14.2 (App Router), Prisma 7 (`prisma-client-js` + adapter-pg), Resend SDK 6.10, Zod, Vitest (novo, dev), Tailwind + componentes `@/components/ui/*`.

**Spec:** `docs/superpowers/specs/2026-09-21-mala-direta-email-design.md`

## Global Constraints

- Idioma de UI, textos e comentários: PT-BR, com acentuação correta.
- Todo `route.ts` autenticado: `auth()`/`requireFinanceAdmin()` + filtro por `campaignId` + `try/catch` com `console.error("[rota] erro:", err)` e resposta 500 `{ error: "Erro interno" }` (regras do `CLAUDE.md`).
- Rotas públicas só sob `/api/public/*` (já fora do middleware) e resolvem tenant por `resolvePublicTenant(req)`; nunca aceitam `campaignId` de input.
- Segredos nunca com prefixo `NEXT_PUBLIC_`. Novas env vars: `UNSUBSCRIBE_SECRET` (fallback `AUTH_SECRET`), `RESEND_WEBHOOK_SECRET`, `MALA_DIRETA_FROM`, `MALA_DIRETA_REPLY_TO` (opcional), `MALA_DIRETA_DAILY_LIMIT` (padrão `100`, plano free do Resend).
- Público = `Collaborator` da campanha com email válido, **excluindo** `status = INACTIVE`, domínio `offline-members-wix.com`, duplicados (case-insensitive) e quem está em `EmailSuppression`.
- Nunca marcar `lgpdConsent = true` em cadastros importados (não fabricar consentimento).
- Reenvio duplicado é proibido: linhas `SENDING` órfãs **não** são reenviadas automaticamente (só por reset manual explícito).
- Não deixar credenciais de produção no repo: `.env.production.local` e scripts one-shot são apagados logo após o uso.
- Commit + push após cada task validada (preferência do usuário); confirmar `vercel ls` após push (auto-deploy já falhou antes) e rodar `vercel --prod --yes` se não deployar.
- `next.config.mjs` já usa `serverComponentsExternalPackages` para libs pesadas; nada novo é adicionado ao bundle além de `resend` (já dependência).

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `vitest.config.ts` (criar) | Runner de testes unitários, alias `@` |
| `src/lib/mala-direta/emails.ts` | `normalizeEmail`, `isSendableEmail` |
| `src/lib/mala-direta/unsubscribe-token.ts` | HMAC do descadastro + URLs (página e one-click) |
| `src/lib/mala-direta/recipients.ts` | `buildRecipients` (puro) + `loadRecipients` (DB) |
| `src/lib/mala-direta/wave.ts` | `computeWaveSize` (limite diário) |
| `src/lib/mala-direta/template.ts` | HTML/texto da propaganda + headers `List-Unsubscribe` |
| `src/lib/mala-direta/sender.ts` | `sendWave`, `sendTestEmail` (DI: `SendStore`, `Mailer`) |
| `src/lib/mala-direta/prisma-store.ts` | `createPrismaSendStore` (claim atômico com `SKIP LOCKED`) |
| `src/lib/mala-direta/resend-mailer.ts` | `createResendMailer` (batch do Resend) |
| `src/lib/mala-direta/webhook.ts` | `suppressionFromEvent` (puro) |
| `prisma/schema.prisma` (modificar) | 3 modelos + 2 enums |
| `src/app/api/public/descadastro/route.ts` | POST descadastro (link e one-click) |
| `src/app/descadastro/page.tsx` + `descadastro-form.tsx` | Página pública de confirmação |
| `src/app/api/public/webhooks/resend/route.ts` | Bounce/reclamação → supressão |
| `src/app/api/mala-direta/**` | Rotas admin (dry-run, campanhas, teste, envio) |
| `src/app/(dashboard)/mala-direta/page.tsx` | UI admin |
| `src/components/sidebar.tsx` (modificar) | Item de menu |
| `src/middleware.ts` (modificar) | `descadastro` fora do matcher |

---

### Task 1: Infra de testes (Vitest)

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (script `test`, devDependency `vitest`)
- Test: `src/lib/mala-direta/smoke.test.ts` (removido no fim da task)

**Interfaces:** Produces: comando `npm test` (vitest run) e alias `@/` funcionando nos testes.

- [ ] **Step 1: Instalar**

```bash
cd /Users/apple/Projects/base-andre-santos && npm i -D vitest
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"], environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 3: Adicionar script em `package.json` → `"scripts"`**

```json
"test": "vitest run",
```

- [ ] **Step 4: Teste de fumaça do alias**

`src/lib/mala-direta/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { CANDIDATE_NUMBER } from "@/lib/campaign-identification";

describe("infra", () => {
  it("resolve o alias @/ e roda testes", () => {
    expect(CANDIDATE_NUMBER).toBe("30777");
  });
});
```

- [ ] **Step 5: Rodar**

Run: `npm test`
Expected: `1 passed`.

- [ ] **Step 6: Remover o smoke e commitar**

```bash
rm src/lib/mala-direta/smoke.test.ts
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: adiciona vitest para testes unitários"
```

---

### Task 2: Normalização e validação de email

**Files:**
- Create: `src/lib/mala-direta/emails.ts`
- Test: `src/lib/mala-direta/emails.test.ts`

**Interfaces:** Produces:
```ts
export function normalizeEmail(raw: string | null | undefined): string | null;
export function isSendableEmail(email: string): boolean; // recebe email já normalizado
```

- [ ] **Step 1: Teste falhando**

```ts
import { describe, it, expect } from "vitest";
import { normalizeEmail, isSendableEmail } from "./emails";

describe("normalizeEmail", () => {
  it("apara e põe em minúsculas", () => {
    expect(normalizeEmail("  Fulano@Gmail.COM ")).toBe("fulano@gmail.com");
  });
  it("retorna null para vazio/nulo", () => {
    expect(normalizeEmail("   ")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe("isSendableEmail", () => {
  it("aceita email válido", () => {
    expect(isSendableEmail("a@b.com")).toBe(true);
  });
  it("rejeita formato inválido", () => {
    expect(isSendableEmail("edeneianeves13@gmilcom")).toBe(false);
    expect(isSendableEmail("sem-arroba")).toBe(false);
  });
  it("rejeita domínio de placeholder do Wix", () => {
    expect(isSendableEmail("x@offline-members-wix.com")).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/mala-direta/emails.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

```ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLOCKED_DOMAINS = new Set(["offline-members-wix.com"]);

export function normalizeEmail(raw: string | null | undefined): string | null {
  const e = (raw ?? "").trim().toLowerCase();
  return e === "" ? null : e;
}

export function isSendableEmail(email: string): boolean {
  if (!EMAIL_RE.test(email)) return false;
  return !BLOCKED_DOMAINS.has(email.split("@")[1]);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/mala-direta/emails.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mala-direta/emails.ts src/lib/mala-direta/emails.test.ts
git commit -m "feat(mala-direta): normalização e validação de email"
```

---

### Task 3: Token de descadastro (HMAC) e URLs

**Files:**
- Create: `src/lib/mala-direta/unsubscribe-token.ts`
- Test: `src/lib/mala-direta/unsubscribe-token.test.ts`

**Interfaces:**
- Consumes: `normalizeEmail` (Task 2).
- Produces:
```ts
export function signUnsubscribe(email: string): string;
export function verifyUnsubscribe(email: string, token: string): boolean;
export function buildUnsubscribePageUrl(email: string, baseUrl: string): string;   // link visível no rodapé
export function buildUnsubscribeOneClickUrl(email: string, baseUrl: string): string; // header List-Unsubscribe (POST)
```

- [ ] **Step 1: Teste falhando**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import {
  signUnsubscribe, verifyUnsubscribe, buildUnsubscribePageUrl, buildUnsubscribeOneClickUrl,
} from "./unsubscribe-token";

beforeAll(() => { process.env.UNSUBSCRIBE_SECRET = "segredo-de-teste"; });

describe("unsubscribe token", () => {
  it("assina e verifica", () => {
    const t = signUnsubscribe("a@b.com");
    expect(verifyUnsubscribe("a@b.com", t)).toBe(true);
  });
  it("ignora caixa e espaços no email", () => {
    const t = signUnsubscribe("A@B.com ");
    expect(verifyUnsubscribe("a@b.com", t)).toBe(true);
  });
  it("rejeita token de outro email", () => {
    const t = signUnsubscribe("a@b.com");
    expect(verifyUnsubscribe("c@d.com", t)).toBe(false);
  });
  it("rejeita token adulterado ou de tamanho errado", () => {
    const t = signUnsubscribe("a@b.com");
    expect(verifyUnsubscribe("a@b.com", t.slice(0, -2) + "xx")).toBe(false);
    expect(verifyUnsubscribe("a@b.com", "curto")).toBe(false);
    expect(verifyUnsubscribe("a@b.com", "")).toBe(false);
  });
  it("monta as duas URLs com email codificado", () => {
    const page = buildUnsubscribePageUrl("a+x@b.com", "https://x.com");
    const one = buildUnsubscribeOneClickUrl("a+x@b.com", "https://x.com");
    expect(page.startsWith("https://x.com/descadastro?e=a%2Bx%40b.com&t=")).toBe(true);
    expect(one.startsWith("https://x.com/api/public/descadastro?e=a%2Bx%40b.com&t=")).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/mala-direta/unsubscribe-token.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeEmail } from "./emails";

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET ?? process.env.AUTH_SECRET;
  if (!s) throw new Error("UNSUBSCRIBE_SECRET/AUTH_SECRET ausente");
  return s;
}

export function signUnsubscribe(email: string): string {
  const e = normalizeEmail(email) ?? "";
  return createHmac("sha256", secret()).update(e).digest("base64url");
}

export function verifyUnsubscribe(email: string, token: string): boolean {
  if (!token) return false;
  const expected = Buffer.from(signUnsubscribe(email));
  const given = Buffer.from(token);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

function query(email: string): string {
  const e = normalizeEmail(email) ?? "";
  return `e=${encodeURIComponent(e)}&t=${signUnsubscribe(e)}`;
}

export function buildUnsubscribePageUrl(email: string, baseUrl: string): string {
  return `${baseUrl}/descadastro?${query(email)}`;
}

export function buildUnsubscribeOneClickUrl(email: string, baseUrl: string): string {
  return `${baseUrl}/api/public/descadastro?${query(email)}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/mala-direta/unsubscribe-token.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mala-direta/unsubscribe-token.ts src/lib/mala-direta/unsubscribe-token.test.ts
git commit -m "feat(mala-direta): token HMAC de descadastro"
```

---

### Task 4: Montagem da lista de destinatários

**Files:**
- Create: `src/lib/mala-direta/recipients.ts`
- Test: `src/lib/mala-direta/recipients.test.ts`

**Interfaces:**
- Consumes: `normalizeEmail`, `isSendableEmail` (Task 2).
- Produces:
```ts
export type RecipientRow = { email: string | null; name: string };
export type Recipient = { email: string; name: string };
export type RecipientStats = {
  totalRows: number; semEmail: number; invalido: number;
  duplicado: number; suprimido: number; final: number;
};
export function buildRecipients(rows: RecipientRow[], suppressed: Set<string>):
  { recipients: Recipient[]; stats: RecipientStats };
export async function loadRecipients(db: PrismaClient, cid: string):
  Promise<{ recipients: Recipient[]; stats: RecipientStats }>;
```

- [ ] **Step 1: Teste falhando (só `buildRecipients`)**

```ts
import { describe, it, expect } from "vitest";
import { buildRecipients } from "./recipients";

describe("buildRecipients", () => {
  it("filtra vazio, inválido, wix, duplicado e suprimido — e conta cada um", () => {
    const rows = [
      { email: "ok@gmail.com", name: "Ok" },
      { email: "  OK@gmail.com ", name: "Dup" },
      { email: null, name: "Sem" },
      { email: "quebrado@gmilcom", name: "Inv" },
      { email: "x@offline-members-wix.com", name: "Wix" },
      { email: "sup@gmail.com", name: "Sup" },
      { email: "outro@hotmail.com", name: "Outro" },
    ];
    const { recipients, stats } = buildRecipients(rows, new Set(["sup@gmail.com"]));
    expect(recipients.map((r) => r.email)).toEqual(["ok@gmail.com", "outro@hotmail.com"]);
    expect(stats).toEqual({
      totalRows: 7, semEmail: 1, invalido: 2, duplicado: 1, suprimido: 1, final: 2,
    });
  });
  it("mantém o primeiro nome encontrado de cada email", () => {
    const { recipients } = buildRecipients(
      [{ email: "a@b.com", name: "Primeiro" }, { email: "a@b.com", name: "Segundo" }],
      new Set(),
    );
    expect(recipients).toEqual([{ email: "a@b.com", name: "Primeiro" }]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/mala-direta/recipients.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

```ts
import type { PrismaClient } from "@prisma/client";
import { normalizeEmail, isSendableEmail } from "./emails";

export type RecipientRow = { email: string | null; name: string };
export type Recipient = { email: string; name: string };
export type RecipientStats = {
  totalRows: number; semEmail: number; invalido: number;
  duplicado: number; suprimido: number; final: number;
};

export function buildRecipients(rows: RecipientRow[], suppressed: Set<string>) {
  const stats: RecipientStats = {
    totalRows: rows.length, semEmail: 0, invalido: 0, duplicado: 0, suprimido: 0, final: 0,
  };
  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email) { stats.semEmail++; continue; }
    if (!isSendableEmail(email)) { stats.invalido++; continue; }
    if (seen.has(email)) { stats.duplicado++; continue; }
    seen.add(email);
    if (suppressed.has(email)) { stats.suprimido++; continue; }
    recipients.push({ email, name: row.name });
  }
  stats.final = recipients.length;
  return { recipients, stats };
}

export async function loadRecipients(db: PrismaClient, cid: string) {
  const [rows, supp] = await Promise.all([
    db.collaborator.findMany({
      where: { campaignId: cid, status: { not: "INACTIVE" } },
      select: { email: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    db.emailSuppression.findMany({ where: { campaignId: cid }, select: { email: true } }),
  ]);
  return buildRecipients(rows, new Set(supp.map((s) => s.email)));
}
```

> `db.emailSuppression` só existe após a Task 5 (`prisma generate`). O teste desta task não toca em `loadRecipients`, mas `tsc` só passa depois da Task 5 — rodar `npx tsc --noEmit` ao fim da Task 5.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/mala-direta/recipients.test.ts` → PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mala-direta/recipients.ts src/lib/mala-direta/recipients.test.ts
git commit -m "feat(mala-direta): montagem da lista de destinatários"
```

---

### Task 5: Modelos Prisma + limite diário

**Files:**
- Modify: `prisma/schema.prisma` (acrescentar no final do arquivo)
- Create: `src/lib/mala-direta/wave.ts`
- Test: `src/lib/mala-direta/wave.test.ts`

**Interfaces:** Produces:
```ts
export function computeWaveSize(dailyLimit: number, sentLast24h: number, requested: number): number;
```
Modelos Prisma: `EmailSuppression`, `EmailCampaign`, `EmailCampaignSend` (campos abaixo — usados pelas Tasks 6–10).

- [ ] **Step 1: Acrescentar ao `prisma/schema.prisma`**

```prisma
enum EmailSuppressionReason {
  UNSUBSCRIBE
  BOUNCE
  COMPLAINT
  MANUAL
}

enum EmailSendStatus {
  PENDING
  SENDING
  SENT
  FAILED
}

/// Lista de supressão de mala direta. `campaignId` = tenant (sem FK para não exigir back-relation em Campaign).
model EmailSuppression {
  id         String                 @id @default(cuid())
  campaignId String
  email      String
  reason     EmailSuppressionReason
  createdAt  DateTime               @default(now())

  @@unique([campaignId, email])
}

model EmailCampaign {
  id         String   @id @default(cuid())
  campaignId String
  subject    String
  bodyText   String   @db.Text
  ctaLabel   String?
  ctaUrl     String?
  createdBy  String?
  createdAt  DateTime @default(now())

  sends EmailCampaignSend[]

  @@index([campaignId])
}

/// Um registro por (mala direta, email). A constraint única é o que garante idempotência.
model EmailCampaignSend {
  id              String          @id @default(cuid())
  campaignId      String
  emailCampaignId String
  email           String
  name            String
  status          EmailSendStatus @default(PENDING)
  providerId      String?
  error           String?         @db.Text
  sentAt          DateTime?
  createdAt       DateTime        @default(now())

  emailCampaign EmailCampaign @relation(fields: [emailCampaignId], references: [id], onDelete: Cascade)

  @@unique([emailCampaignId, email])
  @@index([emailCampaignId, status])
  @@index([campaignId, sentAt])
  @@index([providerId])
}
```

- [ ] **Step 2: Validar e gerar client**

Run: `npx prisma validate && npx prisma generate`
Expected: `The schema ... is valid` e client gerado. (O `db push` ocorre no build da Vercel — `npm run build`; não rodar contra produção localmente.)

- [ ] **Step 3: Teste falhando de `computeWaveSize`**

`src/lib/mala-direta/wave.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeWaveSize } from "./wave";

describe("computeWaveSize", () => {
  it("respeita o pedido quando há folga", () => {
    expect(computeWaveSize(500, 0, 200)).toBe(200);
  });
  it("limita ao que resta do teto diário", () => {
    expect(computeWaveSize(100, 95, 50)).toBe(5);
  });
  it("zera quando o teto já foi atingido ou estourado", () => {
    expect(computeWaveSize(100, 100, 50)).toBe(0);
    expect(computeWaveSize(100, 130, 50)).toBe(0);
  });
  it("trata pedido inválido como zero", () => {
    expect(computeWaveSize(100, 0, -5)).toBe(0);
    expect(computeWaveSize(100, 0, NaN)).toBe(0);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar** — `npx vitest run src/lib/mala-direta/wave.test.ts` → FAIL.

- [ ] **Step 5: Implementar `wave.ts`**

```ts
export function computeWaveSize(dailyLimit: number, sentLast24h: number, requested: number): number {
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  const remaining = Math.max(0, dailyLimit - sentLast24h);
  return Math.min(Math.floor(requested), remaining);
}
```

- [ ] **Step 6: Rodar tudo + tsc**

Run: `npm test && npx tsc --noEmit`
Expected: todos os testes passam; `tsc` sem erros (agora `db.emailSuppression` existe).

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma src/lib/mala-direta/wave.ts src/lib/mala-direta/wave.test.ts
git commit -m "feat(mala-direta): modelos Prisma e cálculo do limite diário"
```

---

### Task 6: Template de propaganda + headers de descadastro

**Files:**
- Create: `src/lib/mala-direta/template.ts`
- Test: `src/lib/mala-direta/template.test.ts`

**Interfaces:**
- Consumes: `CAMPAIGN_ENTITY`, `CANDIDATE_NUMBER` de `@/lib/campaign-identification`.
- Produces:
```ts
export type PropagandaInput = {
  subject: string; bodyText: string; ctaLabel?: string | null; ctaUrl?: string | null;
  firstName?: string | null; unsubscribeUrl: string;
};
export function escapeHtml(s: string): string;
export function renderPropagandaEmail(input: PropagandaInput): { html: string; text: string };
export function buildUnsubscribeHeaders(oneClickUrl: string): Record<string, string>;
```
`{{nome}}` no corpo é trocado pelo primeiro nome (fallback `amigo(a)`).

- [ ] **Step 1: Teste falhando**

```ts
import { describe, it, expect } from "vitest";
import { renderPropagandaEmail, buildUnsubscribeHeaders, escapeHtml } from "./template";

const base = {
  subject: "Assunto",
  bodyText: "Olá, {{nome}}!\n\nSegundo parágrafo\ncom quebra.",
  unsubscribeUrl: "https://x.com/descadastro?e=a&t=b",
};

describe("renderPropagandaEmail", () => {
  it("personaliza {{nome}} e separa parágrafos", () => {
    const { html, text } = renderPropagandaEmail({ ...base, firstName: "Maria" });
    expect(html).toContain("Olá, Maria!");
    expect(html).toContain("<p");
    expect(html).toContain("com quebra.");
    expect(text).toContain("Olá, Maria!");
  });
  it("usa fallback quando não há nome", () => {
    expect(renderPropagandaEmail(base).html).toContain("Olá, amigo(a)!");
  });
  it("escapa HTML do corpo e do nome", () => {
    const { html } = renderPropagandaEmail({
      ...base, bodyText: "<script>x</script> {{nome}}", firstName: "<b>Zé</b>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;Zé&lt;/b&gt;");
  });
  it("inclui CTA só para https", () => {
    const ok = renderPropagandaEmail({ ...base, ctaLabel: "Saiba mais", ctaUrl: "https://a.com/x" });
    expect(ok.html).toContain('href="https://a.com/x"');
    const bad = renderPropagandaEmail({ ...base, ctaLabel: "Clique", ctaUrl: "javascript:alert(1)" });
    expect(bad.html).not.toContain("javascript:");
    expect(bad.html).not.toContain("Clique");
  });
  it("traz identificação do comitê, número e link de descadastro (html e texto)", () => {
    const { html, text } = renderPropagandaEmail(base);
    for (const out of [html, text]) {
      expect(out).toContain("68.464.730/0001-87");
      expect(out).toContain("30777");
    }
    // no HTML o "&" da URL é escapado para "&amp;"; no texto puro a URL vai crua
    expect(html).toContain(escapeHtml(base.unsubscribeUrl));
    expect(text).toContain(base.unsubscribeUrl);
    expect(html.toLowerCase()).toContain("propaganda eleitoral");
  });
});

describe("buildUnsubscribeHeaders", () => {
  it("monta List-Unsubscribe e One-Click (RFC 8058)", () => {
    expect(buildUnsubscribeHeaders("https://x.com/api/public/descadastro?e=a&t=b")).toEqual({
      "List-Unsubscribe": "<https://x.com/api/public/descadastro?e=a&t=b>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("escapeHtml", () => {
  it("escapa & < > \"", () => {
    expect(escapeHtml(`a&b<c>"d"`)).toBe("a&amp;b&lt;c&gt;&quot;d&quot;");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/lib/mala-direta/template.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

```ts
import { CAMPAIGN_ENTITY, CANDIDATE_NUMBER } from "@/lib/campaign-identification";

export type PropagandaInput = {
  subject: string;
  bodyText: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  firstName?: string | null;
  unsubscribeUrl: string;
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function personalize(text: string, firstName?: string | null): string {
  return text.replace(/\{\{\s*nome\s*\}\}/gi, (firstName ?? "").trim() || "amigo(a)");
}

const FOOTER_LINES = [
  `Propaganda eleitoral — André Santos, ${CANDIDATE_NUMBER}, candidato a Deputado Estadual (PR).`,
  `Enviado por ${CAMPAIGN_ENTITY.razaoSocial} — CNPJ ${CAMPAIGN_ENTITY.cnpj}.`,
  "Você recebe este email porque se cadastrou como apoiador(a) da campanha.",
];

export function renderPropagandaEmail(input: PropagandaInput): { html: string; text: string } {
  const body = personalize(input.bodyText, input.firstName).trim();
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const cta = input.ctaUrl && /^https:\/\//i.test(input.ctaUrl) && input.ctaLabel?.trim()
    ? { url: input.ctaUrl, label: input.ctaLabel.trim() }
    : null;

  const paragraphsHtml = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  const ctaHtml = cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#ff6b04;color:#0a1220;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700">${escapeHtml(cta.label)}</a></p>`
    : "";
  const footerHtml = FOOTER_LINES.map((l) => escapeHtml(l)).join("<br>");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
${paragraphsHtml}
${ctaHtml}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px">
<p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280">${footerHtml}<br>
<a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#6b7280">Não quero mais receber estes emails</a></p>
</div>
</body>
</html>`;

  const text = [
    paragraphs.join("\n\n"),
    cta ? `${cta.label}: ${cta.url}` : "",
    "—",
    ...FOOTER_LINES,
    `Não quero mais receber: ${input.unsubscribeUrl}`,
  ].filter(Boolean).join("\n\n");

  return { html, text };
}

export function buildUnsubscribeHeaders(oneClickUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/lib/mala-direta/template.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mala-direta/template.ts src/lib/mala-direta/template.test.ts
git commit -m "feat(mala-direta): template de propaganda com identificação e descadastro"
```

---

### Task 7: Orquestrador de envio idempotente (`sendWave`, `sendTestEmail`)

**Files:**
- Create: `src/lib/mala-direta/sender.ts`
- Test: `src/lib/mala-direta/sender.test.ts`

**Interfaces:**
- Consumes: `computeWaveSize` (T5), `renderPropagandaEmail`/`buildUnsubscribeHeaders` (T6), `buildUnsubscribePageUrl`/`buildUnsubscribeOneClickUrl` (T3), `Recipient` (T4).
- Produces:
```ts
export type OutMessage = {
  from: string; to: string; subject: string; html: string; text: string;
  headers: Record<string, string>; replyTo?: string;
};
export interface Mailer { sendBatch(messages: OutMessage[]): Promise<string[]>; } // ids na mesma ordem; lança em falha
export type ClaimedRow = { id: string; email: string; name: string };
export interface SendStore {
  seed(recipients: Recipient[]): Promise<void>;                 // idempotente
  claim(limit: number): Promise<ClaimedRow[]>;                  // PENDING → SENDING, atômico
  markSent(id: string, providerId: string | null): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  countSentSince(since: Date): Promise<number>;
}
export type CampaignContent = { subject: string; bodyText: string; ctaLabel?: string | null; ctaUrl?: string | null };
export type WaveOptions = {
  store: SendStore; mailer: Mailer; content: CampaignContent;
  appUrl: string; from: string; replyTo?: string;
  dailyLimit: number; requested: number; now?: Date; batchSize?: number;
};
export type WaveResult = { requested: number; allowed: number; claimed: number; sent: number; failed: number };
export async function sendWave(opts: WaveOptions): Promise<WaveResult>;
export async function sendTestEmail(opts: {
  mailer: Mailer; content: CampaignContent; appUrl: string; from: string; replyTo?: string; to: string;
}): Promise<void>;
```

- [ ] **Step 1: Teste falhando (com store/mailer falsos em memória)**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { sendWave, sendTestEmail, type SendStore, type Mailer, type OutMessage, type ClaimedRow } from "./sender";

beforeAll(() => { process.env.UNSUBSCRIBE_SECRET = "segredo-de-teste"; });

type Row = { id: string; email: string; name: string; status: "PENDING" | "SENDING" | "SENT" | "FAILED"; sentAt?: Date };

function fakeStore(initialSentAt: Date[] = []) {
  const rows = new Map<string, Row>();
  const preSent = [...initialSentAt];
  let seq = 0;
  const store: SendStore = {
    async seed(rs) {
      for (const r of rs) if (!rows.has(r.email)) rows.set(r.email, { id: `id${++seq}`, ...r, status: "PENDING" });
    },
    async claim(limit) {
      const out: ClaimedRow[] = [];
      for (const r of rows.values()) {
        if (out.length >= limit) break;
        if (r.status === "PENDING") { r.status = "SENDING"; out.push({ id: r.id, email: r.email, name: r.name }); }
      }
      return out;
    },
    async markSent(id) { const r = [...rows.values()].find((x) => x.id === id)!; r.status = "SENT"; r.sentAt = new Date(); },
    async markFailed(id) { const r = [...rows.values()].find((x) => x.id === id)!; r.status = "FAILED"; },
    async countSentSince(since) {
      return preSent.filter((d) => d >= since).length + [...rows.values()].filter((r) => r.status === "SENT" && r.sentAt! >= since).length;
    },
  };
  return { store, rows };
}

function fakeMailer(failOnCall?: number) {
  const sent: OutMessage[] = [];
  let calls = 0;
  const mailer: Mailer = {
    async sendBatch(msgs) {
      calls++;
      if (failOnCall === calls) throw new Error("boom");
      sent.push(...msgs);
      return msgs.map((_, i) => `prov-${sent.length - msgs.length + i}`);
    },
  };
  return { mailer, sent };
}

const content = { subject: "S", bodyText: "Olá, {{nome}}!" };
const common = { content, appUrl: "https://x.com", from: "A <a@x.com>" };
const people = Array.from({ length: 5 }, (_, i) => ({ email: `p${i}@x.com`, name: `Pessoa${i} Sobrenome` }));

describe("sendWave", () => {
  it("envia só o que o teto diário permite", async () => {
    const { store } = fakeStore(Array.from({ length: 98 }, () => new Date()));
    await store.seed(people);
    const { mailer, sent } = fakeMailer();
    const r = await sendWave({ ...common, store, mailer, dailyLimit: 100, requested: 50 });
    expect(r).toMatchObject({ allowed: 2, claimed: 2, sent: 2, failed: 0 });
    expect(sent).toHaveLength(2);
  });

  it("não reenvia para quem já recebeu (idempotência entre ondas)", async () => {
    const { store } = fakeStore();
    await store.seed(people);
    await store.seed(people); // seed repetido não duplica
    const { mailer, sent } = fakeMailer();
    await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 3 });
    await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 3 });
    await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 3 });
    expect(sent.map((m) => m.to).sort()).toEqual(people.map((p) => p.email).sort());
  });

  it("personaliza, assina o descadastro por destinatário e envia headers one-click", async () => {
    const { store } = fakeStore();
    await store.seed([{ email: "maria@x.com", name: "Maria Silva" }]);
    const { mailer, sent } = fakeMailer();
    await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 10 });
    const m = sent[0];
    expect(m.html).toContain("Olá, Maria!");
    expect(m.html).toContain("https://x.com/descadastro?e=maria%40x.com&amp;t="); // "&" escapado no HTML
    expect(m.text).toContain("https://x.com/descadastro?e=maria%40x.com&t=");
    expect(m.headers["List-Unsubscribe"]).toContain("https://x.com/api/public/descadastro?e=maria%40x.com&t=");
    expect(m.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("falha do provedor marca FAILED e NÃO tenta de novo na próxima onda", async () => {
    const { store, rows } = fakeStore();
    await store.seed(people.slice(0, 2));
    const { mailer, sent } = fakeMailer(1);
    const r1 = await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 10 });
    expect(r1).toMatchObject({ claimed: 2, sent: 0, failed: 2 });
    const r2 = await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 10 });
    expect(r2.claimed).toBe(0);
    expect(sent).toHaveLength(0);
    expect([...rows.values()].every((x) => x.status === "FAILED")).toBe(true);
  });

  it("divide em lotes do tamanho pedido", async () => {
    const { store } = fakeStore();
    await store.seed(people);
    let batches = 0;
    const mailer: Mailer = { async sendBatch(m) { batches++; return m.map((_, i) => `p${i}`); } };
    await sendWave({ ...common, store, mailer, dailyLimit: 1000, requested: 5, batchSize: 2 });
    expect(batches).toBe(3);
  });
});

describe("sendTestEmail", () => {
  it("envia uma mensagem [TESTE] para o destino", async () => {
    const { mailer, sent } = fakeMailer();
    await sendTestEmail({ ...common, mailer, to: "admin@x.com" });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("admin@x.com");
    expect(sent[0].subject).toBe("[TESTE] S");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/lib/mala-direta/sender.test.ts` → FAIL.

- [ ] **Step 3: Implementar `sender.ts`**

```ts
import { computeWaveSize } from "./wave";
import { renderPropagandaEmail, buildUnsubscribeHeaders } from "./template";
import { buildUnsubscribePageUrl, buildUnsubscribeOneClickUrl } from "./unsubscribe-token";
import type { Recipient } from "./recipients";

export type OutMessage = {
  from: string; to: string; subject: string; html: string; text: string;
  headers: Record<string, string>; replyTo?: string;
};
export interface Mailer { sendBatch(messages: OutMessage[]): Promise<string[]>; }
export type ClaimedRow = { id: string; email: string; name: string };
export interface SendStore {
  seed(recipients: Recipient[]): Promise<void>;
  claim(limit: number): Promise<ClaimedRow[]>;
  markSent(id: string, providerId: string | null): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  countSentSince(since: Date): Promise<number>;
}
export type CampaignContent = {
  subject: string; bodyText: string; ctaLabel?: string | null; ctaUrl?: string | null;
};
export type WaveOptions = {
  store: SendStore; mailer: Mailer; content: CampaignContent;
  appUrl: string; from: string; replyTo?: string;
  dailyLimit: number; requested: number; now?: Date; batchSize?: number;
};
export type WaveResult = { requested: number; allowed: number; claimed: number; sent: number; failed: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? "";
}

function buildMessage(
  to: { email: string; name: string },
  content: CampaignContent,
  o: { appUrl: string; from: string; replyTo?: string; subjectPrefix?: string },
): OutMessage {
  const { html, text } = renderPropagandaEmail({
    subject: content.subject,
    bodyText: content.bodyText,
    ctaLabel: content.ctaLabel,
    ctaUrl: content.ctaUrl,
    firstName: firstName(to.name),
    unsubscribeUrl: buildUnsubscribePageUrl(to.email, o.appUrl),
  });
  return {
    from: o.from,
    to: to.email,
    subject: `${o.subjectPrefix ?? ""}${content.subject}`,
    html,
    text,
    headers: buildUnsubscribeHeaders(buildUnsubscribeOneClickUrl(to.email, o.appUrl)),
    ...(o.replyTo ? { replyTo: o.replyTo } : {}),
  };
}

export async function sendWave(opts: WaveOptions): Promise<WaveResult> {
  const now = opts.now ?? new Date();
  const batchSize = opts.batchSize ?? 50;
  const sentLast24h = await opts.store.countSentSince(new Date(now.getTime() - DAY_MS));
  const allowed = computeWaveSize(opts.dailyLimit, sentLast24h, opts.requested);
  const result: WaveResult = { requested: opts.requested, allowed, claimed: 0, sent: 0, failed: 0 };
  if (allowed === 0) return result;

  const rows = await opts.store.claim(allowed);
  result.claimed = rows.length;

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const messages = chunk.map((r) => buildMessage(r, opts.content, opts));
    try {
      const ids = await opts.mailer.sendBatch(messages);
      for (let j = 0; j < chunk.length; j++) {
        await opts.store.markSent(chunk[j].id, ids[j] ?? null);
        result.sent++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      for (const r of chunk) {
        await opts.store.markFailed(r.id, msg);
        result.failed++;
      }
    }
  }
  return result;
}

export async function sendTestEmail(opts: {
  mailer: Mailer; content: CampaignContent; appUrl: string; from: string; replyTo?: string; to: string;
}): Promise<void> {
  const msg = buildMessage({ email: opts.to, name: "Teste" }, opts.content, {
    appUrl: opts.appUrl, from: opts.from, replyTo: opts.replyTo, subjectPrefix: "[TESTE] ",
  });
  await opts.mailer.sendBatch([msg]);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/mala-direta/sender.test.ts` → PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mala-direta/sender.ts src/lib/mala-direta/sender.test.ts
git commit -m "feat(mala-direta): envio em ondas idempotente com store/mailer injetáveis"
```

---

### Task 8: Adaptadores reais (Prisma store e Resend mailer)

**Files:**
- Create: `src/lib/mala-direta/prisma-store.ts`
- Create: `src/lib/mala-direta/resend-mailer.ts`

**Interfaces:**
- Consumes: `SendStore`, `Mailer`, `OutMessage` (T7); modelos Prisma (T5); `Recipient` (T4).
- Produces:
```ts
export function createPrismaSendStore(db: PrismaClient, cid: string, emailCampaignId: string): SendStore & {
  stats(): Promise<Record<"PENDING" | "SENDING" | "SENT" | "FAILED", number>>;
};
export function createResendMailer(): Mailer; // lança se RESEND_API_KEY ausente
```

Sem teste unitário (dependem de Postgres/Resend); validados na Task 13 (envio de teste e onda real pequena).

- [ ] **Step 1: `prisma-store.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import type { SendStore, ClaimedRow } from "./sender";
import type { Recipient } from "./recipients";

type Status = "PENDING" | "SENDING" | "SENT" | "FAILED";

export function createPrismaSendStore(db: PrismaClient, cid: string, emailCampaignId: string) {
  const store: SendStore & { stats(): Promise<Record<Status, number>> } = {
    async seed(recipients: Recipient[]) {
      for (let i = 0; i < recipients.length; i += 1000) {
        await db.emailCampaignSend.createMany({
          data: recipients.slice(i, i + 1000).map((r) => ({
            campaignId: cid, emailCampaignId, email: r.email, name: r.name,
          })),
          skipDuplicates: true,
        });
      }
    },
    async claim(limit: number) {
      // UPDATE ... SKIP LOCKED: duas requisições simultâneas nunca pegam a mesma linha.
      return db.$queryRaw<ClaimedRow[]>`
        UPDATE "EmailCampaignSend" SET status = 'SENDING'
        WHERE id IN (
          SELECT id FROM "EmailCampaignSend"
          WHERE "emailCampaignId" = ${emailCampaignId} AND status = 'PENDING'
          ORDER BY "createdAt", id
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, email, name`;
    },
    async markSent(id, providerId) {
      await db.emailCampaignSend.update({
        where: { id }, data: { status: "SENT", providerId, sentAt: new Date() },
      });
    },
    async markFailed(id, error) {
      await db.emailCampaignSend.update({
        where: { id }, data: { status: "FAILED", error: error.slice(0, 2000) },
      });
    },
    async countSentSince(since) {
      return db.emailCampaignSend.count({
        where: { campaignId: cid, status: "SENT", sentAt: { gte: since } },
      });
    },
    async stats() {
      const groups = await db.emailCampaignSend.groupBy({
        by: ["status"], where: { emailCampaignId }, _count: true,
      });
      const out: Record<Status, number> = { PENDING: 0, SENDING: 0, SENT: 0, FAILED: 0 };
      for (const g of groups) out[g.status as Status] = g._count;
      return out;
    },
  };
  return store;
}
```

- [ ] **Step 2: `resend-mailer.ts`**

```ts
import { Resend } from "resend";
import type { Mailer, OutMessage } from "./sender";

export function createResendMailer(): Mailer {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY ausente");
  const resend = new Resend(key);
  return {
    async sendBatch(messages: OutMessage[]) {
      const { data, error } = await resend.batch.send(
        messages.map((m) => ({
          from: m.from, to: m.to, subject: m.subject, html: m.html, text: m.text,
          headers: m.headers, ...(m.replyTo ? { replyTo: m.replyTo } : {}),
        })),
      );
      if (error || !data) throw new Error(error?.message ?? "Resend sem resposta");
      return data.data.map((d) => d.id);
    },
  };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros. Se `resend.batch.send` acusar tipo de `replyTo`, usar `reply_to` conforme o `.d.mts` de `resend@6.10` (`grep -n "replyTo\|reply_to" node_modules/resend/dist/index.d.mts | head`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/mala-direta/prisma-store.ts src/lib/mala-direta/resend-mailer.ts
git commit -m "feat(mala-direta): adaptadores Prisma (claim atômico) e Resend"
```

---

### Task 9: Descadastro público (API + página + middleware)

**Files:**
- Create: `src/app/api/public/descadastro/route.ts`
- Create: `src/app/descadastro/page.tsx`
- Create: `src/app/descadastro/descadastro-form.tsx`
- Modify: `src/middleware.ts` (matcher: adicionar `descadastro` à lista de exclusões)

**Interfaces:**
- Consumes: `verifyUnsubscribe`, `normalizeEmail`, `resolvePublicTenant`, `isRateLimited`, modelo `EmailSuppression`.
- Produces: `POST /api/public/descadastro?e=<email>&t=<token>` (aceita também JSON `{e,t}`), responde `200 {ok:true}`; `400` token inválido; `429` limite.

- [ ] **Step 1: Rota pública**

```ts
import { NextRequest, NextResponse } from "next/server";
import { resolvePublicTenant } from "@/lib/tenant-resolver";
import { isRateLimited } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/mala-direta/emails";
import { verifyUnsubscribe } from "@/lib/mala-direta/unsubscribe-token";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await isRateLimited("descadastro", ip, 30, 60)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
    }

    const url = new URL(req.url);
    let e = url.searchParams.get("e");
    let t = url.searchParams.get("t");
    if (!e || !t) {
      const body = await req.json().catch(() => ({}));
      e = e ?? body.e ?? null;
      t = t ?? body.t ?? null;
    }
    const email = normalizeEmail(e);
    if (!email || !t || !verifyUnsubscribe(email, t)) {
      return NextResponse.json({ error: "Link inválido" }, { status: 400 });
    }

    const { db, cid } = await resolvePublicTenant(req);
    await db.emailSuppression.upsert({
      where: { campaignId_email: { campaignId: cid, email } },
      create: { campaignId: cid, email, reason: "UNSUBSCRIBE" },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[descadastro] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Página `src/app/descadastro/page.tsx`**

```tsx
import { DescadastroForm } from "./descadastro-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cancelar recebimento de emails" };

export default function DescadastroPage({
  searchParams,
}: {
  searchParams: { e?: string; t?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a1220] px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0f1a2e] p-8 text-slate-200">
        <h1 className="text-xl font-bold text-white mb-2">Cancelar recebimento de emails</h1>
        <DescadastroForm email={searchParams.e ?? ""} token={searchParams.t ?? ""} />
      </div>
    </main>
  );
}
```

`src/app/descadastro/descadastro-form.tsx`:
```tsx
"use client";

import { useState } from "react";

export function DescadastroForm({ email, token }: { email: string; token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  if (!email || !token) {
    return <p className="text-slate-400">Link inválido. Use o link do rodapé do email recebido.</p>;
  }

  async function confirmar() {
    setState("loading");
    try {
      const res = await fetch("/api/public/descadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e: email, t: token }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="text-slate-300">Pronto. <strong>{email}</strong> não receberá mais emails da campanha.</p>;
  }
  return (
    <>
      <p className="text-slate-400 mb-6">
        Confirme para parar de receber emails da campanha em <strong className="text-slate-200">{email}</strong>.
      </p>
      <button
        onClick={confirmar}
        disabled={state === "loading"}
        className="w-full rounded-xl bg-[#ff6b04] py-3 font-bold text-[#0a1220] disabled:opacity-60"
      >
        {state === "loading" ? "Processando..." : "Confirmar cancelamento"}
      </button>
      {state === "error" && <p className="mt-4 text-red-400 text-sm">Não foi possível concluir. Tente novamente.</p>}
    </>
  );
}
```

- [ ] **Step 3: Middleware — deixar `/descadastro` público**

Em `src/middleware.ts`, no `matcher`, acrescentar `descadastro|` junto de `privacidade|`:

```
...|ebook|privacidade|descadastro|fotoperfil|r$|r/|api/public|...
```

- [ ] **Step 4: Typecheck e build de rotas**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/public/descadastro src/app/descadastro src/middleware.ts
git commit -m "feat(mala-direta): descadastro público (link e one-click)"
```

---

### Task 10: Webhook do Resend → supressão automática

**Files:**
- Create: `src/lib/mala-direta/webhook.ts`
- Test: `src/lib/mala-direta/webhook.test.ts`
- Create: `src/app/api/public/webhooks/resend/route.ts`

**Interfaces:**
- Produces:
```ts
export type SuppressionAction = { emails: string[]; reason: "BOUNCE" | "COMPLAINT"; emailId: string };
export function suppressionFromEvent(event: { type: string; data: any }): SuppressionAction | null;
```
Regra: `email.complained` → `COMPLAINT`; `email.bounced` só se `data.bounce.type === "Permanent"` → `BOUNCE`; qualquer outro evento → `null`.

- [ ] **Step 1: Teste falhando**

```ts
import { describe, it, expect } from "vitest";
import { suppressionFromEvent } from "./webhook";

const base = { email_id: "e1", to: ["A@B.com"] };

describe("suppressionFromEvent", () => {
  it("reclamação de spam suprime", () => {
    expect(suppressionFromEvent({ type: "email.complained", data: base })).toEqual({
      emails: ["a@b.com"], reason: "COMPLAINT", emailId: "e1",
    });
  });
  it("bounce permanente suprime", () => {
    expect(
      suppressionFromEvent({ type: "email.bounced", data: { ...base, bounce: { type: "Permanent" } } }),
    ).toEqual({ emails: ["a@b.com"], reason: "BOUNCE", emailId: "e1" });
  });
  it("bounce transitório e outros eventos não suprimem", () => {
    expect(
      suppressionFromEvent({ type: "email.bounced", data: { ...base, bounce: { type: "Transient" } } }),
    ).toBeNull();
    expect(suppressionFromEvent({ type: "email.delivered", data: base })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/lib/mala-direta/webhook.test.ts` → FAIL.

- [ ] **Step 3: Implementar `webhook.ts`**

```ts
import { normalizeEmail } from "./emails";

export type SuppressionAction = { emails: string[]; reason: "BOUNCE" | "COMPLAINT"; emailId: string };

type WebhookEventLike = {
  type: string;
  data: { email_id?: string; to?: string[]; bounce?: { type?: string } };
};

export function suppressionFromEvent(event: WebhookEventLike): SuppressionAction | null {
  const isComplaint = event.type === "email.complained";
  const isHardBounce = event.type === "email.bounced" && event.data.bounce?.type === "Permanent";
  if (!isComplaint && !isHardBounce) return null;
  const emails = (event.data.to ?? [])
    .map((e) => normalizeEmail(e))
    .filter((e): e is string => Boolean(e));
  if (emails.length === 0) return null;
  return { emails, reason: isComplaint ? "COMPLAINT" : "BOUNCE", emailId: event.data.email_id ?? "" };
}
```

- [ ] **Step 4: Rodar e ver passar** — PASS (3 testes).

- [ ] **Step 5: Rota do webhook**

`src/app/api/public/webhooks/resend/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { suppressionFromEvent } from "@/lib/mala-direta/webhook";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    const key = process.env.RESEND_API_KEY;
    if (!secret || !key) return NextResponse.json({ error: "Não configurado" }, { status: 503 });

    const payload = await req.text();
    let event;
    try {
      event = new Resend(key).webhooks.verify({
        payload,
        headers: {
          id: req.headers.get("svix-id") ?? "",
          timestamp: req.headers.get("svix-timestamp") ?? "",
          signature: req.headers.get("svix-signature") ?? "",
        },
        webhookSecret: secret,
      });
    } catch {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
    }

    const action = suppressionFromEvent(event as Parameters<typeof suppressionFromEvent>[0]);
    if (!action) return NextResponse.json({ ok: true, ignored: true });

    // O tenant vem do próprio envio (providerId), nunca do payload.
    const send = await db.emailCampaignSend.findFirst({
      where: { providerId: action.emailId },
      select: { campaignId: true },
    });
    if (!send) return NextResponse.json({ ok: true, ignored: true });

    for (const email of action.emails) {
      await db.emailSuppression.upsert({
        where: { campaignId_email: { campaignId: send.campaignId, email } },
        create: { campaignId: send.campaignId, email, reason: action.reason },
        update: {},
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook resend] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Typecheck + testes**

Run: `npm test && npx tsc --noEmit` → tudo verde.

- [ ] **Step 7: Commit**

```bash
git add src/lib/mala-direta/webhook.ts src/lib/mala-direta/webhook.test.ts src/app/api/public/webhooks
git commit -m "feat(mala-direta): webhook do Resend suprime bounce permanente e reclamação"
```

---

### Task 11: Rotas admin da mala direta

**Files:**
- Create: `src/lib/mala-direta/config.ts`
- Create: `src/app/api/mala-direta/dry-run/route.ts`
- Create: `src/app/api/mala-direta/campaigns/route.ts`
- Create: `src/app/api/mala-direta/campaigns/[id]/route.ts`
- Create: `src/app/api/mala-direta/campaigns/[id]/test/route.ts`
- Create: `src/app/api/mala-direta/campaigns/[id]/send/route.ts`

**Interfaces:**
- Consumes: `requireFinanceAdmin()` (retorna `{ ok, session, db, cid }` ou `{ ok:false, response }`), `loadRecipients`, `createPrismaSendStore`, `createResendMailer`, `sendWave`, `sendTestEmail`.
- Produces (JSON):
  - `GET /api/mala-direta/dry-run` → `{ stats: RecipientStats, dailyLimit: number, sentLast24h: number }`
  - `GET /api/mala-direta/campaigns` → `EmailCampaign[]` (50 mais recentes, `orderBy createdAt desc`)
  - `POST /api/mala-direta/campaigns` body `{ subject, bodyText, ctaLabel?, ctaUrl? }` → `201 EmailCampaign`
  - `GET /api/mala-direta/campaigns/:id` → `{ campaign, stats: {PENDING,SENDING,SENT,FAILED}, dailyLimit, sentLast24h }`
  - `POST .../test` body `{ to? }` (padrão: email da sessão) → `{ ok: true }`
  - `POST .../send` body `{ requested: number }` → `WaveResult`

- [ ] **Step 1: `config.ts`**

```ts
export function getMalaDiretaConfig() {
  const from = process.env.MALA_DIRETA_FROM;
  const appUrl = process.env.APP_URL;
  if (!from) throw new Error("MALA_DIRETA_FROM ausente");
  if (!appUrl) throw new Error("APP_URL ausente");
  return {
    from,
    appUrl: appUrl.replace(/\/$/, ""),
    replyTo: process.env.MALA_DIRETA_REPLY_TO || undefined,
    dailyLimit: Number(process.env.MALA_DIRETA_DAILY_LIMIT ?? "100"),
  };
}
```

- [ ] **Step 2: `dry-run/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { loadRecipients } from "@/lib/mala-direta/recipients";

export async function GET() {
  try {
    const gate = await requireFinanceAdmin();
    if (!gate.ok) return gate.response;
    const { db, cid } = gate;
    const { stats } = await loadRecipients(db, cid);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sentLast24h = await db.emailCampaignSend.count({
      where: { campaignId: cid, status: "SENT", sentAt: { gte: since } },
    });
    return NextResponse.json({
      stats, sentLast24h, dailyLimit: Number(process.env.MALA_DIRETA_DAILY_LIMIT ?? "100"),
    });
  } catch (err) {
    console.error("[mala-direta dry-run] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

- [ ] **Step 3: `campaigns/route.ts` (listar/criar, validação Zod)**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceAdmin } from "@/lib/finance-auth";

const createSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  bodyText: z.string().trim().min(10).max(20000),
  ctaLabel: z.string().trim().max(80).optional().or(z.literal("")),
  ctaUrl: z.string().trim().url().startsWith("https://").optional().or(z.literal("")),
});

export async function GET() {
  try {
    const gate = await requireFinanceAdmin();
    if (!gate.ok) return gate.response;
    const rows = await gate.db.emailCampaign.findMany({
      where: { campaignId: gate.cid }, orderBy: { createdAt: "desc" }, take: 50,
    });
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[mala-direta campaigns GET] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requireFinanceAdmin();
    if (!gate.ok) return gate.response;
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { subject, bodyText, ctaLabel, ctaUrl } = parsed.data;
    const created = await gate.db.emailCampaign.create({
      data: {
        campaignId: gate.cid, subject, bodyText,
        ctaLabel: ctaLabel || null, ctaUrl: ctaUrl || null,
        createdBy: gate.session.user.id,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[mala-direta campaigns POST] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

- [ ] **Step 4: `campaigns/[id]/route.ts` (status)**

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { createPrismaSendStore } from "@/lib/mala-direta/prisma-store";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gate = await requireFinanceAdmin();
    if (!gate.ok) return gate.response;
    const campaign = await gate.db.emailCampaign.findFirst({
      where: { id: params.id, campaignId: gate.cid },
    });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const store = createPrismaSendStore(gate.db, gate.cid, campaign.id);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return NextResponse.json({
      campaign,
      stats: await store.stats(),
      sentLast24h: await store.countSentSince(since),
      dailyLimit: Number(process.env.MALA_DIRETA_DAILY_LIMIT ?? "100"),
    });
  } catch (err) {
    console.error("[mala-direta campaign GET] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

- [ ] **Step 5: `campaigns/[id]/test/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { getMalaDiretaConfig } from "@/lib/mala-direta/config";
import { createResendMailer } from "@/lib/mala-direta/resend-mailer";
import { sendTestEmail } from "@/lib/mala-direta/sender";
import { isSendableEmail, normalizeEmail } from "@/lib/mala-direta/emails";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gate = await requireFinanceAdmin();
    if (!gate.ok) return gate.response;
    const campaign = await gate.db.emailCampaign.findFirst({
      where: { id: params.id, campaignId: gate.cid },
    });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const to = normalizeEmail(body.to) ?? normalizeEmail(gate.session.user.email);
    if (!to || !isSendableEmail(to)) {
      return NextResponse.json({ error: "Email de teste inválido" }, { status: 400 });
    }

    const cfg = getMalaDiretaConfig();
    await sendTestEmail({
      mailer: createResendMailer(), content: campaign,
      appUrl: cfg.appUrl, from: cfg.from, replyTo: cfg.replyTo, to,
    });
    return NextResponse.json({ ok: true, to });
  } catch (err) {
    console.error("[mala-direta test] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

- [ ] **Step 6: `campaigns/[id]/send/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceAdmin } from "@/lib/finance-auth";
import { getMalaDiretaConfig } from "@/lib/mala-direta/config";
import { loadRecipients } from "@/lib/mala-direta/recipients";
import { createPrismaSendStore } from "@/lib/mala-direta/prisma-store";
import { createResendMailer } from "@/lib/mala-direta/resend-mailer";
import { sendWave } from "@/lib/mala-direta/sender";

export const maxDuration = 60;

const bodySchema = z.object({ requested: z.number().int().min(1).max(5000) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gate = await requireFinanceAdmin();
    if (!gate.ok) return gate.response;
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "requested inválido" }, { status: 400 });

    const campaign = await gate.db.emailCampaign.findFirst({
      where: { id: params.id, campaignId: gate.cid },
    });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const cfg = getMalaDiretaConfig();
    const store = createPrismaSendStore(gate.db, gate.cid, campaign.id);

    // Seed idempotente: quem já está na tabela é ignorado; supressões novas já ficam de fora.
    const { recipients } = await loadRecipients(gate.db, gate.cid);
    await store.seed(recipients);

    const result = await sendWave({
      store, mailer: createResendMailer(), content: campaign,
      appUrl: cfg.appUrl, from: cfg.from, replyTo: cfg.replyTo,
      dailyLimit: cfg.dailyLimit, requested: parsed.data.requested,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[mala-direta send] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

> **Supressão depois do seed:** quem pediu descadastro *depois* de já estar `PENDING` numa mala direta precisa ser pulado. No `claim`, o `sendWave` não conhece a supressão. Correção (Step 7).

- [ ] **Step 7: Pular suprimidos que já estavam `PENDING`**

Em `prisma-store.ts`, dentro do `SELECT` interno de `claim`, acrescentar a condição:

```sql
AND NOT EXISTS (
  SELECT 1 FROM "EmailSuppression" s
  WHERE s."campaignId" = "EmailCampaignSend"."campaignId"
    AND s.email = "EmailCampaignSend".email
)
```
(ficando: `WHERE "emailCampaignId" = ${emailCampaignId} AND status = 'PENDING' AND NOT EXISTS (...)`). As linhas suprimidas permanecem `PENDING` e nunca são enviadas.

- [ ] **Step 8: Typecheck + testes**

Run: `npm test && npx tsc --noEmit` → verde.

- [ ] **Step 9: Commit**

```bash
git add src/lib/mala-direta/config.ts src/lib/mala-direta/prisma-store.ts src/app/api/mala-direta
git commit -m "feat(mala-direta): rotas admin (dry-run, campanhas, teste, envio em ondas)"
```

---

### Task 12: Página admin `/mala-direta` e menu

**Files:**
- Create: `src/app/(dashboard)/mala-direta/page.tsx`
- Modify: `src/components/sidebar.tsx` (item de menu, ícone `Mail` de `lucide-react`)

**Interfaces:** Consumes as rotas da Task 11.

- [ ] **Step 1: Menu — no array de itens do `sidebar.tsx`, logo após a linha de `/comunicados`:**

```tsx
  { href: "/mala-direta",    icon: Mail,             label: "Mala direta",     minRole: "ADMIN",  superAdminOnly: false, financeAdminOnly: true,  leadsOnly: false },
```
E acrescentar `Mail` ao import de `lucide-react` desse arquivo (conferir se já está importado).

- [ ] **Step 2: Página**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Stats = { totalRows: number; semEmail: number; invalido: number; duplicado: number; suprimido: number; final: number };
type Campaign = { id: string; subject: string; bodyText: string; ctaLabel: string | null; ctaUrl: string | null; createdAt: string };
type Status = { PENDING: number; SENDING: number; SENT: number; FAILED: number };
type Detail = { campaign: Campaign; stats: Status; sentLast24h: number; dailyLimit: number };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Erro");
  return json as T;
}

export default function MalaDiretaPage() {
  const [dry, setDry] = useState<{ stats: Stats; sentLast24h: number; dailyLimit: number } | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [form, setForm] = useState({ subject: "", bodyText: "", ctaLabel: "", ctaUrl: "" });
  const [wave, setWave] = useState(100);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      setDry(await api("/api/mala-direta/dry-run"));
      setCampaigns(await api("/api/mala-direta/campaigns"));
    } catch (e) { toast.error((e as Error).message); }
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    try { setSelected(await api(`/api/mala-direta/campaigns/${id}`)); }
    catch (e) { toast.error((e as Error).message); }
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  async function salvar() {
    setBusy(true);
    try {
      const c = await api<Campaign>("/api/mala-direta/campaigns", { method: "POST", body: JSON.stringify(form) });
      toast.success("Rascunho salvo");
      await loadAll();
      await loadDetail(c.id);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function testar() {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await api<{ to: string }>(`/api/mala-direta/campaigns/${selected.campaign.id}/test`, { method: "POST", body: "{}" });
      toast.success(`Teste enviado para ${r.to}`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function enviarOnda() {
    if (!selected) return;
    const restante = selected.stats.PENDING;
    if (!window.confirm(`Enviar até ${wave} emails agora? (pendentes: ${restante}). Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    try {
      const r = await api<{ claimed: number; sent: number; failed: number }>(
        `/api/mala-direta/campaigns/${selected.campaign.id}/send`,
        { method: "POST", body: JSON.stringify({ requested: wave }) },
      );
      toast.success(`Enviados: ${r.sent} · Falhas: ${r.failed}`);
      await loadDetail(selected.campaign.id);
      await loadAll();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Mala direta</h1>

      <section className="rounded-xl border p-4 space-y-1">
        <h2 className="font-semibold">Público (dry-run)</h2>
        {dry ? (
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{dry.stats.final}</strong> destinatários · {dry.stats.semEmail} sem email ·{" "}
            {dry.stats.invalido} inválidos · {dry.stats.duplicado} duplicados · {dry.stats.suprimido} descadastrados ·
            enviados nas últimas 24h: {dry.sentLast24h}/{dry.dailyLimit}
          </p>
        ) : <p className="text-sm">Carregando…</p>}
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">Nova mala direta</h2>
        <div><Label>Assunto</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
        <div>
          <Label>Texto (use {"{{nome}}"} para o primeiro nome; linha em branco separa parágrafos)</Label>
          <Textarea rows={10} value={form.bodyText} onChange={(e) => setForm({ ...form, bodyText: e.target.value })} />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Texto do botão (opcional)</Label><Input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} /></div>
          <div><Label>Link do botão (https)</Label><Input value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} /></div>
        </div>
        <Button onClick={salvar} disabled={busy}>Salvar rascunho</Button>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">Rascunhos e envios</h2>
        <ul className="divide-y">
          {campaigns.map((c) => (
            <li key={c.id}>
              <button className="w-full text-left py-2 hover:underline" onClick={() => loadDetail(c.id)}>
                {c.subject} <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString("pt-BR")}</span>
              </button>
            </li>
          ))}
        </ul>

        {selected && (
          <div className="rounded-lg bg-muted/40 p-3 space-y-3">
            <p className="text-sm">
              <strong>{selected.campaign.subject}</strong> — pendentes {selected.stats.PENDING} · enviados {selected.stats.SENT} ·
              falhas {selected.stats.FAILED} · em envio {selected.stats.SENDING} · 24h: {selected.sentLast24h}/{selected.dailyLimit}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <Button variant="outline" onClick={testar} disabled={busy}>Enviar teste para mim</Button>
              <div>
                <Label>Tamanho da onda</Label>
                <Input type="number" min={1} value={wave} onChange={(e) => setWave(Number(e.target.value))} className="w-28" />
              </div>
              <Button onClick={enviarOnda} disabled={busy}>Enviar onda</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/mala-direta" src/components/sidebar.tsx
git commit -m "feat(mala-direta): página admin e item de menu"
```

---

### Task 13: Configuração, deploy e verificação ponta a ponta (sem envio em massa)

**Files:** nenhum arquivo de código. Configuração na Vercel/Resend.

- [ ] **Step 1: Pré-requisitos no painel do Resend** (feito pelo usuário)
  - Domínio remetente **Verified** (SPF + DKIM verdes; DMARC recomendado).
  - Criar webhook apontando para `https://<APP_URL>/api/public/webhooks/resend` com eventos `email.bounced` e `email.complained`; copiar o *Signing Secret*.
  - Decidir plano: free = 100/dia (3.000/mês); Pro recomendado para alcançar ~2.460 destinatários antes de 04/10/2026.

- [ ] **Step 2: Variáveis de ambiente na Vercel (Production)**

```bash
cd /Users/apple/Projects/base-andre-santos
vercel env add UNSUBSCRIBE_SECRET production      # valor: openssl rand -base64 32
vercel env add RESEND_WEBHOOK_SECRET production   # signing secret do webhook
vercel env add MALA_DIRETA_FROM production        # ex.: André Santos <contato@DOMINIO-VERIFICADO>
vercel env add MALA_DIRETA_REPLY_TO production    # opcional
vercel env add MALA_DIRETA_DAILY_LIMIT production # 100 (free) ou 500 (Pro)
```
Conferir que `APP_URL` de produção é o domínio público que serve este projeto (`https://leads.prandresantos.com.br`), pois os links de descadastro usam esse host e o tenant é resolvido por ele.

- [ ] **Step 3: Push, build e deploy**

```bash
git push
vercel ls | head -5        # confirmar deploy Ready; se não houver, rodar: vercel --prod --yes
```
O build roda `prisma db push` e cria as 3 tabelas novas. Verificar nos logs do build que não houve "db push skipped".

- [ ] **Step 4: Rodar a suíte final localmente**

Run: `npm test && npx tsc --noEmit`
Expected: todos os testes verdes.

- [ ] **Step 5: Verificação manual em produção** (usuário loga como dono/finance admin)
  1. `/mala-direta` abre e mostra o dry-run com ≈ 2.4xx destinatários.
  2. Salvar um rascunho de teste curto → "Enviar teste para mim" → email chega.
  3. No email de teste (Gmail → ⋮ → *Mostrar original*): **SPF/DKIM/DMARC = PASS**, cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post` presentes; rodapé com CNPJ e "Propaganda eleitoral".
  4. Botão "Cancelar inscrição" do Gmail (one-click) **ou** o link do rodapé → página confirma → o dry-run cai em 1 (`descadastrados`).
  5. Remover a supressão do próprio email de teste com um script one-shot (padrão da memória `base-andre-santos-prod-db-query`: `vercel env pull`, `.cjs` dentro do projeto com `PrismaPg`, apagar script e `.env.production.local` depois) executando `db.emailSuppression.deleteMany({ where: { email: "<email-do-teste>" } })` e `db.emailCampaign.deleteMany({ where: { subject: "<assunto-do-rascunho-de-teste>" } })`.
  6. Onda-piloto: enviar **10** para confirmar entrega e ver os 10 como `SENT`; repetir o clique em "Enviar onda" com valor 10 e confirmar que **não reenvia** os mesmos (idempotência real).

- [ ] **Step 6: Atualizar `.claude/estado.md`** com a seção "Mala direta" (env vars, tabelas, limites, como operar) e commitar.

---

### Task 14: Importar os 25 leads da planilha "Leads" (one-shot)

**Files:**
- Create (temporário, apagado ao final): `import-leads-planilha.cjs`
- Create (temporário, gitignored): `temporaria/leads-planilha.csv`

**Contexto:** a planilha Google "Leads" (id `140zSJYuI7gjKxs6I_AFoR2rPf5V7LdC2-8Ke1Q3zHEI`) tinha 25 emails que não existem no banco (cruzamento de 2026-09-21). Nenhum dado volta para a planilha; o importador só grava no banco. **Não** marcar `lgpdConsent`.

- [ ] **Step 1: Gerar o CSV completo com telefone e CEP**

Ler a planilha pelo conector do Google Drive (`read_file_content` com o id acima) e salvar `temporaria/leads-planilha.csv` com cabeçalho `nome,email,whatsapp,cep`, uma linha por lead, ignorando linhas sem email e as de teste (`Teste Diag`, `x@x.com`). O `.gitignore` já ignora `temporaria/*.csv`.

- [ ] **Step 2: Escrever o script (dry-run por padrão)**

`import-leads-planilha.cjs`:
```js
require('dotenv').config({ path: '.env.production.local' });
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL }) });
const APPLY = process.argv.includes('--apply');
const CID = 'andre-santos-2026';
const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const last8 = (p) => (p.replace(/\D/g, '').slice(-8) || null);

(async () => {
  const rows = fs.readFileSync('temporaria/leads-planilha.csv', 'utf8').trim().split('\n').slice(1).map((l) => {
    const [nome, email, whatsapp] = l.split(',');
    return { nome: nome.trim(), email: (email ?? '').trim().toLowerCase(), phone: (whatsapp ?? '').replace(/\D/g, '') };
  }).filter((r) => re.test(r.email));

  const existing = await db.collaborator.findMany({ where: { campaignId: CID }, select: { id: true, email: true, phoneNormalized: true } });
  const emails = new Set(existing.filter((c) => c.email).map((c) => c.email.trim().toLowerCase()));
  const phones = new Map(existing.filter((c) => c.phoneNormalized).map((c) => [c.phoneNormalized, c]));

  const seen = new Set();
  let criar = 0, jaTemEmail = 0, telefoneExistente = 0;
  for (const r of rows) {
    if (seen.has(r.email)) continue; seen.add(r.email);
    if (emails.has(r.email)) { jaTemEmail++; continue; }
    const pn = last8(r.phone);
    if (pn && phones.has(pn)) {
      telefoneExistente++;
      if (APPLY) await db.collaborator.updateMany({ where: { id: phones.get(pn).id, email: null }, data: { email: r.email } });
      continue;
    }
    criar++;
    if (APPLY) {
      await db.collaborator.create({ data: {
        campaignId: CID, name: r.nome, email: r.email, phone: r.phone || null, phoneNormalized: pn,
        status: 'LEAD', campaignRole: 'VOLUNTARIO', source: 'PLANILHA_LEADS', channel: 'LINK',
        lgpdConsent: false,
      } });
    }
  }
  console.log({ modo: APPLY ? 'APLICADO' : 'DRY-RUN', linhas: rows.length, jaTemEmail, telefoneExistenteAtualizaEmailSeVazio: telefoneExistente, criar });
  await db.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
```

- [ ] **Step 3: Rodar em dry-run e conferir que `criar` ≈ 25**

```bash
vercel env pull .env.production.local --environment=production --yes
node import-leads-planilha.cjs
```
Expected: `modo: 'DRY-RUN'`, `criar` próximo de 25 (linhas cujo telefone já existe com outro email só atualizam o email quando estava vazio).

- [ ] **Step 4: Aplicar e conferir**

```bash
node import-leads-planilha.cjs --apply
node import-leads-planilha.cjs        # segunda execução: criar deve ser 0
```

- [ ] **Step 5: Limpar credenciais e script**

```bash
rm -f import-leads-planilha.cjs .env.production.local temporaria/leads-planilha.csv
ls -a | grep -c "env.production\|import-leads"   # esperado: 0
```
Nada a commitar (script descartado).

---

## Self-Review (spec × plano)

- **Público/dedup/exclusões** → T2 (validação, Wix), T4 (`buildRecipients`, `INACTIVE` excluído via `loadRecipients`). Nota: os 11 `INACTIVE` do censo saem da lista (decisão do plano; reverter removendo `status: { not: "INACTIVE" }` em `loadRecipients`).
- **1. `EmailSuppression`** → T5 (modelo), T10 (bounce/reclamação), T9 (descadastro).
- **2. Descadastro** com link + one-click + headers → T3, T6, T9. Duas URLs distintas (página humana e API POST) porque o one-click do Gmail faz POST direto na URL do header.
- **3. Template** com CNPJ/propaganda eleitoral/motivo/link → T6.
- **4. Ferramenta** prévia (dry-run), teste, disparo em ondas, idempotência → T7, T8, T11, T12. "Prévia do email" visual: o email de teste cumpre o papel; prévia inline fica fora (YAGNI).
- **5. Pré-requisitos** (SPF/DKIM/DMARC, plano Resend) → T13 Step 1.
- **6. Formulário de leads** → **Plano B** (`2026-09-21-formulario-leads-banco.md`, repo `andre-santos`). Importação dos 25 → T14.
- **Tipos:** `Recipient`, `SendStore`, `Mailer`, `OutMessage`, `WaveResult`, `computeWaveSize` usam as mesmas assinaturas em T4–T11.
