/**
 * Criptografia simétrica para tokens sensíveis em banco.
 * Uso: criptografar tokens Z-API, Metricool, Telegram bot, Google refresh token
 * antes de salvar; descriptografar ao ler.
 *
 * Estratégia: AES-256-GCM com IV aleatório por valor. Formato armazenado:
 *   "v1:" + base64(iv || ciphertext || authTag)
 *
 * Backwards-compat: se o valor não começar com "v1:", retorna o próprio valor
 * (assume legado não criptografado) — permite migração on-write sem big-bang.
 *
 * Env var necessária:
 *   APP_ENCRYPTION_KEY — string com 32 bytes hex (64 chars) ou base64.
 *   Sem ela, encrypt() é no-op e decrypt() passa direto (dev mode).
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const PREFIX = "v1:";
const ALGO = "aes-256-gcm";

function getKey(): Buffer | null {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) return null;
  // Aceita hex 64-char ou base64 — normaliza para 32 bytes
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch { /* ignore */ }
  // Fallback: deriva 32 bytes via SHA-256 da string fornecida (compat com chaves curtas)
  return createHash("sha256").update(raw).digest();
}

/**
 * Criptografa um valor. Se já estiver criptografado (começa com "v1:") ou
 * APP_ENCRYPTION_KEY ausente, retorna o valor original.
 */
export function encrypt(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return null;
  if (plain.startsWith(PREFIX)) return plain; // idempotente
  const key = getKey();
  if (!key) return plain; // dev mode — no-op

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, ct, tag]);
  return PREFIX + payload.toString("base64");
}

/**
 * Descriptografa. Se não começar com "v1:" (legado) ou APP_ENCRYPTION_KEY ausente,
 * retorna o valor como recebido (assume claro).
 */
export function decrypt(stored: string | null | undefined): string | null {
  if (stored == null || stored === "") return null;
  if (!stored.startsWith(PREFIX)) return stored; // legado em claro
  const key = getKey();
  if (!key) return stored; // dev mode — não consegue decifrar; retorna como veio

  try {
    const payload = Buffer.from(stored.slice(PREFIX.length), "base64");
    if (payload.length < 12 + 16) return null;
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(payload.length - 16);
    const ct = payload.subarray(12, payload.length - 16);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(ct), decipher.final()]);
    return out.toString("utf8");
  } catch (err) {
    console.error("[crypto] decrypt falhou:", err);
    return null;
  }
}

/** Verifica se um valor está criptografado pelo nosso formato */
export function isEncrypted(v: string | null | undefined): boolean {
  return typeof v === "string" && v.startsWith(PREFIX);
}
