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

## FASE 0 — Fundação (propaga para todo o app) ✅ CONCLUÍDA
- [x] **0.1 — Fundo + tokens** (`9dd27d8`/`dc60b72`): `.app-bg` com 3 orbs (dourado/navy),
  drift lento, estático no mobile/reduced-motion. Intensidade calibrada pelo Edson
  (forte→suave). body sólido + `<div class="app-bg">` no layout.
  ⚠️ Fix crítico (`f1da6f8`): o wrapper do dashboard tinha `bg-background` opaco que
  tapava 100% os orbs — removido (era o "não vejo diferença").
- [x] **0.2 — Sistema de glass** (`b401fce`): `.glass-card` refinado (gradiente translúcido,
  blur 16px, borda com brilho, profundidade) + `.glass-interactive` (lift hover) +
  `.glass-elevated` (modais). Dark e claro; mobile sem backdrop-filter.
- [x] **0.3 — Popups em vidro** (`8571483`): Dialog + Sheet usam `.glass-elevated`.
  Inputs mantidos (já usam tokens + foco dourado) — refino fino fica p/ depois com feedback.
- [x] **0.4 — Motion** (`e4ae2b1`): `<CountUp>` (RAF, easeOutCubic, respeita reduced-motion)
  nos KPIs de Colaboradores.

## FASE 1 — Telas-âncora (PARCIAL — resto aguarda feedback visual do Edson)
- [~] 1.1 Dashboard: contadores animados aplicados (`621cd7c`). Falta: cards/gráficos no tom novo.
- [ ] 1.2 Colaboradores: KPIs já com count-up. Falta: cards de lead (glass-interactive), filtros.
- [ ] 1.3 WhatsApp (encaixar no sistema — sheet já é glass-elevated)
- [ ] 1.4 Login (vitrine do glass)

## FASE 2 — Polish
- [ ] Estados vazios + loading (skeleton glass) + toasts
- [ ] Revisão mobile (perf dos orbs/blur) + acessibilidade (contraste AA, foco)
- [ ] Inputs/select/badge refinados; scrollbar; tooltips; transições de aba

---

**Status (2026-06-11 madrugada):** Fundação 0.1–0.4 no ar e validada. Fase 1 começou
(contadores). Parei a Fase 1 nas telas por serem sensíveis a gosto — melhor avançar com
o Edson vendo. **Retomar:** colar `Continue o PLAN.md do redesign — próximo passo`.
