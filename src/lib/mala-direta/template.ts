import { CAMPAIGN_ENTITY, CANDIDATE_NUMBER } from "@/lib/campaign-identification";

export type PropagandaInput = {
  subject: string;
  bodyText: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  firstName?: string | null;
  unsubscribeUrl: string;
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function personalize(text: string, firstName?: string | null): string {
  return text.replace(/\{\{\s*nome\s*\}\}/gi, (firstName ?? "").trim() || "amigo(a)");
}

const FOOTER_LINES = [
  `Propaganda eleitoral — André Santos, ${CANDIDATE_NUMBER}, candidato a Deputado Estadual (PR).`,
  `Enviado por ${CAMPAIGN_ENTITY.razaoSocial} — CNPJ ${CAMPAIGN_ENTITY.cnpj}.`,
  "Você recebe este email porque se cadastrou como apoiador(a) da campanha.",
];

export function renderPropagandaEmail(input: PropagandaInput): { html: string; text: string } {
  const body = personalize(input.bodyText, input.firstName).trim();
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const cta = input.ctaUrl && /^https:\/\//i.test(input.ctaUrl) && input.ctaLabel?.trim()
    ? { url: input.ctaUrl, label: input.ctaLabel.trim() }
    : null;

  const paragraphsHtml = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  const ctaHtml = cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#ff6b04;color:#0a1220;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700">${escapeHtml(cta.label)}</a></p>`
    : "";
  const footerHtml = FOOTER_LINES.map((l) => escapeHtml(l)).join("<br>");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
${paragraphsHtml}
${ctaHtml}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px">
<p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280">${footerHtml}<br>
<a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#6b7280">Não quero mais receber estes emails</a></p>
</div>
</body>
</html>`;

  const text = [
    paragraphs.join("\n\n"),
    cta ? `${cta.label}: ${cta.url}` : "",
    "—",
    ...FOOTER_LINES,
    `Não quero mais receber: ${input.unsubscribeUrl}`,
  ].filter(Boolean).join("\n\n");

  return { html, text };
}

export function buildUnsubscribeHeaders(oneClickUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
