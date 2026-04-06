import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

const DEFAULT_PERMISSIONS = [
  { role: "LEADER", module: "MEMBERS",    action: "VIEW",   granted: true  },
  { role: "LEADER", module: "MEMBERS",    action: "CREATE", granted: true  },
  { role: "LEADER", module: "MEMBERS",    action: "EDIT",   granted: true  },
  { role: "LEADER", module: "MEMBERS",    action: "DELETE", granted: false },
  { role: "LEADER", module: "ATTENDANCE", action: "VIEW",   granted: true  },
  { role: "LEADER", module: "ATTENDANCE", action: "CREATE", granted: true  },
  { role: "LEADER", module: "ATTENDANCE", action: "EDIT",   granted: true  },
  { role: "LEADER", module: "ATTENDANCE", action: "DELETE", granted: false },
  { role: "LEADER", module: "FINANCIAL",  action: "VIEW",   granted: true  },
  { role: "LEADER", module: "FINANCIAL",  action: "CREATE", granted: true  },
  { role: "LEADER", module: "FINANCIAL",  action: "EDIT",   granted: true  },
  { role: "LEADER", module: "FINANCIAL",  action: "DELETE", granted: false },
  { role: "LEADER", module: "REPORTS",    action: "VIEW",   granted: true  },
  { role: "LEADER", module: "REPORTS",    action: "EXPORT", granted: true  },
  { role: "LEADER", module: "EVENTS",     action: "VIEW",   granted: true  },
  { role: "LEADER", module: "EVENTS",     action: "CREATE", granted: true  },
  { role: "LEADER", module: "EVENTS",     action: "EDIT",   granted: true  },
  { role: "LEADER", module: "EVENTS",     action: "DELETE", granted: false },
  { role: "LEADER", module: "BIRTHDAYS",  action: "VIEW",   granted: true  },
  { role: "LEADER", module: "SHIRTS",     action: "VIEW",   granted: true  },
  { role: "LEADER", module: "SHIRTS",     action: "CREATE", granted: true  },
  { role: "LEADER", module: "SHIRTS",     action: "EDIT",   granted: true  },
  { role: "LEADER", module: "MINISTRIES", action: "VIEW",   granted: true  },
  { role: "LEADER", module: "MINISTRIES", action: "CREATE", granted: true  },
  { role: "LEADER", module: "MINISTRIES", action: "EDIT",   granted: true  },
  { role: "MEMBER", module: "MEMBERS",    action: "VIEW",   granted: false },
  { role: "MEMBER", module: "ATTENDANCE", action: "VIEW",   granted: true  },
  { role: "MEMBER", module: "FINANCIAL",  action: "VIEW",   granted: false },
  { role: "MEMBER", module: "REPORTS",    action: "VIEW",   granted: false },
  { role: "MEMBER", module: "EVENTS",     action: "VIEW",   granted: true  },
  { role: "MEMBER", module: "BIRTHDAYS",  action: "VIEW",   granted: false },
  { role: "MEMBER", module: "SHIRTS",     action: "VIEW",   granted: true  },
  { role: "MEMBER", module: "MINISTRIES", action: "VIEW",   granted: true  },
] as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function POST(req: NextRequest) {
  try {
    const { churchName, adminName, adminEmail } = await req.json();

    if (!churchName?.trim() || !adminEmail?.trim()) {
      return NextResponse.json({ error: "Nome da igreja e e-mail são obrigatórios" }, { status: 400 });
    }

    // Validação básica de e-mail
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    // Rate limiting: máximo 3 estabelecimentos criados na última hora pelo mesmo e-mail
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentByEmail = await db.userEstablishment.count({
      where: {
        pendingEmail: adminEmail.trim(),
        invitedAt: { gte: oneHourAgo },
      },
    });
    if (recentByEmail >= 3) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
        { status: 429 }
      );
    }

    // Rate limiting: máximo 10 cadastros por hora no total (proteção global)
    const recentTotal = await db.establishment.count({
      where: { createdAt: { gte: oneHourAgo } },
    });
    if (recentTotal >= 10) {
      return NextResponse.json(
        { error: "Sistema temporariamente indisponível. Tente novamente em breve." },
        { status: 429 }
      );
    }

    // Gerar ID único para o estabelecimento
    const baseId = slugify(churchName.trim());
    let eid = baseId;
    let suffix = 0;
    while (await db.establishment.findUnique({ where: { id: eid } })) {
      suffix++;
      eid = `${baseId}-${suffix}`;
    }

    // Criar estabelecimento
    const establishment = await db.establishment.create({
      data: { id: eid, name: churchName.trim() },
    });

    // Vincular admin — se o usuário já existe, cria o link direto; senão, pre-autoriza
    const existingUser = await db.user.findUnique({ where: { email: adminEmail.trim() } });
    await db.userEstablishment.create({
      data: {
        userId:       existingUser?.id ?? null,
        pendingEmail: existingUser ? null : adminEmail.trim(),
        establishmentId: establishment.id,
        role: "ADMIN",
        inviteStatus: existingUser ? "ACCEPTED" : "PENDING",
        acceptedAt:   existingUser ? new Date() : null,
      },
    });

    // Se usuário já existe, atualizar User.establishmentId se ainda não tem
    if (existingUser && existingUser.establishmentId === "default-porto-belo") {
      await db.user.update({
        where: { id: existingUser.id },
        data: { establishmentId: establishment.id, role: "ADMIN" },
      }).catch(() => {});
    }

    // Criar permissões padrão em paralelo dentro de uma transação
    await db.$transaction(
      DEFAULT_PERMISSIONS.map((p) =>
        db.rolePermission.upsert({
          where: {
            role_module_action_establishmentId: {
              role: p.role as "LEADER" | "MEMBER",
              module: p.module as "MEMBERS" | "ATTENDANCE" | "FINANCIAL" | "REPORTS" | "EVENTS" | "BIRTHDAYS" | "SHIRTS" | "SETTINGS" | "USERS" | "MINISTRIES",
              action: p.action as "VIEW" | "CREATE" | "EDIT" | "DELETE" | "EXPORT",
              establishmentId: establishment.id,
            },
          },
          update: {},
          create: {
            role: p.role as "LEADER" | "MEMBER",
            module: p.module as "MEMBERS" | "ATTENDANCE" | "FINANCIAL" | "REPORTS" | "EVENTS" | "BIRTHDAYS" | "SHIRTS" | "SETTINGS" | "USERS" | "MINISTRIES",
            action: p.action as "VIEW" | "CREATE" | "EDIT" | "DELETE" | "EXPORT",
            granted: p.granted,
            establishmentId: establishment.id,
          },
        })
      )
    );

    // Enviar e-mail de boas-vindas (não bloqueia a resposta)
    sendWelcomeEmail({
      to: adminEmail.trim(),
      name: adminName?.trim() || "Pastor(a)",
      churchName: churchName.trim(),
    }).catch(() => {});

    return NextResponse.json({ success: true, establishmentId: establishment.id });
  } catch (err) {
    console.error("[onboarding] erro:", err);
    return NextResponse.json({ error: "Erro interno ao criar congregação" }, { status: 500 });
  }
}
