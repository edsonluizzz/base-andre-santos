# Formulário de leads grava no banco — Implementation Plan (repo `andre-santos`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O formulário `/leads` do site (ebook "Quem Sou Eu") deixa de gravar na planilha Google (Apps Script) e passa a gravar direto no banco da campanha, com checkbox de consentimento LGPD obrigatório e cidade/bairro resolvidos pelo CEP.

**Architecture:** `app/api/leads/route.ts` valida o formulário e repassa para `POST https://leads.prandresantos.com.br/api/public/cadastro` (mesmo padrão já usado por `app/api/grupo/route.ts`). Validação e montagem do payload ficam em `lib/leads-payload.ts` (funções puras, testadas com o runner nativo do Node). A cidade vem do ViaCEP no servidor, com timeout — falha do ViaCEP nunca bloqueia o cadastro.

**Tech Stack:** Next.js 16.2 (leia `node_modules/next/dist/docs/` antes de mexer em rotas — regra do `AGENTS.md`), React 19, TypeScript. Testes: `node --test` (Node 24 executa `.ts` nativamente; sem dependência nova).

**Spec:** `docs/superpowers/specs/2026-09-21-mala-direta-email-design.md` (componente 6). Repo do spec: `base-andre-santos`. Este plano executa em `/Users/apple/Projects/andre-santos`; a Task 3 toca o repo `base-andre-santos`.

## Global Constraints

- PT-BR com acentuação correta em toda UI e mensagem.
- Nunca marcar consentimento sem o usuário marcar o checkbox: `aceite` precisa ser exatamente `true` no servidor.
- Nunca deixar de gravar um cadastro porque o ViaCEP falhou (timeout de 3 s, resposta ignorada em erro).
- O contrato JSON da rota para o front continua `{ success: boolean, error?: string }`.
- `source` enviado ao cadastro: `EBOOK_QUEM_SOU_EU` e `channel`: `LINK` (já existem na base: 70 cadastros; prefixo `EBOOK_` usa o rate-limit alto do endpoint, o que evita 429 quando o tráfego passa pelo mesmo IP de saída do servidor).
- A planilha "Leads" deixa de receber dados, mas **não** é apagada; a URL do Apps Script sai do código.
- Commit + push após cada task validada; confirmar deploy com `vercel ls` (se não deployar sozinho: `vercel --prod --yes`).

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `lib/leads-payload.ts` (criar) | `cepDigits`, `validateLead`, `buildCadastroPayload` (puras) |
| `lib/leads-payload.test.ts` (criar) | Testes do módulo acima (`node --test`) |
| `lib/viacep.ts` (criar) | `lookupCep(cep)` com timeout; nunca lança |
| `app/api/leads/route.ts` (reescrever) | Validar → ViaCEP → repassar ao cadastro |
| `app/leads/page.tsx` (modificar) | Checkbox de consentimento + envio de `aceite` |
| `package.json` (modificar) | Script `test` |
| `base-andre-santos/src/app/api/public/cadastro/route.ts` (Task 3) | Preencher email de cadastro existente |

---

### Task 1: Funções puras de validação e payload

**Files:**
- Create: `lib/leads-payload.ts`
- Test: `lib/leads-payload.test.ts`
- Modify: `package.json` (script `"test": "node --test lib/*.test.ts"`)

**Interfaces:** Produces:
```ts
export type ValidLead = { name: string; email: string; phone: string; cep: string };
export type Geo = { city?: string; neighborhood?: string } | null;
export function cepDigits(raw: unknown): string | null; // 8 dígitos ou null
export function validateLead(input: {
  name: unknown; email: unknown; whatsapp: unknown; cep: unknown; aceite: unknown;
}): { ok: true; lead: ValidLead } | { ok: false; error: string };
export function buildCadastroPayload(lead: ValidLead, geo: Geo): {
  name: string; phone: string; email: string; city?: string; neighborhood?: string;
  lgpdConsent: true; source: "EBOOK_QUEM_SOU_EU"; channel: "LINK";
};
```
Regras de `validateLead`: nome 2–200 chars; email formato válido, ≤ 254, minúsculo; WhatsApp 10–13 dígitos; CEP com 8 dígitos (aceita `83.183-000`, `83183000`, `83183 000`); `aceite === true`.

