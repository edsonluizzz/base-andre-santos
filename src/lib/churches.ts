/**
 * Normaliza um nome de regional para comparação/dedup: trim + Title Case
 * simples (primeira letra de cada palavra maiúscula, resto minúscula).
 * Resolve variações de digitação como "Santa felicidade" vs "Santa Felicidade".
 * Preserva siglas all-caps (ex: "CIC" permanece "CIC").
 */
export function normalizeRegional(raw: string): string {
  const trimmed = raw.trim();

  // Se é uma sigla all-caps de uma palavra (sem espaços), preserva
  if (trimmed === trimmed.toUpperCase() && !trimmed.includes(" ") && trimmed.length > 0) {
    return trimmed;
  }

  // Caso contrário, normaliza para Title Case
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function normalizeName(raw: string): string {
  return raw
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos p/ comparação
    .toLowerCase();
}

/**
 * Remove linhas duplicadas (mesmo nome normalizado dentro da mesma regional
 * normalizada), mantendo a primeira ocorrência com sua grafia original.
 */
export function dedupeChurchRows(
  rows: { name: string; regional: string }[],
): { name: string; regional: string }[] {
  const seen = new Set<string>();
  const out: { name: string; regional: string }[] = [];
  for (const row of rows) {
    const regional = normalizeRegional(row.regional);
    const key = `${normalizeName(row.name)}|${normalizeName(regional)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: row.name.trim(), regional });
  }
  return out;
}

/** Lança erro se os dois membros da dupla forem a mesma pessoa (member2 é opcional). */
export function assertDistinctMembers(member1Id: string, member2Id?: string | null): void {
  if (member2Id && member1Id === member2Id) {
    throw new Error("Os dois membros da dupla precisam ser pessoas diferentes.");
  }
}
