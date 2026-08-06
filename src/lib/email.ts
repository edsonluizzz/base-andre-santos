import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "Base de Apoio <noreply@baseandresantos.com.br>";
const APP_URL = process.env.APP_URL ?? "";

// Helper pra formatar o nome da campanha nos emails de forma consistente.
function campaignLabel(campaignName?: string): string {
  return campaignName?.trim() || "Base de Apoio";
}

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const baseStyle = `
  font-family:sans-serif;max-width:520px;margin:0 auto;
  background:#0a1220;color:#e2e8f0;border-radius:12px;padding:32px;
`;

const tagStyle = `
  font-size:11px;letter-spacing:4px;text-transform:uppercase;
  color:rgba(255,107,4,0.7);margin-bottom:8px;
`;

const btnStyle = `
  display:inline-block;background:#ff6b04;color:#0a1220;text-decoration:none;
  padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;
`;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// ─── Broadcast — comunicado em massa ─────────────────────────────────────────

export async function sendBroadcastEmails(
  recipients: { email: string; name: string }[],
  title: string,
  message: string,
  campaignName?: string,
): Promise<number> {
  const resend = getResend();
  if (!resend || recipients.length === 0) return 0;
  const label = campaignLabel(campaignName);

  const safe = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
<p style="${tagStyle}">Comunicado — ${label}</p>
<h1 style="font-size:20px;font-weight:700;color:#fff;margin:0 0 20px">${title}</h1>
<div style="background:#0f1a2e;border-radius:8px;padding:20px;font-size:15px;line-height:1.7;color:#cbd5e1">${safe}</div>
<p style="color:#475569;font-size:12px;margin-top:28px">${label} — comunicação interna da base de apoio.</p>
</body>
</html>`;

  const BATCH = 50;
  let sent = 0;

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    try {
      await resend.batch.send(
        batch.map((r) => ({
          from: FROM,
          to: r.email,
          subject: `[Comunicado] ${title}`,
          html,
        })),
      );
      sent += batch.length;
    } catch (err) {
      console.error("[resend] broadcast batch error:", err);
    }
  }

  return sent;
}

// ─── Convite de acesso ao sistema ─────────────────────────────────────────────

export async function sendAccessGrantedEmail({
  to,
  role,
  campaignName,
}: {
  to: string;
  role: string;
  campaignName?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const label = campaignLabel(campaignName);
  const roleLabel =
    role === "ADMIN" ? "Administrador" :
    role === "LEADER" ? "Coordenador" :
    "Colaborador";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Acesso concedido — ${label}`,
    html: `
      <div style="${baseStyle}">
        <p style="${tagStyle}">${label}</p>
        <h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;">
          Acesso concedido ao sistema 🎉
        </h1>
        <p style="color:#94a3b8;line-height:1.6;">
          Você recebeu acesso a <strong style="color:#fff">${label}</strong> como
          <strong style="color:#ff6b04"> ${roleLabel}</strong>.
        </p>
        <p style="color:#94a3b8;line-height:1.6;">
          Faça login com a conta Google associada a este e-mail para acessar o sistema.
        </p>
        <div style="margin:24px 0;">
          <a href="${APP_URL}/login" style="${btnStyle}">
            Acessar com Google →
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          Se você não esperava este acesso, ignore este e-mail.
        </p>
      </div>
    `,
  }).catch(() => {});
}

// ─── Recibo de pagamento (Financeiro de Entregas — Igrejas) ──────────────────

export async function sendPaymentReceiptEmail({
  to,
  collaboratorName,
  amount,
  pdfBuffer,
  fileName,
  campaignName,
}: {
  to: string;
  collaboratorName: string;
  amount: number;
  pdfBuffer: Buffer;
  fileName: string;
  campaignName?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) throw new Error("Resend não configurado (RESEND_API_KEY ausente)");
  const label = campaignLabel(campaignName);
  const amountLabel = amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // resend.emails.send() resolve normalmente (não lança) em erros de validação da API —
  // o resultado precisa ser inspecionado explicitamente pra não marcar SENT indevidamente.
  const result = await resend.emails.send({
    from: FROM,
    to,
    subject: `Recibo de pagamento — ${label}`,
    html: `
      <div style="${baseStyle}">
        <p style="${tagStyle}">${label}</p>
        <h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;">
          Recibo de pagamento
        </h1>
        <p style="color:#94a3b8;line-height:1.6;">
          Olá, <strong style="color:#fff">${collaboratorName}</strong>! Segue em anexo o recibo
          referente ao pagamento de <strong style="color:#ff6b04">${amountLabel}</strong> pelas
          entregas realizadas.
        </p>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          ${label} — comunicação interna da base de apoio.
        </p>
      </div>
    `,
    attachments: [{ filename: fileName, content: pdfBuffer }],
  });

  if (result.error) throw new Error(result.error.message ?? "Falha ao enviar email via Resend");
}

// ─── Notificação de novo lead via link de convite ─────────────────────────────

export async function sendNewLeadNotificationEmail({
  to,
  cellLeaderName,
  leadName,
  leadCity,
  leadPhone,
  campaignName,
}: {
  to: string;
  cellLeaderName: string;
  leadName: string;
  leadCity?: string | null;
  leadPhone?: string | null;
  campaignName?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const label = campaignLabel(campaignName);

  const cityLine = leadCity
    ? `<p style="color:#94a3b8;margin:4px 0;">📍 ${leadCity}</p>`
    : "";
  const phoneLine = leadPhone
    ? `<p style="color:#94a3b8;margin:4px 0;">📱 ${leadPhone}</p>`
    : "";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Novo apoiador cadastrado — ${label}`,
    html: `
      <div style="${baseStyle}">
        <p style="${tagStyle}">${label}</p>
        <h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;">
          Novo apoiador na sua célula! 🌟
        </h1>
        <p style="color:#94a3b8;line-height:1.6;">
          Olá, <strong style="color:#fff">${cellLeaderName}</strong>!
          Alguém se cadastrou pelo seu link de convite:
        </p>
        <div style="background:#0f1a2e;border:1px solid rgba(255,107,4,0.2);border-radius:8px;padding:16px;margin:16px 0;">
          <p style="font-size:16px;font-weight:700;color:#fff;margin:0 0 8px;">${leadName}</p>
          ${cityLine}
          ${phoneLine}
        </div>
        <p style="color:#94a3b8;line-height:1.6;">
          Este lead está aguardando qualificação na sua célula.
        </p>
        <div style="margin:24px 0;">
          <a href="${APP_URL}/minha-celula" style="${btnStyle}">
            Ver Minha Célula →
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          ${label} — sistema interno.
        </p>
      </div>
    `,
  }).catch(() => {});
}
