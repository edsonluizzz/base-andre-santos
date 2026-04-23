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

// ─── Notificação de novo evento ──────────────────────────────────────────────

export async function sendEventCreatedEmail({
  to,
  memberName,
  churchName,
  eventTitle,
  eventDate,
  eventLocation,
}: {
  to: string;
  memberName: string;
  churchName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation?: string | null;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY não configurado — e-mail não enviado.");
    return;
  }

  const locationLine = eventLocation
    ? `<p style="color:#94a3b8;line-height:1.6;">📍 <strong style="color:#fff">${eventLocation}</strong></p>`
    : "";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `📅 Novo evento: ${eventTitle} — ${churchName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#06080F;color:#e2e8f0;border-radius:12px;padding:32px;">
        <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#818cf8;margin-bottom:8px;">Ovile · Gestão</p>
        <h1 style="font-size:24px;font-weight:700;color:#fff;margin:0 0 16px;">Novo evento 📅</h1>
        <p style="color:#94a3b8;line-height:1.6;">
          Olá${memberName ? `, <strong style="color:#fff">${memberName}</strong>` : ""}!<br/>
          Um novo evento foi criado em <strong style="color:#fff">${churchName}</strong>:
        </p>
        <div style="background:#0f1629;border:1px solid #1e2a4a;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="font-size:18px;font-weight:700;color:#fff;margin:0 0 8px;">${eventTitle}</p>
          <p style="color:#818cf8;line-height:1.6;margin:0;">🗓 ${eventDate}</p>
          ${locationLine}
        </div>
        <div style="margin:24px 0;">
          <a href="${process.env.NEXTAUTH_URL ?? "https://ovile.com.br"}/chamada"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
            Ver eventos →
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          Você recebe este e-mail pois é membro de ${churchName} no Ovile Gestão.
        </p>
      </div>
    `,
  });
}

// ─── Comunicado broadcast ─────────────────────────────────────────────────────

