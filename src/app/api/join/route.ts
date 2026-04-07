import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/join?c=CODE — busca informações do estabelecimento pelo código (público)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("c")?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Código inválido" }, { status: 400 });

  const est = await db.establishment.findUnique({
    where: { joinCode: code },
    select: { id: true, name: true, suspended: true },
  });

  if (!est) return NextResponse.json({ error: "Código não encontrado" }, { status: 404 });
  if (est.suspended) return NextResponse.json({ error: "Esta congregação está suspensa" }, { status: 403 });

  return NextResponse.json({ id: est.id, name: est.name });
}

// POST /api/join — entra em um estabelecimento usando código (requer login)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
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

  return NextResponse.json({ establishmentId: est.id, name: est.name });
}
