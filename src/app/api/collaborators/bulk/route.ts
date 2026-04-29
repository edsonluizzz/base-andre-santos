import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recalcTier } from "@/lib/tier";

const CID = "andre-santos-2026";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "LEADER"].includes(session.user.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { ids, status, campaignRole, supportStatus } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0)
      return NextResponse.json({ error: "Nenhum ID fornecido" }, { status: 400 });

    if (ids.length > 500)
      return NextResponse.json({ error: "Máximo 500 registros por operação" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (status)        data.status = status;
    if (campaignRole)  data.campaignRole = campaignRole;
    if (supportStatus) data.supportStatus = supportStatus;

    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });

    // Garante que os IDs pertencem à campanha
    const result = await db.collaborator.updateMany({
      where: { id: { in: ids }, campaignId: CID },
      data,
    });

    // Recalcula tiers dos registradores afetados se status mudou
    if (status) {
      const affected = await db.collaborator.findMany({
        where: { id: { in: ids }, campaignId: CID, registeredById: { not: null } },
        select: { registeredById: true },
      });
      const registradores = [...new Set(affected.map((c) => c.registeredById!))];
      await Promise.all(registradores.map((uid) => recalcTier(uid).catch(() => {})));
    }

    return NextResponse.json({ updated: result.count });
  } catch (err) {
    console.error("[collaborators/bulk PATCH]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
