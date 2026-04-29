import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token ausente" }, { status: 400 });

    const link = await db.inviteLink.findUnique({ where: { token } });
    if (!link) return NextResponse.json({ error: "Inválido" }, { status: 404 });
    if (link.usedAt) return NextResponse.json({ error: "Já utilizado" }, { status: 410 });
    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({ error: "Expirado" }, { status: 410 });
    }

    return NextResponse.json({ ok: true, role: link.role });
  } catch (err) {
    console.error("[invite/validate] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
