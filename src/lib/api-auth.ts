import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

// Comparação de string em tempo constante — evita side-channel de timing ao
// comparar Bearer tokens/segredos. Buffers de tamanho diferente já falham (não
// vazam length via timing pois timingSafeEqual exige tamanhos iguais).
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Checa o header Authorization: Bearer <N8N_API_KEY>. Fail-closed: sem a env
// var configurada, sempre nega.
export function n8nAuthCheck(req: NextRequest): boolean {
  const key = process.env.N8N_API_KEY;
  if (!key) return false;
  const header = req.headers.get("authorization");
  if (!header) return false;
  return safeEqual(header, `Bearer ${key}`);
}

// Checa um segredo de cron (header "authorization: Bearer <secret>" ou o
// valor cru já extraído). Fail-closed: sem CRON_SECRET configurado, nega tudo.
export function cronSecretMatches(provided: string | null | undefined): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  return safeEqual(provided, expected);
}
