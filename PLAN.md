# PLANO DE MELHORIA — Ovile Eleitoral
**Auditoria:** 2026-05-27  
**Versão:** 2.0 — pós-rebrand, pós-multi-tenant Sprint 1-3

---

## 🔍 RESUMO DA AUDITORIA

### 🔴 Segurança

| # | Severidade | Achado | Arquivo |
|---|-----------|--------|---------|
| S1 | CRÍTICO | `ignoreBuildErrors: true` + `eslint ignoreDuringBuilds: true` — erros silenciados em produção | `next.config.mjs` |
| S2 | CRÍTICO | Rate limit in-memory (`Map`) ineficaz em serverless — cada instância Vercel tem estado próprio | `api/public/cadastro` |
| S3 | CRÍTICO | `joinCode: "andre2026"` hardcoded no `signIn` callback — visível no código e banco | `lib/auth.ts:157` |
| S4 | MÉDIO | Sem CSP (Content Security Policy) nos headers — XSS sem mitigação de política | `next.config.mjs` |
| S5 | MÉDIO | `googleRefreshToken` em texto plano no banco (tabela Settings) | `api/google-calendar/*` |
| S6 | MÉDIO | Bulk updates usam `as never` — sem validação de enum — pode aceitar valores inválidos | `api/collaborators/bulk` |
| S7 | MÉDIO | Token de impersonation no JWT sem TTL — persiste indefinidamente | `lib/auth.ts:108` |
| S8 | BAIXO | `console.error` com stack traces internos — pode vazar detalhes em produção | múltiplos |

### 🟡 Performance

| # | Severidade | Achado | Impacto |
|---|-----------|--------|---------|
| P1 | ALTO | Next.js **14.2.35** (desatualizado — atual: 15.x) — perde Partial Prerendering, TurboPack estável | Velocidade de build/runtime |
| P2 | ALTO | Dashboard: **10 queries paralelas sem cache** — recalculadas a cada page view | TTI +300-600ms |
| P3 | MÉDIO | `db.userCampaign.findMany` busca toda tabela `Session` para calcular `lastSeen` | `/api/admin/users` |
| P4 | MÉDIO | GradientOrbs: 6 animações Framer Motion `Infinite` — impacto em CPU/battery mobile | FPS drop mobile |
| P5 | MÉDIO | `LandingContent` tem 200+ linhas de `<style>` inline — sem code-split | +8KB CSS no bundle |
| P6 | MÉDIO | `yet-another-react-lightbox` sem lazy loading — importado full em 2 componentes | Bundle +60KB |
| P7 | BAIXO | `animate-glow-pulse` definido 2x (globals.css + tailwind.config) | Duplicação CSS |
| P8 | BAIXO | Inter/Bebas Neue sem `display: 'swap'` declarado | CLS leve |

### 🎨 Design / UI / Responsividade

| # | Severidade | Achado | Arquivo |
|---|-----------|--------|---------|
| D1 | CRÍTICO | Landing page mistura 100% inline styles + Tailwind — inconsistente, difícil manter | `LandingContent.tsx` |
| D2 | ALTO | KPI cards do dashboard sem animação — parecem estáticos/genéricos | `dashboard/page.tsx` |
| D3 | ALTO | Sem page transitions — navegação entre rotas é abrupta | layout global |
| D4 | ALTO | Metadata fraca — sem OG image, sem twitter card, description genérica | `layout.tsx` |
| D5 | MÉDIO | `animate-glow-pulse` usa cor **indigo** (`rgba(99,102,241)`) — conflita com tema gold | `tailwind.config.ts:77` |
| D6 | MÉDIO | Sidebar colapsada: sem tooltip nos itens — usuário não sabe o nome do módulo | `sidebar.tsx` |
| D7 | MÉDIO | Skeleton loaders inconsistentes — alguns com `animate-pulse`, outros sem nada | múltiplos |
| D8 | MÉDIO | Mobile 360px: grid `grid-cols-2` nos KPIs fica apertado | `dashboard/page.tsx:102` |
| D9 | BAIXO | Scrollbar thumb `#1a2f4e` invisível no tema escuro (mesma cor do fundo) | `globals.css:161` |
| D10 | BAIXO | Toast `top-center` + hamburger `top-4 left-4` — sobreposição no mobile | layout |
| D11 | BAIXO | Não usa anime.js (preferência do projeto) — animações todas Framer Motion/CSS | geral |

