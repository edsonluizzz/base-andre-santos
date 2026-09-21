import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeEmail } from "./emails";

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET ?? process.env.AUTH_SECRET;
  if (!s) throw new Error("UNSUBSCRIBE_SECRET/AUTH_SECRET ausente");
  return s;
}

export function signUnsubscribe(email: string): string {
  const e = normalizeEmail(email) ?? "";
  return createHmac("sha256", secret()).update(e).digest("base64url");
}

export function verifyUnsubscribe(email: string, token: string): boolean {
  if (!token) return false;
  const expected = Buffer.from(signUnsubscribe(email));
  const given = Buffer.from(token);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

function query(email: string): string {
  const e = normalizeEmail(email) ?? "";
  return `e=${encodeURIComponent(e)}&t=${signUnsubscribe(e)}`;
}

export function buildUnsubscribePageUrl(email: string, baseUrl: string): string {
  return `${baseUrl}/descadastro?${query(email)}`;
}

export function buildUnsubscribeOneClickUrl(email: string, baseUrl: string): string {
  return `${baseUrl}/api/public/descadastro?${query(email)}`;
}
