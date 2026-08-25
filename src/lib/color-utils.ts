/**
 * Helpers para theming por tenant nas páginas públicas (/cadastro, /material).
 * Cada Campaign tem primaryColor (acento) e secondaryColor (fundo escuro) —
 * as páginas usam CSS custom properties derivadas dessas duas cores em vez de
 * hex fixo, permitindo que cada candidato tenha sua própria identidade visual
 * sem mudar o layout/estrutura das páginas.
 */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [10, 18, 32];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToTriplet([r, g, b]: [number, number, number]): string {
  return `${r},${g},${b}`;
}

export interface TenantThemeVars {
  "--accent": string;
  "--accent-rgb": string;
}

/**
 * Gera as CSS custom properties do tema a partir da cor de acento da
 * campanha (Campaign.primaryColor). O "chrome" escuro do app (fundo, cards,
 * inputs) fica fixo — só o acento muda por tenant — pra não arriscar
 * regressão visual no André, cujo tema já usa essas cores fixas há tempo.
 * Aplicar no elemento raiz da página via `style={tenantThemeVars(...)}`.
 */
export function tenantThemeVars(primaryColor: string): TenantThemeVars {
  return {
    "--accent": primaryColor,
    "--accent-rgb": rgbToTriplet(hexToRgb(primaryColor)),
  };
}

function mix(rgb: [number, number, number], target: [number, number, number], amount: number): string {
  const [r, g, b] = rgb;
  const [tr, tg, tb] = target;
  const mixed = [r, g, b].map((c, i) => Math.round(c + ([tr, tg, tb][i] - c) * amount));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * CSS custom properties consumidas pelas classes Tailwind do dashboard
 * autenticado (bg-primary, bg-sidebar-primary, ring, etc — ver globals.css).
 * Sobrescrever essas variáveis num wrapper do layout tinge todo o CRM sem
 * tocar nos componentes individuais. Efeitos decorativos hardcoded (orbs,
 * scrollbar) permanecem fixos — fora do escopo desta 1ª passada de theming.
 */
export function dashboardThemeVars(primaryColor: string): Record<string, string> {
  const rgb = hexToRgb(primaryColor);
  const rgbStr = rgbToTriplet(rgb);
  const foreground = mix(rgb, [255, 255, 255], 0.45); // tint claro p/ texto sobre fundo escuro

  return {
    "--primary": primaryColor,
    "--primary-foreground": "#0a1220",
    "--accent": `rgba(${rgbStr},0.12)`,
    "--accent-foreground": foreground,
    "--ring": `rgba(${rgbStr},0.50)`,
    "--cta": primaryColor,
    "--cta-muted": `rgba(${rgbStr},0.15)`,
    "--sidebar-primary": primaryColor,
    "--sidebar-primary-foreground": "#0a1220",
    "--sidebar-accent": `rgba(${rgbStr},0.12)`,
    "--sidebar-accent-foreground": foreground,
    "--sidebar-ring": `rgba(${rgbStr},0.50)`,
  };
}
