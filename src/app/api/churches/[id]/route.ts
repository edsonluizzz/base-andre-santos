import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  regional: z.string().max(100).nullable().optional(),
  denominacao: z.string().max(100).nullable().optional(),
  pastorId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem editar igrejas" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { name, regional, denominacao, pastorId } = parsed.data;

    const { db, cid: CID } = getCampaignContext(session);

    const church = await db.church.findFirst({ where: { id: params.id, campaignId: CID }, select: { id: true } });
    if (!church) {
      return NextResponse.json({ error: "Igreja não encontrada" }, { status: 404 });
    }

    if (pastorId) {
      const pastor = await db.collaborator.findFirst({ where: { id: pastorId, campaignId: CID }, select: { id: true } });
      if (!pastor) {
        return NextResponse.json({ error: "Colaborador inválido" }, { status: 400 });
      }
    }

    const updated = await db.church.update({
      where: { id: church.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(regional !== undefined && { regional: regional?.trim() || null }),
        ...(denominacao !== undefined && { denominacao: denominacao?.trim() || null }),
        ...(pastorId !== undefined && { pastorId: pastorId || null }),
      },
      select: { id: true },
    });

    return NextResponse.json({ id: updated.id });
  } catch (err) {
    console.error("[api/churches/:id PATCH] erro:", err);
    return NextResponse.json({ error: "Erro ao editar igreja" }, { status: 500 });
  }
}