- [ ] **Step 1: Teste falhando**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { cepDigits, validateLead, buildCadastroPayload } from "./leads-payload.ts";

const ok = { name: "Maria Silva", email: "Maria@Gmail.com ", whatsapp: "(41) 99988-8951", cep: "83.045-170", aceite: true };

test("cepDigits aceita formatos comuns e rejeita inválidos", () => {
  assert.equal(cepDigits("83.045-170"), "83045170");
  assert.equal(cepDigits("83045 170"), "83045170");
  assert.equal(cepDigits("8304517"), null);
  assert.equal(cepDigits("134295899"), null);
  assert.equal(cepDigits(undefined), null);
});

test("validateLead aceita e normaliza", () => {
  const r = validateLead(ok);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.lead, { name: "Maria Silva", email: "maria@gmail.com", phone: "41999888951", cep: "83045170" });
});

test("validateLead exige o aceite exatamente true", () => {
  for (const aceite of [false, undefined, "on", "true", 1]) {
    const r = validateLead({ ...ok, aceite });
    assert.equal(r.ok, false);
  }
});

test("validateLead rejeita nome curto, email inválido, telefone curto e CEP inválido", () => {
  assert.equal(validateLead({ ...ok, name: "A" }).ok, false);
  assert.equal(validateLead({ ...ok, email: "sem-arroba" }).ok, false);
  assert.equal(validateLead({ ...ok, whatsapp: "1234" }).ok, false);
  assert.equal(validateLead({ ...ok, cep: "123" }).ok, false);
  assert.equal(validateLead({ ...ok, name: undefined }).ok, false);
});

