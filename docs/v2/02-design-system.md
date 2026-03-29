# Design System V2 — "Obsidian + Royal Purple"

## Conceito

**"Noite Sagrada"** — a profundidade do escuro com a realeza do púrpura e o brilho do ouro.

Mantém o DNA dark/premium da V1 (Dark + Gold), mas moderniza para o padrão SaaS 2025 (Linear, Vercel, Shadcn default dark).

Referências visuais: Linear App, Vercel Dashboard, Raycast.

---

## Paleta de Tokens

```css
/* Backgrounds */
--background:   #09090b   /* zinc-950 */
--card:         #18181b   /* zinc-900 */
--secondary:    #27272a   /* zinc-800 */
--muted:        #18181b   /* zinc-900 */

/* Sidebar */
--sidebar:      #0d0d10   /* ainda mais escuro que o fundo */

/* Accent Principal — Royal Purple */
--primary:         #7c3aed   /* violet-700 */
--primary-foreground: #ffffff
--accent:          #7c3aed1a /* violet/10 */
--accent-foreground: #a78bfa  /* violet-400 */
--ring:            #7c3aed80

/* Gold — mantido como accent secundário */
--gold:         #d4a843
--gold-light:   #fbbf24    /* amber-400 */
--gold-muted:   #92700a

/* Textos */
--foreground:         #fafafa   /* zinc-50 */
--muted-foreground:   #a1a1aa   /* zinc-400 */

/* Bordas */
--border:  #27272a   /* zinc-800 */
--input:   #27272a

/* Semânticas */
--success: #22c55e   /* green-500 */
--warning: #f59e0b   /* amber-500 */
--danger:  #ef4444   /* red-500 */
--destructive: #ef4444
--destructive-foreground: #fafafa
```

---

## Tipografia

| Uso | Fonte | Pesos |
|-----|-------|-------|
| Headings | Bricolage Grotesque | 400, 600, 700 |
| Body | Inter / Geist | 300, 400, 500, 600 |
| Valores numéricos | Geist Mono | 400, 600 |

**Importação (layout.tsx):**
```typescript
import { Inter, Bricolage_Grotesque } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "600", "700"],
});
```

---

## Componentes Novos

### LoadingSkeleton
`src/components/shared/loading-skeleton.tsx`

Skeleton animado com `animate-pulse` para estados de carregamento de cards, tabelas e listas.

### EmptyState
`src/components/shared/empty-state.tsx`

Props: `icon`, `title`, `description`, `actionLabel`, `onAction`

Exibe ícone centralizado + título + descrição + botão CTA quando não há dados.

### StatCard
`src/components/shared/stat-card.tsx`

Props: `title`, `value`, `icon`, `trend`, `trendLabel`, `variant`

Card reutilizável para KPIs do dashboard. Extrai lógica que estava inline em `page.tsx`.

---

## Por que Royal Purple para este produto?

1. **Associação com realeza e liderança espiritual** — contexto perfeito para gestão de mocidade
2. **Diferenciação clara da V1** (Gold) enquanto mantém o Gold como accent secundário
3. **Padrão de mercado** zinc como base é o tema dark mais popular em 2024-2025
4. **WCAG AA garantido** em todas as combinações de texto sobre fundo
5. **Coerência com identidade cristã** — púrpura tem referência bíblica (Lidia, a vendedora de púrpura; vestes reais)
