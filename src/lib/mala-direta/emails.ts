const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLOCKED_DOMAINS = new Set(["offline-members-wix.com"]);

export function normalizeEmail(raw: string | null | undefined): string | null {
  const e = (raw ?? "").trim().toLowerCase();
  return e === "" ? null : e;
}

export function isSendableEmail(email: string): boolean {
  if (!EMAIL_RE.test(email)) return false;
  return !BLOCKED_DOMAINS.has(email.split("@")[1]);
}
