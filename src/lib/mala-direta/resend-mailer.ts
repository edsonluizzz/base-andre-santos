import { Resend } from "resend";
import type { Mailer, OutMessage } from "./sender";

export function createResendMailer(): Mailer {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY ausente");
  const resend = new Resend(key);
  return {
    async sendBatch(messages: OutMessage[]) {
      const { data, error } = await resend.batch.send(
        messages.map((m) => ({
          from: m.from, to: m.to, subject: m.subject, html: m.html, text: m.text,
          headers: m.headers, ...(m.replyTo ? { replyTo: m.replyTo } : {}),
        })),
      );
      if (error || !data) throw new Error(error?.message ?? "Resend sem resposta");
      return data.data.map((d) => d.id);
    },
  };
}
