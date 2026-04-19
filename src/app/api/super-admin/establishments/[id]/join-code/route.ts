import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

function generateCode(): string {
  // Código de 6 caracteres alfanumérico, sem caracteres confusos (0/O, 1/I/L)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// POST — gera ou regenera o joinCode de um estabelecimento
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.isSuperAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const est = await db.establishment.findUnique({ where: { id: params.id } });
    if (!est) return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 });

    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await db.establishment.findUnique({ where: { joinCode: code } });
      if (!exists) break;
      code = generateCode();
      attempts++;
    }

    const updated = await db.establishment.update({
      where: { id: params.id },
      data: { joinCode: code },
      select: { joinCode: true },
    });

    return NextResponse.json({ joinCode: updated.joinCode });
  } catch (err) {
    console.error("[super-admin/join-code POST] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE — remove o joinCode (desativa o link de acesso)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.isSuperAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.establishment.update({
      where: { id: params.id },
      data: { joinCode: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[super-admin/join-code DELETE] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