export async function sendBroadcastEmail({
  to,
  memberName,
  churchName,
  title,
  message,
}: {
  to: string;
  memberName: string;
  churchName: string;
  title: string;
  message: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const messageHtml = message.replace(/\n/g, "<br/>");

  await resend.emails.send({
    from: FROM,
    to,
    subject: `📢 ${title} — ${churchName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#06080F;color:#e2e8f0;border-radius:12px;padding:32px;">
        <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#818cf8;margin-bottom:8px;">Ovile · Gestão · ${churchName}</p>
        <h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;">${title}</h1>
        <p style="color:#94a3b8;line-height:1.6;">
          Olá${memberName ? `, <strong style="color:#fff">${memberName}</strong>` : ""}!
        </p>
        <div style="background:#0f1629;border:1px solid #1e2a4a;border-radius:8px;padding:16px;margin:16px 0;color:#e2e8f0;line-height:1.7;">
          ${messageHtml}
        </div>
        <div style="margin:24px 0;">
          <a href="${process.env.NEXTAUTH_URL ?? "https://ovile.com.br"}/portal"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
            Acessar meu portal →
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          Você recebe este comunicado pois é membro de ${churchName} no Ovile Gestão.
        </p>
      </div>
    `,
  });
}

// ─── Nurturing — Dia 1 ────────────────────────────────────────────────────────

export async function sendNurturingDay1Email({
  to,
  name,
  churchName,
}: {
  to: string;
  name: string;
  churchName: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const appUrl = process.env.NEXTAUTH_URL ?? "https://ovile.com.br";
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Próximo passo: adicione os membros de ${churchName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#06080F;color:#e2e8f0;border-radius:12px;padding:32px;">
        <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#818cf8;margin-bottom:8px;">Ovile · Gestão</p>
        <h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;">Sua congregação está pronta 🚀</h1>
        <p style="color:#94a3b8;line-height:1.6;">Olá, <strong style="color:#fff">${name}</strong>!</p>
        <p style="color:#94a3b8;line-height:1.6;">
          Você criou <strong style="color:#fff">${churchName}</strong> no Ovile Gestão. O próximo passo é
          adicionar os membros da sua congregação para começar a fazer chamadas e registrar frequência.
        </p>
        <div style="background:#0f1629;border:1px solid #1e2a4a;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="font-weight:600;color:#fff;margin:0 0 8px;">O que você pode fazer agora:</p>
          <ul style="color:#94a3b8;padding-left:16px;margin:0;line-height:2;">
            <li>Adicionar membros manualmente ou importar por planilha</li>
            <li>Gerar o link de convite para os membros entrarem sozinhos</li>
            <li>Criar o primeiro evento e fazer a chamada</li>
          </ul>
        </div>
        <div style="margin:24px 0;">
          <a href="${appUrl}/membros"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
            Adicionar membros →
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          Você recebe este e-mail pois é administrador de ${churchName} no Ovile Gestão.
        </p>
      </div>
    `,
  });
}

// ─── Nurturing — Dia 3 ────────────────────────────────────────────────────────

export async function sendNurturingDay3Email({
  to,
  name,
  churchName,
}: {
  to: string;
  name: string;
  churchName: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const appUrl = process.env.NEXTAUTH_URL ?? "https://ovile.com.br";
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Faça a chamada diretamente pelo celular — ${churchName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#06080F;color:#e2e8f0;border-radius:12px;padding:32px;">
        <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#818cf8;margin-bottom:8px;">Ovile · Gestão</p>
        <h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;">Você sabia? 📋</h1>
        <p style="color:#94a3b8;line-height:1.6;">Olá, <strong style="color:#fff">${name}</strong>!</p>
        <p style="color:#94a3b8;line-height:1.6;">
          Com o Ovile você faz a <strong style="color:#fff">chamada de presença pelo celular</strong> — sem papel, sem planilha.
          Toque em cada nome para marcar "Presente", "Ausente" ou "Justificado". Tudo salvo automaticamente.
        </p>
        <div style="background:#0f1629;border:1px solid #1e2a4a;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="font-weight:600;color:#fff;margin:0 0 8px;">Recursos da Chamada:</p>
          <ul style="color:#94a3b8;padding-left:16px;margin:0;line-height:2;">
            <li>Presença, Ausência ou Justificativa com um toque</li>
            <li>Radar de liderança — veja quem faltou 3x seguidas</li>
            <li>Contato direto pelo WhatsApp para ausentes</li>
            <li>Exportar lista de presença em PDF</li>
          </ul>
        </div>
        <div style="margin:24px 0;">
          <a href="${appUrl}/chamada"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
            Fazer chamada agora →
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          Você recebe este e-mail pois é administrador de ${churchName} no Ovile Gestão.
        </p>
      </div>
    `,
  });
}

// ─── Nurturing — Dia 7 ────────────────────────────────────────────────────────

export async function sendNurturingDay7Email({
  to,
  name,
  churchName,
}: {
  to: string;
  name: string;
  churchName: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const appUrl = process.env.NEXTAUTH_URL ?? "https://ovile.com.br";
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${churchName} merece o plano PRO — R$ 29,99/mês`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#06080F;color:#e2e8f0;border-radius:12px;padding:32px;">
        <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#818cf8;margin-bottom:8px;">Ovile · Gestão</p>
        <h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px;">Desbloqueie todo o potencial 🏆</h1>
        <p style="color:#94a3b8;line-height:1.6;">Olá, <strong style="color:#fff">${name}</strong>!</p>
        <p style="color:#94a3b8;line-height:1.6;">
          Você está usando o Ovile há uma semana. O plano gratuito já entrega muito,
          mas o <strong style="color:#fff">PRO</strong> foi feito para congregações que querem crescer sem limites.
        </p>
        <div style="background:#0f1629;border:1px solid #4f46e5;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="font-weight:600;color:#818cf8;margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Plano PRO — R$ 29,99/mês</p>
          <ul style="color:#94a3b8;padding-left:16px;margin:0;line-height:2;">
            <li><strong style="color:#fff">Membros ilimitados</strong> (FREE: 50)</li>
            <li>Relatórios completos de frequência e financeiro</li>
            <li>Gestão de ministérios e camisetas para eventos</li>
            <li>Portal do membro com histórico e RSVP</li>
            <li>Suporte prioritário</li>
          </ul>
        </div>
        <div style="margin:24px 0;">
          <a href="${appUrl}/configuracoes"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
            Fazer upgrade para PRO →
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          Você recebe este e-mail pois é administrador de ${churchName} no Ovile Gestão.
          Para cancelar estes e-mails, acesse Configurações no sistema.
        </p>
      </div>
    `,
  });
}

// ─── Relatório semanal ───────────────────────────────────────────────────────

