import { computeWaveSize } from "./wave";
import { renderPropagandaEmail, buildUnsubscribeHeaders } from "./template";
import { buildUnsubscribePageUrl, buildUnsubscribeOneClickUrl } from "./unsubscribe-token";
import type { Recipient } from "./recipients";

export type OutMessage = {
  from: string; to: string; subject: string; html: string; text: string;
  headers: Record<string, string>; replyTo?: string;
};
export interface Mailer { sendBatch(messages: OutMessage[]): Promise<string[]>; }
export type ClaimedRow = { id: string; email: string; name: string };
export interface SendStore {
  seed(recipients: Recipient[]): Promise<void>;
  claim(limit: number): Promise<ClaimedRow[]>;
  markSent(id: string, providerId: string | null): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  countSentSince(since: Date): Promise<number>;
}
export type CampaignContent = {
  subject: string; bodyText: string; ctaLabel?: string | null; ctaUrl?: string | null;
};
export type WaveOptions = {
  store: SendStore; mailer: Mailer; content: CampaignContent;
  appUrl: string; from: string; replyTo?: string;
  dailyLimit: number; requested: number; now?: Date; batchSize?: number;
};
export type WaveResult = { requested: number; allowed: number; claimed: number; sent: number; failed: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? "";
}

function buildMessage(
  to: { email: string; name: string },
  content: CampaignContent,
  o: { appUrl: string; from: string; replyTo?: string; subjectPrefix?: string },
): OutMessage {
  const { html, text } = renderPropagandaEmail({
    subject: content.subject,
    bodyText: content.bodyText,
    ctaLabel: content.ctaLabel,
    ctaUrl: content.ctaUrl,
    firstName: firstName(to.name),
    unsubscribeUrl: buildUnsubscribePageUrl(to.email, o.appUrl),
  });
  return {
    from: o.from,
    to: to.email,
    subject: `${o.subjectPrefix ?? ""}${content.subject}`,
    html,
    text,
    headers: buildUnsubscribeHeaders(buildUnsubscribeOneClickUrl(to.email, o.appUrl)),
    ...(o.replyTo ? { replyTo: o.replyTo } : {}),
  };
}

export async function sendWave(opts: WaveOptions): Promise<WaveResult> {
  const now = opts.now ?? new Date();
  const batchSize = opts.batchSize ?? 50;
  const sentLast24h = await opts.store.countSentSince(new Date(now.getTime() - DAY_MS));
  const allowed = computeWaveSize(opts.dailyLimit, sentLast24h, opts.requested);
  const result: WaveResult = { requested: opts.requested, allowed, claimed: 0, sent: 0, failed: 0 };
  if (allowed === 0) return result;

  const rows = await opts.store.claim(allowed);
  result.claimed = rows.length;

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const messages = chunk.map((r) => buildMessage(r, opts.content, opts));
    try {
      const ids = await opts.mailer.sendBatch(messages);
      for (let j = 0; j < chunk.length; j++) {
        await opts.store.markSent(chunk[j].id, ids[j] ?? null);
        result.sent++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      for (const r of chunk) {
        await opts.store.markFailed(r.id, msg);
        result.failed++;
      }
    }
  }
  return result;
}

export async function sendTestEmail(opts: {
  mailer: Mailer; content: CampaignContent; appUrl: string; from: string; replyTo?: string; to: string;
}): Promise<void> {
  const msg = buildMessage({ email: opts.to, name: "Teste" }, opts.content, {
    appUrl: opts.appUrl, from: opts.from, replyTo: opts.replyTo, subjectPrefix: "[TESTE] ",
  });
  await opts.mailer.sendBatch([msg]);
}
