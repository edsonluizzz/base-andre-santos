# PLAN — Redesign "Glass Moderno" (2026-06-11)

> Direção escolhida pelo Edson: **1A Glass moderno** (fundo com orbs/profundidade,
> vidro fosco, glow dourado) · **2A os dois temas impecáveis** (dark + claro) ·
> **3A animações sutis e profissionais** (microinterações, sem exagero).
> Mantém a identidade: **navy + dourado**, estrela, tom institucional eleitoral.
>
> **Regras:** validar SEMPRE no Vercel (nunca `npm run build` local — roda `prisma db push`).
> Lint no clone `C:\Users\usuario\ovile-ci` antes de cada push. Commit por passo.

## Princípios do novo visual
- **Profundidade por camadas:** fundo com orbs suaves → vidro translúcido → conteúdo.
- **Glass que funciona nos 2 temas:** dark = vidro escuro translúcido + brilho de borda;
  claro = vidro branco translúcido + borda definida + sombra suave (resolve o "lavado").
- **Dourado com intenção:** destaques, foco, CTA — não em tudo.
- **Motion sutil:** transições 150–250ms, easing suave; entradas leves; hover lift discreto;
  contadores animados nos KPIs. Respeita `prefers-reduced-motion`. anime.js só onde agrega.

---

## FASE 0 — Fundação (propaga para todo o app)
- [ ] **0.1 — Sistema de fundo + tokens de cor/contraste** ← EM ANDAMENTO
  - `.app-bg` com orbs (navy/dourado no dark; off-white/dourado sutil no claro), drift
    lento (sutil), estático no mobile e em reduced-motion. `<div class="app-bg">` no layout.
  - Refino de tokens (dark + claro) para dar base ao glass e melhorar contraste do claro.
- [ ] **0.2 — Sistema de glass** (`.glass-card` + `.glass-panel` + `.glass-elevated`):
  vidro fosco, borda com brilho, sombras/elevação por tema. Skeletons glass.
- [ ] **0.3 — Componentes base** (button, card, input, badge, select): microinterações
  (hover lift, focus ring dourado), bordas de vidro, estados nos 2 temas.
- [ ] **0.4 — Motion foundation:** durations/easing padrão, page-transition, hover utils,
  contador animado de números (anime.js) p/ KPIs.

## FASE 1 — Telas-âncora
- [ ] 1.1 Dashboard (KPIs com glass + contadores; gráficos no novo tom)
- [ ] 1.2 Colaboradores (lista, filtros, cards de lead)
- [ ] 1.3 WhatsApp (já novo — encaixar no sistema)
- [ ] 1.4 Login (vitrine do glass)

## FASE 2 — Polish
- [ ] Estados vazios + loading (skeleton glass) + toasts
- [ ] Revisão mobile (perf dos orbs/blur) + acessibilidade (contraste AA, foco)
- [ ] Detalhes: scrollbar, tooltips, transições de aba

---

**Retomar:** colar `Continue o PLAN.md do redesign — próximo passo`.
