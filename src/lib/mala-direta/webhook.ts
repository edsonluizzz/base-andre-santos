import { normalizeEmail } from "./emails";

export type SuppressionAction = { emails: string[]; reason: "BOUNCE" | "COMPLAINT"; emailId: string };

type WebhookEventLike = {
  type: string;
  data: { email_id?: string; to?: string[]; bounce?: { type?: string } };
};

export function suppressionFromEvent(event: WebhookEventLike): SuppressionAction | null {
  const isComplaint = event.type === "email.complained";
  const isHardBounce = event.type === "email.bounced" && event.data.bounce?.type === "Permanent";
  if (!isComplaint && !isHardBounce) return null;
  const emails = (event.data.to ?? [])
    .map((e) => normalizeEmail(e))
    .filter((e): e is string => Boolean(e));
  if (emails.length === 0) return null;
  return { emails, reason: isComplaint ? "COMPLAINT" : "BOUNCE", emailId: event.data.email_id ?? "" };
}
