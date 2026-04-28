import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

// Endpoint de uso único: define city=Curitiba para pastores sem cidade com DDD 41
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Busca pastores sem cidade cadastrada
    const candidates = await db.collaborator.findMany({
      where: {
        campaignId: CID,
        profile: "PASTOR",
        city: null,
        phone: { not: null },
      },
      select: { id: true, phone: true },
    });

    // Filtra apenas DDD 41 (Curitiba e região metropolitana)
    const curitibaIds = candidates
      .filter((c) => {
        const digits = (c.phone ?? "").replace(/\D/g, "");
        return digits.startsWith("41") || digits.startsWith("5541");
      })
      .map((c) => c.id);

    if (curitibaIds.length === 0) {
      return NextResponse.json({ updated: 0, message: "Nenhum pastor sem cidade com DDD 41 encontrado" });
    }

    const result = await db.collaborator.updateMany({
      where: { id: { in: curitibaIds } },
      data: { city: "Curitiba" },
    });

    await db.auditLog.create({
      data: { action: "BULK_FIX", actorId: session.user.id, metadata: { fix: "curitiba-pastors", updated: result.count } },
    }).catch(() => {});

    return NextResponse.json({ updated: result.count, message: `${result.count} pastores atualizados para Curitiba` });
  } catch (err) {
    console.error("[fix/curitiba-pastors]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
