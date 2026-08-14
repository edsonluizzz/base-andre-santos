/**
 * Identificação de campanha exigida a partir do início oficial da propaganda
 * eleitoral (Lei 9.504/97 + Resolução TSE 23.610/2019, alterada pela 23.755/2026).
 * A troca de "Pré-candidato" pra "Candidato" e a exibição do comitê financeiro
 * é automática pela data — não precisa de deploy manual no dia 16/08.
 *
 * Usado nas páginas públicas de /ebook (force-static — congeladas no HTML do
 * build). Ver src/app/ebook/[slug]/campaign-footer-note.tsx pro consumidor
 * client-side via useSyncExternalStore (evita hydration mismatch e o
 * anti-padrão de setState síncrono dentro de useEffect).
 */

const OFFICIAL_CAMPAIGN_START = new Date("2026-08-16T00:00:00-03:00");

export function isOfficialCampaignPeriod(date: Date = new Date()): boolean {
  return date >= OFFICIAL_CAMPAIGN_START;
}

export const COMITE_FINANCEIRO = {
  razaoSocial: "ELEICAO 2026 ANDRE LUIS DO NASCIMENTO SANTOS DEPUTADO ESTADUAL",
  cnpj: "68.464.730/0001-87",
};

export function candidateStatusLabel(official: boolean = isOfficialCampaignPeriod()): string {
  return official
    ? "Candidato a Deputado Estadual PR 2026 — NOVO"
    : "Pré-candidato a Deputado Estadual PR 2026";
}

export function subscribeCampaignPeriod(): () => void {
  return () => {};
}

export function getCampaignPeriodServerSnapshot(): boolean {
  return false;
}

export function getCampaignPeriodClientSnapshot(): boolean {
  return isOfficialCampaignPeriod();
}
