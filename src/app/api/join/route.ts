import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Rate limit: máximo de tentativas de lookup de código por IP por janela de tempo
const JOIN_LOOKUP_WINDOW_MS = 60 * 1000; // 1 minuto
const JOIN_LOOKUP_MAX = 20; // 20 lookups por minuto por IP

// Cache em memória leve (por processo — suficiente para Vercel Fluid Compute)
const ipLookupCache = new Map<string, { count: number; resetAt: number }>();

function checkJoinRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipLookupCache.get(ip);
  if (!entry || now > entry.resetAt) {
    ipLookupCache.set(ip, { count: 1, resetAt: now + JOIN_LOOKUP_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= JOIN_LOOKUP_MAX;
}

// GET /api/join?c=CODE — busca informações do estabelecimento pelo código (público)
export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkJoinRateLimit(ip))
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um momento." }, { status: 429 });

    const code = req.nextUrl.searchParams.get("c")?.trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "Código inválido" }, { status: 400 });

    const est = await db.establishment.findUnique({
      where: { joinCode: code },
      select: { id: true, name: true, suspended: true },
    });

    if (!est) return NextResponse.json({ error: "Código não encontrado" }, { status: 404 });
    if (est.suspended) return NextResponse.json({ error: "Esta congregação está suspensa" }, { status: 403 });

    return NextResponse.json({ id: est.id, name: est.name });
  } catch (err) {
    console.error("[join] GET erro:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/join — entra em um estabelecimento usando código (requer login)
export async function POST(req: NextRequest) {
  try {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, memberId } = await req.json();
  if (!code) return NextResponse.json({ error: "Código obrigatório" }, { status: 400 });

  const est = await db.establishment.findUnique({
    where: { joinCode: code.trim().toUpperCase() },
    select: { id: true, name: true, suspended: true },
  });

  if (!est) return NextResponse.json({ error: "Código não encontrado" }, { status: 404 });
  if (est.suspended) return NextResponse.json({ error: "Esta congregação está suspensa" }, { status: 403 });

  await db.userEstablishment.upsert({
    where: {
      userId_establishmentId: { userId: session.user.id, establishmentId: est.id },
    },
    update: { inviteStatus: "ACCEPTED", acceptedAt: new Date() },
    create: {
      userId: session.user.id,
      establishmentId: est.id,
      role: "MEMBER",
      inviteStatus: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });

  // Se memberId fornecido, vincular ao membro existente (evita criar duplicata)
  if (memberId) {
    const targetMember = await db.member.findFirst({
      where: { id: memberId, establishmentId: est.id, userId: null },
    });
    if (targetMember) {
      await db.member.update({
        where: { id: targetMember.id },
        data: { userId: session.user.id },
      });
      console.log(`[join] POST userId=${session.user.id} est=${est.id} linked to member=${memberId}`);
      return NextResponse.json({ establishmentId: est.id, name: est.name });
    }
    // memberId inválido ou já vinculado — cai no fluxo normal abaixo
  }

  // Cria registro de membro se ainda não existir para este usuário
  // userId é @unique globalmente — checamos sem filtrar por establishment
  const existingMember = await db.member.findUnique({
    where: { userId: session.user.id },
  });

  let memberName = "Novo membro";
  if (!existingMember) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    memberName = user?.name ?? user?.email ?? "Novo membro";
    await db.member.create({
      data: {
        name: memberName,
        establishmentId: est.id,
        userId: session.user.id,
      },
    });

    // Notifica os admins do estabelecimento sobre o novo membro
    const admins = await db.userEstablishment.findMany({
      where: {
        establishmentId: est.id,
        role: "ADMIN",
        inviteStatus: "ACCEPTED",
        userId: { not: null },
      },
      select: { userId: true },
    });

    const notifyAdmins = admins.filter((a) => a.userId !== session.user.id);
    if (notifyAdmins.length > 0) {
      await db.notification.createMany({
        data: notifyAdmins.map((a) => ({
          userId: a.userId!,
          title: "Novo membro cadastrado",
          body: `${memberName} entrou em ${est.name} via link de convite.`,
          type: "NEW_MEMBER",
          link: "/membros",
        })),
        skipDuplicates: true,
      });
    }
  }

    console.log(`[join] POST userId=${session.user.id} est=${est.id} newMember=${!existingMember}`);
    return NextResponse.json({ establishmentId: est.id, name: est.name });
  } catch (err) {
    console.error("[join] POST erro:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