export async function sendWeeklyReportEmail({
  to,
  recipientName,
  churchName,
  weekStart,
  events,
  totalOfferings,
  activeMembers,
  newVisitors,
}: {
  to: string;
  recipientName: string;
  churchName: string;
  weekStart: Date;
  events: { title: string; date: Date; present: number; total: number; rate: number | null }[];
  totalOfferings: number;
  activeMembers: number;
  newVisitors: number;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const appUrl = process.env.NEXTAUTH_URL ?? "https://ovile.com.br";
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  const fmtCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const weekLabel = `${fmtDate(weekStart)} – ${fmtDate(new Date())}`;

  const eventsRows =
    events.length === 0
      ? `<tr><td colspan="3" style="padding:12px;color:#64748b;text-align:center;">Nenhum evento esta semana</td></tr>`
      : events
          .map(
            (e) => `
          <tr>
            <td style="padding:8px 12px;color:#e2e8f0;border-bottom:1px solid #1e2a4a;">${e.title}</td>
            <td style="padding:8px 12px;color:#64748b;border-bottom:1px solid #1e2a4a;font-size:12px;">${fmtDate(new Date(e.date))}</td>
            <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #1e2a4a;">
              ${
                e.rate !== null
                  ? `<span style="color:${e.rate >= 70 ? "#34d399" : "#f59e0b"};">${e.rate}%</span>
                     <span style="color:#64748b;font-size:11px;"> (${e.present}/${e.total})</span>`
                  : `<span style="color:#64748b;">—</span>`
              }
            </td>
          </tr>`
          )
          .join("");

  const visitorsRow =
    newVisitors > 0
      ? `<div style="background:#0f1629;border:1px solid #1e2a4a;border-radius:8px;padding:14px 16px;margin-top:12px;">
           <span style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#818cf8;">Visitantes esta semana</span>
           <p style="font-size:24px;font-weight:700;color:#fff;margin:4px 0 0;">${newVisitors}</p>
         </div>`
      : "";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `📊 Relatório semanal — ${churchName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#06080F;color:#e2e8f0;border-radius:12px;padding:32px;">
        <p style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#818cf8;margin-bottom:8px;">Ovile · Gestão</p>
        <h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 4px;">Relatório da semana 📊</h1>
        <p style="color:#64748b;font-size:13px;margin:0 0 24px;">${weekLabel} · ${churchName}</p>

        <p style="color:#94a3b8;line-height:1.6;">
          Olá, <strong style="color:#fff">${recipientName}</strong>! Aqui está o resumo da semana:
        </p>

        <!-- Stats Row -->
        <div style="display:flex;gap:12px;margin:20px 0;flex-wrap:wrap;">
          <div style="flex:1;min-width:120px;background:#0f1629;border:1px solid #1e2a4a;border-radius:8px;padding:14px 16px;">
            <span style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#818cf8;">Membros ativos</span>
            <p style="font-size:24px;font-weight:700;color:#fff;margin:4px 0 0;">${activeMembers}</p>
          </div>
          <div style="flex:1;min-width:120px;background:#0f1629;border:1px solid #1e2a4a;border-radius:8px;padding:14px 16px;">
            <span style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#818cf8;">Eventos</span>
            <p style="font-size:24px;font-weight:700;color:#fff;margin:4px 0 0;">${events.length}</p>
          </div>
          ${
            totalOfferings > 0
              ? `<div style="flex:1;min-width:120px;background:#0f1629;border:1px solid #1e2a4a;border-radius:8px;padding:14px 16px;">
                   <span style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#818cf8;">Ofertas</span>
                   <p style="font-size:20px;font-weight:700;color:#34d399;margin:4px 0 0;">${fmtCurrency(totalOfferings)}</p>
                 </div>`
              : ""
          }
        </div>
        ${visitorsRow}

        <!-- Events Table -->
        ${
          events.length > 0
            ? `<p style="color:#818cf8;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:24px 0 8px;">Eventos da semana</p>
               <table style="width:100%;border-collapse:collapse;background:#0f1629;border-radius:8px;overflow:hidden;border:1px solid #1e2a4a;">
                 <thead>
                   <tr style="background:#1e2a4a;">
                     <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Evento</th>
                     <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Data</th>
                     <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Frequência</th>
                   </tr>
                 </thead>
                 <tbody>${eventsRows}</tbody>
               </table>`
            : ""
        }

        <div style="margin:28px 0 0;">
          <a href="${appUrl}/relatorios"
             style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
            Ver relatórios completos →
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          Você recebe este relatório pois é líder de ${churchName} no Ovile Gestão.
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
