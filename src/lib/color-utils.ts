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

/** Clareia uma cor em direção ao branco por uma fração (0-1). */
function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const l = (c: number) => Math.round(c + (255 - c) * amount);
  return `${l(r)},${l(g)},${l(b)}`;
}

export interface TenantThemeVars {
  "--accent": string;
  "--accent-rgb": string;
  "--bg": string;
  "--bg-rgb": string;
  "--bg-card-rgb": string;
  "--bg-input-rgb": string;
}

/**
 * Gera as CSS custom properties do tema a partir das cores da campanha.
 * Aplicar no elemento raiz da página via `style={tenantThemeVars(...)}`.
 */
export function tenantThemeVars(primaryColor: string, secondaryColor: string): TenantThemeVars {
  return {
    "--accent": primaryColor,
    "--accent-rgb": rgbToTriplet(hexToRgb(primaryColor)),
    "--bg": secondaryColor,
    "--bg-rgb": rgbToTriplet(hexToRgb(secondaryColor)),
    "--bg-card-rgb": lighten(secondaryColor, 0.15),
    "--bg-input-rgb": lighten(secondaryColor, 0.35),
  };
}