---

## 📋 SPRINTS DE IMPLEMENTAÇÃO

---

### Sprint 1 — Segurança & Fundação (2-3h)
*Prioridade máxima — riscos reais em produção*

#### Step 1.1 — Ativar TypeScript + ESLint no build
```js
// next.config.mjs
typescript: { ignoreBuildErrors: false }, // REMOVER
eslint: { ignoreDuringBuilds: false },     // REMOVER
```
→ Corrigir os erros de tipo que aparecerem (provavelmente `as never` em bulk)

#### Step 1.2 — Rate limit persistente com Edge Config
```ts
// Substituir Map in-memory por Redis/KV ou rate limit por IP via middleware
// Vercel KV (upstash) ou usar headers X-Forwarded-For com sliding window via banco
```
Solução rápida: `@upstash/ratelimit` + `@vercel/kv` → 5 req/min por IP, persistente entre instâncias

#### Step 1.3 — Remover joinCode hardcoded
```ts
// auth.ts:157 — joinCode: "andre2026" → gerar via crypto.randomUUID() ou buscar da env
const joinCode = process.env.CAMPAIGN_JOIN_CODE ?? crypto.randomUUID()
```

#### Step 1.4 — CSP no next.config.mjs
```js
{ key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel-analytics.com; img-src 'self' data: *.googleusercontent.com *.googleapis.com img.youtube.com *.blob.vercel-storage.com; connect-src 'self' *.googleapis.com; frame-src *.youtube.com" }
```

#### Step 1.5 — Whitelist de enum nos bulk updates
```ts
// Substituir `as never` por validação explícita
const VALID_STATUS = ["ACTIVE", "INACTIVE", "LEAD"] as const
if (!VALID_STATUS.includes(status)) return 400
```

**Commit:** `security: rate limit persistente, CSP, enum validation, joinCode env`

---

### Sprint 2 — UI Premium (4-6h)
*Maior impacto visual — sistema "top de linha"*

#### Step 2.1 — Corrigir glow-pulse para gold
```ts
// tailwind.config.ts:77 — substituir rgba(99,102,241) por rgba(212,175,55)
"glow-pulse": {
  "0%, 100%": { boxShadow: "0 0 0 rgba(212,175,55,0)" },
  "50%": { boxShadow: "0 0 20px rgba(212,175,55,0.35)" },
},
```

#### Step 2.2 — Tooltip nos itens da sidebar colapsada
```tsx
// sidebar.tsx — adicionar title={isCollapsed ? item.label : undefined} já existe
// Mas implementar um Tooltip real com Radix UI para mobile/touch
```

#### Step 2.3 — KPI cards animados (Counter animate)
```tsx
// Criar CountUp component usando anime.js
// Animação: 0 → valor real em 1.2s ao montar
import { animate } from "animejs"
```

#### Step 2.4 — Page transitions
```tsx
// dashboard/layout.tsx → envolver {children} em AnimatePresence + motion.div
// Fade + slide suave entre rotas
```

#### Step 2.5 — Skeleton loaders padronizados
```tsx
// Criar <Skeleton /> component padrão
// Aplicar em todos os Suspense boundaries e loading.tsx
```

#### Step 2.6 — Landing page refatorada (Tailwind puro)
```tsx
// Reescrever LandingContent.tsx sem nenhum inline style
// Usar tokens do tailwind.config existentes
// Manter o design visual atual — só refatorar a estrutura
```

