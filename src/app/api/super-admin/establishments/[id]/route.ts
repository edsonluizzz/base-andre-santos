import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const PROTECTED_ID = "default-porto-belo";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.isSuperAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { suspended, name, pixKey, plan, adminNote } = body;

    if (suspended !== undefined) {
      if (typeof suspended !== "boolean")
        return NextResponse.json({ error: "Campo 'suspended' deve ser boolean" }, { status: 400 });
      if (params.id === PROTECTED_ID && suspended)
        return NextResponse.json({ error: "O estabelecimento principal não pode ser suspenso" }, { status: 403 });
    }

    if (plan !== undefined && !["FREE", "PRO"].includes(plan))
      return NextResponse.json({ error: "Plano inválido. Use FREE ou PRO." }, { status: 400 });

    const establishment = await db.establishment.findUnique({ where: { id: params.id } });
    if (!establishment)
      return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (suspended !== undefined) data.suspended = suspended;
    if (name?.trim()) data.name = name.trim();
    if (pixKey !== undefined) data.pixKey = pixKey?.trim() || null;
    if (plan !== undefined) data.plan = plan;
    if (adminNote !== undefined) data.adminNote = adminNote?.trim() || null;

    const updated = await db.establishment.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.isSuperAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (params.id === PROTECTED_ID)
      return NextResponse.json({ error: "O estabelecimento principal não pode ser excluído" }, { status: 403 });

    const establishment = await db.establishment.findUnique({ where: { id: params.id } });
    if (!establishment)
      return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 });

    // Cascade: apaga vínculos, membros, eventos, financeiro, etc.
    await db.establishment.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
