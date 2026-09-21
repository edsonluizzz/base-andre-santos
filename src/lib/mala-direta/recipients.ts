import type { PrismaClient } from "@prisma/client";
import { normalizeEmail, isSendableEmail } from "./emails";

export type RecipientRow = { email: string | null; name: string };
export type Recipient = { email: string; name: string };
export type RecipientStats = {
  totalRows: number; semEmail: number; invalido: number;
  duplicado: number; suprimido: number; final: number;
};

export function buildRecipients(rows: RecipientRow[], suppressed: Set<string>) {
  const stats: RecipientStats = {
    totalRows: rows.length, semEmail: 0, invalido: 0, duplicado: 0, suprimido: 0, final: 0,
  };
  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email) { stats.semEmail++; continue; }
    if (!isSendableEmail(email)) { stats.invalido++; continue; }
    if (seen.has(email)) { stats.duplicado++; continue; }
    seen.add(email);
    if (suppressed.has(email)) { stats.suprimido++; continue; }
    recipients.push({ email, name: row.name });
  }
  stats.final = recipients.length;
  return { recipients, stats };
}

export async function loadRecipients(db: PrismaClient, cid: string) {
  const [rows, supp] = await Promise.all([
    db.collaborator.findMany({
      where: { campaignId: cid, status: { not: "INACTIVE" } },
      select: { email: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    db.emailSuppression.findMany({ where: { campaignId: cid }, select: { email: true } }),
  ]);
  return buildRecipients(rows, new Set(supp.map((s) => s.email)));
}
