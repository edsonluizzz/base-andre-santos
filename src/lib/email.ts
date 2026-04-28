import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "Base André Santos <noreply@baseandresantos.com.br>";
const APP_URL = process.env.APP_URL ?? "";

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
  color:rgba(212,175,55,0.7);margin-bottom:8px;
`;

const btnStyle = `
  display:inline-block;background:#d4af37;color:#0a1220;text-decoration:none;
  padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;
`;

// ─── Convite de acesso ao sistema ─────────────────────────────────────────────

export async function sendAccessGrantedEmail({
  to,
  role,
}: {
  to: string;
  role: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const roleLabel =
    role === "ADMIN" ? "Administrador" :
    role === "LEADER" ? "Coordenador" :
    "Colaborador";

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Acesso concedido — Base André Santos 2026",
    html: `
      <div style="${baseStyle}">
        <p style="${tagStyle}">Base de Apoio 2026</p>
        <h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;">
          Acesso concedido ao sistema 🎉
        </h1>
        <p style="color:#94a3b8;line-height:1.6;">
          Você recebeu acesso à Base André Santos 2026 como
          <strong style="color:#d4af37"> ${roleLabel}</strong>.
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

// ─── Notificação de novo lead via link de convite ─────────────────────────────

export async function sendNewLeadNotificationEmail({
  to,
  cellLeaderName,
  leadName,
  leadCity,
  leadPhone,
}: {
  to: string;
  cellLeaderName: string;
  leadName: string;
  leadCity?: string | null;
  leadPhone?: string | null;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const cityLine = leadCity
    ? `<p style="color:#94a3b8;margin:4px 0;">📍 ${leadCity}</p>`
    : "";
  const phoneLine = leadPhone
    ? `<p style="color:#94a3b8;margin:4px 0;">📱 ${leadPhone}</p>`
    : "";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Novo apoiador cadastrado — Base André Santos`,
    html: `
      <div style="${baseStyle}">
        <p style="${tagStyle}">Base de Apoio 2026</p>
        <h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;">
          Novo apoiador na sua célula! 🌟
        </h1>
        <p style="color:#94a3b8;line-height:1.6;">
          Olá, <strong style="color:#fff">${cellLeaderName}</strong>!
          Alguém se cadastrou pelo seu link de convite:
        </p>
        <div style="background:#0f1a2e;border:1px solid rgba(212,175,55,0.2);border-radius:8px;padding:16px;margin:16px 0;">
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
          Base André Santos 2026 — sistema interno.
        </p>
      </div>
    `,
  }).catch(() => {});
}
