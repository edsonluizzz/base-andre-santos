/**
 * Identificação de campanha exigida a partir do início oficial da propaganda
 * eleitoral (Lei 9.504/97 + Resolução TSE 23.610/2019, alterada pela 23.755/2026).
 * A troca de "Pré-candidato" pra "Candidato" e a exibição da razão social/CNPJ
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

export const CAMPAIGN_ENTITY = {
  razaoSocial: "ELEICAO 2026 ANDRE LUIS DO NASCIMENTO SANTOS DEPUTADO ESTADUAL",
  cnpj: "68.464.730/0001-87",
};

export const CANDIDATE_NUMBER = "30777";

/** Rótulo curto — pra usar depois de "André Santos —" (não repete o nome). */
export function candidateStatusLabel(official: boolean = isOfficialCampaignPeriod()): string {
  return official
    ? `${CANDIDATE_NUMBER} — Candidato a Deputado Estadual PR`
    : "Pré-candidato a Deputado Estadual PR 2026";
}

/** Rótulo completo autocontido — pra usar sozinho (título de página, meta tags). */
export function candidateFullLabel(official: boolean = isOfficialCampaignPeriod()): string {
  return official
    ? `${CANDIDATE_NUMBER} — André Santos — Candidato a Deputado Estadual PR`
    : "André Santos — Pré-candidato a Deputado Estadual PR 2026";
}

// Até 16/08 o snapshot de servidor ficava fixo em "pré-campanha" por
// segurança (nunca afirmar "Candidato" antes da hora); passada a data
// oficial, não há mais risco de antecipar nada — os dois snapshots
// reavaliam a data real, então todo novo build já congela o HTML
// estático como "Candidato" (sem isso, o HTML servido a quem não roda JS
// — crawlers, prévia de link — ficaria preso em "Pré-candidato" pra
// sempre, mesmo em builds pós-16/08).
export function subscribeCampaignPeriod(): () => void {
  return () => {};
}

export function getCampaignPeriodServerSnapshot(): boolean {
  return isOfficialCampaignPeriod();
}

export function getCampaignPeriodClientSnapshot(): boolean {
  return isOfficialCampaignPeriod();
}
