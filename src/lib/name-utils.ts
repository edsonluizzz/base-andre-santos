/**
 * Utilitários de nome: extração de primeiro nome e detecção de gênero.
 *
 * Estratégia de gênero:
 *   1) Match exato no dataset BR (~95% dos casos)
 *   2) Heurística por sufixo (cobre +4%)
 *   3) Default "M" (~1% indeterminado) — decisão de produto: nunca neutro
 *
 * Sempre retorna "M" ou "F" — nunca undefined.
 */

import nomesBr from "@/data/nomes-br.json";

export type Gender = "M" | "F";

// Sets em UPPER para match O(1) — normalizamos input igual antes
const NOMES_F = new Set(nomesBr.feminino as string[]);
const NOMES_M = new Set(nomesBr.masculino as string[]);

// Remove acentos e converte para upper
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
}

// Title case respeitando preposições BR
const PREPOSICOES = new Set(["DA", "DE", "DO", "DAS", "DOS", "E"]);
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      const upper = w.toUpperCase();
      if (i > 0 && PREPOSICOES.has(upper)) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

/**
 * Extrai e formata o primeiro nome.
 * "JOSÉ DA SILVA SAURO" → "José"
 * "maria FERNANDA"     → "Maria"
 */
export function firstName(full: string | null | undefined): string {
  if (!full) return "";
  const first = full.trim().split(/\s+/)[0] ?? "";
  return titleCase(first);
}

/**
 * Detecta gênero do nome. Sempre retorna M ou F (default M para indeterminados).
 *
 * Ordem:
 *   1) Lookup dataset (case + accent insensitive)
 *   2) Heurística sufixo
 *   3) Default M
 */
export function detectGender(name: string | null | undefined): Gender {
  if (!name) return "M";
  const first = firstName(name);
  if (!first) return "M";

  const upper = normalize(first);

  // 1) Dataset
  if (NOMES_F.has(upper)) return "F";
  if (NOMES_M.has(upper)) return "M";

  // 2) Heurística por sufixo (português BR)
  // Femininos típicos
  if (/^.{2,}(A|IA|INA|ANA|ENA|ETA|ELLE|ICE|ETE|ISA|ESA|ILDA|ANDA|ENDA|ONDA|UNDA|ETHE|ESE|ICE|EIDE|ITA|EIA|ARA|ERA|IRA|ORA|URA|AIDE|AINE|ELLE|YSE|ICE|ICIA)$/.test(upper)) {
    return "F";
  }
  // Masculinos típicos
  if (/^.{2,}(O|OR|IM|UM|EL|AR|ER|IR|UR|AS|ES|IS|US|AL|IL|UL|TON|SON|ALDO|UALDO|IVALDO|MIR|MAR|NEY|EY|NI|NY|IO|ELIO|EZIO|ANI|ESI|VID|RICO|ARDO)$/.test(upper)) {
    return "M";
  }

  // 3) Default M
  return "M";
}

/**
 * Versão lowercase do primeiro nome — útil em saudações descontraídas
 * onde maiúscula soa formal demais. Mantém acentuação.
 */
export function firstNameLower(full: string | null | undefined): string {
  return firstName(full).toLowerCase();
}