test("buildCadastroPayload monta o contrato do /api/public/cadastro", () => {
  const lead = { name: "Maria Silva", email: "maria@gmail.com", phone: "41999888951", cep: "83045170" };
  assert.deepEqual(buildCadastroPayload(lead, { city: "São José dos Pinhais", neighborhood: "Afonso Pena" }), {
    name: "Maria Silva", phone: "41999888951", email: "maria@gmail.com",
    city: "São José dos Pinhais", neighborhood: "Afonso Pena",
    lgpdConsent: true, source: "EBOOK_QUEM_SOU_EU", channel: "LINK",
  });
  const semGeo = buildCadastroPayload(lead, null);
  assert.equal("city" in semGeo, false);
  assert.equal("neighborhood" in semGeo, false);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd /Users/apple/Projects/andre-santos && node --test lib/leads-payload.test.ts`
Expected: FAIL (`Cannot find module './leads-payload.ts'`).

- [ ] **Step 3: Implementar `lib/leads-payload.ts`** (sem imports — necessário para rodar com type-stripping)

```ts
export type ValidLead = { name: string; email: string; phone: string; cep: string };
export type Geo = { city?: string; neighborhood?: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cepDigits(raw: unknown): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d.length === 8 ? d : null;
}

export function validateLead(input: {
  name: unknown; email: unknown; whatsapp: unknown; cep: unknown; aceite: unknown;
}): { ok: true; lead: ValidLead } | { ok: false; error: string } {
  const name = String(input.name ?? "").trim().slice(0, 200);
  const email = String(input.email ?? "").trim().toLowerCase();
  const phone = String(input.whatsapp ?? "").replace(/\D/g, "");
  const cep = cepDigits(input.cep);

  if (name.length < 2) return { ok: false, error: "Informe seu nome" };
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: "Email inválido" };
  if (phone.length < 10 || phone.length > 13) return { ok: false, error: "WhatsApp inválido" };
  if (!cep) return { ok: false, error: "CEP inválido (formato: 00000-000)" };
  if (input.aceite !== true) return { ok: false, error: "É necessário aceitar o uso dos dados para continuar" };

  return { ok: true, lead: { name, email, phone, cep } };
}

export function buildCadastroPayload(lead: ValidLead, geo: Geo) {
  return {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    ...(geo?.city ? { city: geo.city } : {}),
    ...(geo?.neighborhood ? { neighborhood: geo.neighborhood } : {}),
    lgpdConsent: true as const,
    source: "EBOOK_QUEM_SOU_EU" as const,
    channel: "LINK" as const,
  };
}
```

- [ ] **Step 4: Script de teste em `package.json` → `"scripts"`**

```json
"test": "node --test lib/*.test.ts",
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: 5 testes passando.

- [ ] **Step 6: Commit**

```bash
git add lib/leads-payload.ts lib/leads-payload.test.ts package.json
git commit -m "feat(leads): validação e payload puros para cadastro no banco"
```

---

### Task 2: Rota `/api/leads` grava no banco + ViaCEP + checkbox LGPD

**Files:**
- Create: `lib/viacep.ts`
- Modify (reescrever): `app/api/leads/route.ts`
- Modify: `app/leads/page.tsx`

**Interfaces:**
- Consumes: `validateLead`, `buildCadastroPayload`, `Geo` (Task 1).
- Produces: `lookupCep(cep: string): Promise<Geo>` (nunca lança; `null` em qualquer falha). Rota mantém `POST /api/leads` → `{ success: true }` | `{ success: false, error }`.

- [ ] **Step 1: Ler as docs do Next 16 relevantes**

Run: `ls node_modules/next/dist/docs/ | head -30` e abrir o guia de Route Handlers. Confirmar que `NextRequest`/`NextResponse` e `export async function POST` continuam válidos (a rota atual já usa esse formato e funciona em produção).

- [ ] **Step 2: Criar `lib/viacep.ts`**

```ts
import type { Geo } from "@/lib/leads-payload";

type ViaCepResponse = { erro?: boolean | string; localidade?: string; bairro?: string };

/** Resolve cidade/bairro pelo CEP. Nunca lança: em qualquer falha devolve null. */
export async function lookupCep(cep: string): Promise<Geo> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepResponse;
    if (data.erro) return null;
    const city = data.localidade?.trim();
    const neighborhood = data.bairro?.trim();
    if (!city && !neighborhood) return null;
    return { ...(city ? { city } : {}), ...(neighborhood ? { neighborhood } : {}) };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Reescrever `app/api/leads/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server"
import { validateLead, buildCadastroPayload } from "@/lib/leads-payload"
import { lookupCep } from "@/lib/viacep"

const CADASTRO_ENDPOINT =
  process.env.CADASTRO_ENDPOINT_URL ?? "https://leads.prandresantos.com.br/api/public/cadastro"

// Best-effort rate limiter — in-memory per serverless instance (5 req/min per IP)
// (o /api/public/cadastro também rate-limita; isto é uma camada extra local)
const rlMap = new Map<string, { n: number; reset: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rlMap.get(ip)
  if (!entry || entry.reset <= now) {
    rlMap.set(ip, { n: 1, reset: now + 60_000 })
    return false
  }
  if (entry.n >= 5) return true
  entry.n++
  return false
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    if (isRateLimited(ip)) {
      return NextResponse.json({ success: false, error: "Muitas requisições. Aguarde um minuto." }, { status: 429 })
    }

    const body = await req.json()
    const parsed = validateLead({
      name: body.name, email: body.email, whatsapp: body.whatsapp, cep: body.cep, aceite: body.aceite,
    })
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
    }

    const geo = await lookupCep(parsed.lead.cep)
    const payload = buildCadastroPayload(parsed.lead, geo)

    const res = await fetch(CADASTRO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      return NextResponse.json(
        { success: false, error: errBody.error ?? "Erro ao salvar cadastro" },
        { status: res.status === 429 ? 429 : 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Leads API error:", err)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
```

- [ ] **Step 4: Front — `app/leads/page.tsx`**

No `payload` de `handleSubmit`, trocar o objeto por (removendo os campos `_subject`/`_captcha`, que só serviam à planilha):

```tsx
    const payload = {
      name: fd.get("nome"),
      email: fd.get("email"),
      cep: fd.get("cep"),
      whatsapp: fd.get("whatsapp"),
      aceite: fd.get("aceite") === "on",
    }
```

Logo **antes** do bloco `{formState === "error" && (...)}` do formulário, inserir o checkbox:

```tsx
                    <label className="flex items-start gap-3 cursor-pointer text-left">
                      <input
                        type="checkbox"
                        name="aceite"
                        required
                        className="mt-1 h-4 w-4 shrink-0 accent-[#ff6b04]"
                      />
                      <span className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                        Autorizo o uso dos meus dados pessoais (nome, e-mail, WhatsApp e CEP) pela campanha de
                        André Santos para fins de comunicação política, incluindo o envio de mensagens por e-mail e
                        WhatsApp, conforme a{" "}
                        <a
                          href="https://leads.prandresantos.com.br/privacidade"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                          style={{ color: "#ff6b04" }}
                        >
                          Política de Privacidade
                        </a>
                        .
                      </span>
                    </label>
```

E trocar o texto de rodapé `🔒 Seus dados estão seguros. Sem spam, prometemos.` por:
`🔒 Seus dados estão seguros. Você pode cancelar o recebimento a qualquer momento.`

- [ ] **Step 5: Testes, lint e build**

Run: `npm test && npm run lint && npm run build`
Expected: testes verdes; lint e build sem erros.

- [ ] **Step 6: Smoke local com endpoint falso (não cria lead em produção)**

Terminal A — stub que registra o corpo:
```bash
node -e "require('http').createServer((q,s)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{console.log(q.method,q.url,b);s.setHeader('content-type','application/json');s.end('{\"message\":\"ok\"}')})}).listen(4010)"
```
Terminal B:
```bash
CADASTRO_ENDPOINT_URL=http://localhost:4010/api/public/cadastro npm run dev
```
Terminal C:
```bash
# sem aceite → 400
curl -s -X POST localhost:3000/api/leads -H 'content-type: application/json' \
  -d '{"name":"Teste Local","email":"t@t.com","whatsapp":"41999998888","cep":"83045-170","aceite":false}'
# com aceite → success, e o stub imprime city/neighborhood do ViaCEP + lgpdConsent:true + source EBOOK_QUEM_SOU_EU
curl -s -X POST localhost:3000/api/leads -H 'content-type: application/json' \
  -d '{"name":"Teste Local","email":"t@t.com","whatsapp":"41999998888","cep":"83045-170","aceite":true}'
```
Expected: 1ª resposta `{"success":false,"error":"É necessário aceitar..."}`; 2ª `{"success":true}` e o stub mostra o corpo com `"city":"São José dos Pinhais"` (ou o retorno real do ViaCEP para esse CEP), `"lgpdConsent":true`, `"source":"EBOOK_QUEM_SOU_EU"`, `"channel":"LINK"`. Abrir `http://localhost:3000/leads`, conferir visualmente o checkbox e que o botão não envia sem marcá-lo. Encerrar os processos.

- [ ] **Step 7: Commit e deploy**

```bash
git add lib/viacep.ts app/api/leads/route.ts app/leads/page.tsx
git commit -m "feat(leads): formulário grava no banco via /api/public/cadastro, com checkbox LGPD e cidade pelo CEP"
git push
vercel ls | head -5    # confirmar Ready; senão: vercel --prod --yes
```

- [ ] **Step 8: Verificação em produção**

1. Abrir `https://prandresantos.com.br/leads`, enviar o formulário com **dados do próprio dono** e o checkbox marcado.
2. Conferir em `https://leads.prandresantos.com.br` (Colaboradores) que o cadastro aparece como `LEAD`, com email, cidade e consentimento LGPD. (Se o telefone já existia, o endpoint responde "Cadastro já realizado" sem criar — comportamento esperado; ver Task 3.)
3. Confirmar que **nenhuma linha nova** apareceu na planilha "Leads".

---

### Task 3: Endpoint de cadastro completa o email de um cadastro existente (repo `base-andre-santos`)

**Por quê:** o `/api/public/cadastro` deduplica por telefone e retorna 200 sem gravar nada. Quem já está na base sem email e reenvia o formulário (agora com email) perderia o email. **Só o email é preenchido; o consentimento LGPD nunca é alterado** por esse caminho (o telefone é a chave e qualquer pessoa poderia enviar o número de outra — marcar consentimento por ali seria fabricar aceite).

**Files:**
- Modify: `/Users/apple/Projects/base-andre-santos/src/app/api/public/cadastro/route.ts` (bloco de dedup, ~linhas 78–92)

- [ ] **Step 1: Ajustar o `select` e o bloco `if (existing)`**

Trocar:
```ts
    const existing = pNorm
      ? await db.collaborator.findFirst({
          where: { campaignId: CID, phoneNormalized: pNorm },
          select: { id: true },
        })
      : null;
    if (existing) {
      return NextResponse.json(
```
por:
```ts
    const existing = pNorm
      ? await db.collaborator.findFirst({
          where: { campaignId: CID, phoneNormalized: pNorm },
          select: { id: true, email: true },
        })
      : null;
    if (existing) {
      // Cadastro repetido: só completa o email se estava vazio. Nunca altera consentimento.
      const newEmail = email?.trim();
      if (newEmail && !existing.email) {
        await db.collaborator
          .update({ where: { id: existing.id }, data: { email: newEmail } })
          .catch((err) => console.error("[cadastro] completar email falhou:", err));
      }
      return NextResponse.json(
```
(o `return NextResponse.json({ message: "Cadastro já realizado!...` que já existe logo abaixo permanece igual).

- [ ] **Step 2: Typecheck**

Run: `cd /Users/apple/Projects/base-andre-santos && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit, push, deploy**

```bash
git add src/app/api/public/cadastro/route.ts
git commit -m "fix(cadastro): completa email vazio de cadastro existente (dedup por telefone)"
git push
vercel ls | head -5
```

- [ ] **Step 4: Verificar**

Reenviar o formulário com o telefone de um cadastro que **não** tenha email (o do dono, se aplicável) e conferir que o email foi preenchido e `lgpdConsent` ficou como estava.

---

## Self-Review (spec × plano)

- **Componente 6 do spec** → Task 2 (rota grava via cadastro, checkbox LGPD obrigatório, CEP→cidade/bairro), Task 1 (validação/payload testados). Planilha deixa de receber dados: Task 2 Step 8.3.
- **Consentimento:** `aceite === true` obrigatório no servidor (Task 1) e `required` no checkbox (Task 2).
- **ViaCEP nunca bloqueia:** `lookupCep` nunca lança, timeout 3 s (Task 2 Step 2).
- **Importação única dos 25 leads:** está no Plano A (Task 14), pois roda contra o banco do `base-andre-santos`.
- **Tipos consistentes:** `Geo`, `ValidLead`, `validateLead`, `buildCadastroPayload`, `lookupCep` com as mesmas assinaturas nas Tasks 1–2.
- **Pendência fora do escopo:** o texto da página `/privacidade` (repo base) cita e-mail apenas "para comunicados"; o jurídico validou o envio, mas vale ajustar o texto para mencionar propaganda eleitoral por e-mail — depende de redação jurídica.
