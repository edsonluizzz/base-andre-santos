import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Ativa ou revoga um link vendido do Diagnóstico Eleitoral. Só super admin.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!(session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { ativo } = await req.json().catch(() => ({}));
    if (typeof ativo !== "boolean") return NextResponse.json({ error: "Informe ativo" }, { status: 400 });
    const r = await db.diagnosticoAcesso.updateMany({ where: { id: params.id }, data: { ativo } });
    if (!r.count) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/diagnosticos/id] PATCH:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