#### Step 2.7 — OG Image + Metadata completa
```tsx
// layout.tsx
export const metadata: Metadata = {
  title: { default: "Ovile Eleitoral", template: "%s | Ovile Eleitoral" },
  description: "Plataforma de gestão de base eleitoral — Paraná 2026",
  openGraph: {
    title: "Ovile Eleitoral",
    description: "Gestão de base eleitoral — Paraná 2026",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
}
// Criar /public/og-image.png (1200×630px) com design navy/gold
```

#### Step 2.8 — Responsividade mobile KPIs
```tsx
// Mudar grid-cols-2 para grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
// Ajustar font-size dos valores em telas pequenas
```

#### Step 2.9 — Scrollbar thumb visível
```css
/* globals.css */
::-webkit-scrollbar-thumb { background: #d4af37; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #f0d060; }
```

**Commit:** `ui: premium design — glow gold, KPIs animados, transitions, skeleton, og-image, mobile`

---

### Sprint 3 — Performance (2-3h)
*Ganha velocidade de carregamento e reduz custo de servidor*

#### Step 3.1 — React.cache no dashboard
```ts
// Envolver as queries mais pesadas com React.cache ou unstable_cache
import { unstable_cache } from "next/cache"
const getCityStats = unstable_cache(async (cid: string) => db.collaborator.findMany(...), ["city-stats"], { revalidate: 120 })
```

#### Step 3.2 — Lazy loading Lightbox
```tsx
// FamiliaAlbum.tsx e Ministerio.tsx
const Lightbox = dynamic(() => import("yet-another-react-lightbox"), { ssr: false })
```

#### Step 3.3 — will-change + GradientOrbs otimizados
```tsx
// Adicionar style={{ willChange: "transform" }} nos orbs animados
// Reduzir de 6 para 3 orbs na landing
// Usar CSS animation em vez de Framer Motion para os orbs simples
```

#### Step 3.4 — Remoção de `<style>` inline
```tsx
// Mover estilos da LandingContent para globals.css ou módulos CSS
// Resultado: -200 linhas de JS no bundle cliente
```

#### Step 3.5 — Font display swap explícito
```ts
// layout.tsx
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" })
```

**Commit:** `perf: cache dashboard, lazy lightbox, will-change orbs, font swap`

---

### Sprint 4 — Funcionalidades Pendentes (6-10h)
*Roadmap de produto*

#### Step 4.1 — Fix criação de campanha multi-tenant
- Depurar `/api/admin/campaigns/provision/route.ts` — bug onde `neonData` sai do escopo
- Testar fluxo completo modo manual + automático
- Adicionar feedback de erro adequado no form

#### Step 4.2 — Evolution API WhatsApp (Fase 1)
- Botão "Enviar WhatsApp" no card do colaborador (wa.me já existe)
- Integração básica no `/comunicados` — envio para lista de contatos
- Webhook Evolution → CRM (mensagens recebidas)

#### Step 4.3 — Compliance agosto/2026
- CNPJ coligação + registro SPCE
- Validar textos de "pré-campanha" × "campanha"
- Auditoria LGPD: campos obrigatórios, consentimento explícito

---

## 📌 ORDEM DE EXECUÇÃO RECOMENDADA

```
Sprint 1 → Sprint 2 → Sprint 3 → Sprint 4
```

**Para retomar no Sprint 1:**
```
PLAN.md Ovile Eleitoral — execute Sprint 1, Step 1.1: ativar TypeScript e ESLint no build
```

**Para retomar no Sprint 2:**
```
PLAN.md Ovile Eleitoral — execute Sprint 2, Step 2.1: corrigir glow-pulse para gold
```

---

## ✅ Checklist Pré-Push (sempre rodar antes de commitar)

```
1. npm run lint  — zero errors
2. npm run build — deve passar (após Sprint 1)
3. Grep por console.log e TODO nos arquivos mudados
4. Confirmar env vars no Vercel: DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, APP_URL
```
