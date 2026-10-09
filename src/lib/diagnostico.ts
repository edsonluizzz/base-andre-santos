// Diagnóstico Eleitoral: regras de acesso por token (link vendido por candidato).
// Funções puras (servidor e navegador); quem consulta o banco é a rota.

export const COOKIE_DIAGNOSTICO = "diag_acesso";
export const HOST_DIAGNOSTICO = "diagnostico.ovile.com.br";
// Gerais 2026 (número do candidato) e municipais (número = "<cd da cidade>-<número>", porque o número se repete entre cidades).
export const CARGOS_DIAGNOSTICO = ["estadual", "federal", "estadual-2022", "federal-2022", "vereador-2024", "prefeito-2024", "vereador-2020", "prefeito-2020"] as const;
export const ehMunicipal = (cargo: string) => /^(vereador|prefeito)-\d{4}$/.test(cargo);
export type CargoDiagnostico = (typeof CARGOS_DIAGNOSTICO)[number];
const MAX_TOKENS = 20; // um cliente pode comprar vários candidatos no mesmo navegador

// 18 bytes aleatórios em base64url = 24 caracteres.
export function gerarToken() {
  const b = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_");
}
export const tokenValido = (t: unknown): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{24}$/.test(t);
export const ehCargo = (c: unknown): c is CargoDiagnostico => CARGOS_DIAGNOSTICO.includes(c as CargoDiagnostico);

// Cookie guarda os tokens separados por ponto; inválidos são descartados.
export function lerTokens(cookie: string | undefined | null): string[] {
  return [...new Set(String(cookie ?? "").split(".").filter(tokenValido))].slice(-MAX_TOKENS);
}
export function juntarToken(cookie: string | undefined | null, novo: string): string {
  return [...lerTokens(cookie).filter((t) => t !== novo), novo].slice(-MAX_TOKENS).join(".");
}

export const ehHostDiagnostico = (host: string | null | undefined) =>
  String(host ?? "").split(":")[0].toLowerCase() === HOST_DIAGNOSTICO;

// Arquivos pagos (votos por local): dados/<cargo>/<número>.json (gerais) ou dados/<ano>/<cargo>/<cd>/loc.json
// (municipais: todos os candidatos da cidade num arquivo; numero = código da cidade).
export function arquivoDeCandidato(rel: string): { cargo: CargoDiagnostico; numero: string } | null {
  const g = rel.match(/^dados\/([a-z]+)\/(\d{2,5})\.json$/);
  if (g && ehCargo(g[1])) return { cargo: g[1], numero: g[2] };
  // gerais de anos anteriores: dados/<ano>/<estadual|federal>/<número>.json
  const h = rel.match(/^dados\/(\d{4})\/(estadual|federal)\/(\d{2,5})\.json$/);
  if (h && ehCargo(`${h[2]}-${h[1]}`)) return { cargo: `${h[2]}-${h[1]}` as CargoDiagnostico, numero: h[3] };
  const m = rel.match(/^dados\/(\d{4})\/([a-z]+)\/(\d{5})\/loc\.json$/);
  const cargo = m ? `${m[2]}-${m[1]}` : null;
  return m && ehCargo(cargo) ? { cargo, numero: m[3] } : null;
}

export const chaveCandidato = (cargo: string, numero: string) => `${cargo}:${numero}`;

// Link enviado ao cliente: já abre no relatório do candidato comprado.
export function linkDiagnostico(token: string, cargo: string, numero: string, base = `https://${HOST_DIAGNOSTICO}/`) {
  const [cidade, n] = ehMunicipal(cargo) ? numero.split("-") : [null, numero];
  return `${base}?k=${token}#relatorio?cargo=${cargo}${cidade ? `&m=${cidade}` : ""}&c=${n}`;
}

// Só dígitos, com DDI 55 quando vier no formato nacional (para wa.me).
export function telefoneWhatsApp(t: string | null | undefined): string | null {
  const d = String(t ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return null;
}
