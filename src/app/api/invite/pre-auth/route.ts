import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token ausente" }, { status: 400 });

    const link = await db.inviteLink.findUnique({ where: { token } });
    if (!link) return NextResponse.json({ error: "Convite inválido" }, { status: 404 });
    if (link.usedAt) return NextResponse.json({ error: "Convite já utilizado" }, { status: 410 });
    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("invite_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 minutos
    });
    return res;
  } catch (err) {
    console.error("[invite/pre-auth] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
