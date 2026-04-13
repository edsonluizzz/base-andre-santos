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
        <p style="color:#94a3b8;line-height:1.6;">${name && !name.includes("@") ? `Olá, <strong style="color:#fff">${name}</strong>!` : "Olá!"}</p>
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

// ─── Notificação de mudança de papel (MEMBER → LEADER / ADMIN) ───────────────

export async function sendRoleChangeEmail({
  to,
  memberName,
  churchName,
  newRole,
}: {
  to: string;
  memberName: string;
  churchName: string;
  newRole: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY não configurado — e-mail não enviado.");
    return;
  }

  const roleLabel = newRole === "ADMIN" ? "Administrador" : "Líder";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Seu papel em ${churchName} foi atualizado — Ovile`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#06080F;color:#e2e8f0;border-radius:12px;padding:32px;">
        <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#818cf8;margin-bottom:8px;">Ovile · Gestão</p>
        <h1 style="font-size:24px;font-weight:700;color:#fff;margin:0 0 16px;">Atualização de papel 🎉</h1>
        <p style="color:#94a3b8;line-height:1.6;">
          Olá, <strong style="color:#fff">${memberName}</strong>!<br/>
          Seu papel em <strong style="color:#fff">${churchName}</strong> foi atualizado para
          <strong style="color:#818cf8">${roleLabel}</strong>.
        </p>
        <div style="margin:24px 0;">
          <a href="${process.env.NEXTAUTH_URL ?? "https://ovile.com.br"}/dashboard"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
            Acessar o sistema →
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          Este e-mail foi enviado automaticamente pelo Ovile Gestão.
        </p>
      </div>
    `,
  });
}

// ─── Notificação diária de aniversariantes ────────────────────────────────────

export async function sendBirthdayNotificationEmail({
  to,
  adminName,
  churchName,
  todayBirthdays,
  tomorrowBirthdays,
}: {
  to: string;
  adminName: string;
  churchName: string;
  todayBirthdays: { name: string; birthday: string }[];
  tomorrowBirthdays: { name: string; birthday: string }[];
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY não configurado — e-mail não enviado.");
    return;
  }

  const renderList = (members: { name: string; birthday: string }[]) =>
    members
      .map(
        (m) => `
        <li style="color:#94a3b8;line-height:2;">
          <strong style="color:#fff">${m.name}</strong>
          <span style="color:#64748b;font-size:13px;"> — ${m.birthday}</span>
        </li>`
      )
      .join("");

  const todaySection =
    todayBirthdays.length > 0
      ? `<p style="color:#818cf8;font-weight:600;margin:20px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Hoje</p>
         <ul style="padding-left:16px;margin:0 0 16px;">${renderList(todayBirthdays)}</ul>`
      : "";

  const tomorrowSection =
    tomorrowBirthdays.length > 0
      ? `<p style="color:#818cf8;font-weight:600;margin:20px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Amanhã</p>
         <ul style="padding-left:16px;margin:0 0 16px;">${renderList(tomorrowBirthdays)}</ul>`
      : "";

  const dateLabel = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

  await resend.emails.send({
    from: FROM,
    to,
    subject: `🎂 Aniversariantes de ${churchName} — ${dateLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#06080F;color:#e2e8f0;border-radius:12px;padding:32px;">
        <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#818cf8;margin-bottom:8px;">Ovile · Gestão</p>
        <h1 style="font-size:24px;font-weight:700;color:#fff;margin:0 0 16px;">Aniversariantes 🎂</h1>
        <p style="color:#94a3b8;line-height:1.6;">
          Olá, <strong style="color:#fff">${adminName}</strong>!
          Confira os aniversariantes de <strong style="color:#fff">${churchName}</strong>:
        </p>
        ${todaySection}
        ${tomorrowSection}
        <div style="margin:24px 0;">
          <a href="${process.env.NEXTAUTH_URL ?? "https://ovile.com.br"}/login"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
            Acessar o sistema →
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          Você recebe este e-mail pois é administrador de ${churchName} no Ovile Gestão.
        </p>
      </div>
    `,
  });
}
