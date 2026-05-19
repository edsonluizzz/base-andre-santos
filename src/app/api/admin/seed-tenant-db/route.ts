import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Rota temporária de seed — executa UMA VEZ para popular Campaign.dbUrl.
 * Deletar após uso (Sprint 1 only).
 * POST /api/admin/seed-tenant-db
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: "DATABASE_URL não definida" }, { status: 500 });
    }

    await db.campaign.update({
      where: { id: "andre-santos-2026" },
      data: { dbUrl, slug: "andre-santos" },
    });

    return NextResponse.json({ ok: true, message: "Campaign.dbUrl populado com sucesso." });
  } catch (err) {
    console.error("[seed-tenant-db]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
