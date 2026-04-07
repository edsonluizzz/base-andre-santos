import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// Permite que o super admin crie/confirme seu próprio vínculo (UserEstablishment)
// com qualquer estabelecimento, garantindo acesso ao switcher.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.isSuperAdmin || !session.user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const est = await db.establishment.findUnique({ where: { id: params.id } });
    if (!est)
      return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 });

    await db.userEstablishment.upsert({
      where: {
        userId_establishmentId: {
          userId: session.user.id,
          establishmentId: params.id,
        },
      },
      update: {
        role: "ADMIN",
        inviteStatus: "ACCEPTED",
        acceptedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        establishmentId: params.id,
        role: "ADMIN",
        inviteStatus: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
