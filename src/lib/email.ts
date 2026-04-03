import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "Ovile Gestão <noreply@ovile.com.br>";

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// ─── E-mail de boas-vindas ao criar a congregação ─────────────────────────────

export async function sendWelcomeEmail({
  to,
  name,
  churchName,
}: {
  to: string;
  name: string;
  churchName: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY não configurado — e-mail não enviado.");
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Bem-vindo ao Ovile Gestão — ${churchName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#06080F;color:#e2e8f0;border-radius:12px;padding:32px;">
        <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#818cf8;margin-bottom:8px;">Ovile · Gestão</p>
        <h1 style="font-size:24px;font-weight:700;color:#fff;margin:0 0 16px;">Sua congregação foi criada! 🎉</h1>
        <p style="color:#94a3b8;line-height:1.6;">Olá, <strong style="color:#fff">${name}</strong>!</p>
        <p style="color:#94a3b8;line-height:1.6;">
          A congregação <strong style="color:#fff">${churchName}</strong> foi configurada com sucesso no Ovile Gestão.
          Você já pode fazer login com sua conta Google para começar a gerenciar membros, eventos, financeiro e muito mais.
        </p>
        <div style="margin:24px 0;">
          <a href="${process.env.NEXTAUTH_URL ?? "https://ovile.com.br"}/login"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
            Acessar o sistema →
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          Se você não solicitou este cadastro, ignore este e-mail.
        </p>
      </div>
    `,
  });
}

// ─── Convite de novo membro ───────────────────────────────────────────────────

export async function sendInviteEmail({
  to,
  name,
  churchName,
  invitedBy,
}: {
  to: string;
  name: string;
  churchName: string;
  invitedBy: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY não configurado — e-mail não enviado.");
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Você foi convidado para o ${churchName} no Ovile Gestão`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#06080F;color:#e2e8f0;border-radius:12px;padding:32px;">
        <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#818cf8;margin-bottom:8px;">Ovile · Gestão</p>
        <h1 style="font-size:24px;font-weight:700;color:#fff;margin:0 0 16px;">Você foi convidado!</h1>
        <p style="color:#94a3b8;line-height:1.6;">Olá, <strong style="color:#fff">${name}</strong>!</p>
        <p style="color:#94a3b8;line-height:1.6;">
          <strong style="color:#fff">${invitedBy}</strong> convidou você para acessar o sistema de gestão da
          <strong style="color:#fff">${churchName}</strong> no Ovile Gestão.
        </p>
        <div style="margin:24px 0;">
          <a href="${process.env.NEXTAUTH_URL ?? "https://ovile.com.br"}/login"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
            Aceitar convite →
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          Faça login com a conta Google associada a este endereço de e-mail.
          Se você não esperava este convite, ignore este e-mail.
        </p>
      </div>
    `,
  });
}
