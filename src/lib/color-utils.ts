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
