import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

const ROLE_RANK: Record<string, number> = { MEMBER: 0, LEADER: 1, ADMIN: 2 };

const actionSchema = z.object({
  action: z.enum(["APROVAR", "RECUSAR", "ENTREGAR"]),
  notes: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role ?? "MEMBER";
    if ((ROLE_RANK[role] ?? 0) < ROLE_RANK.LEADER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { db, cid } = getCampaignContext(session);
    const { id } = await params;

    const body = await req.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const { action, notes } = parsed.data;

    const mr = await db.materialRequest.findFirst({ where: { id, campaignId: cid } });
    if (!mr) return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (action === "APROVAR") {
      if (mr.status !== "PENDENTE_APROVACAO") return NextResponse.json({ error: "Só é possível aprovar solicitações pendentes" }, { status: 400 });
      data.status = "APROVADO";
      data.approvedById = session.user.id;
      data.approvedAt = new Date();
    } else if (action === "RECUSAR") {
      if (mr.status !== "PENDENTE_APROVACAO") return NextResponse.json({ error: "Só é possível recusar solicitações pendentes" }, { status: 400 });
      data.status = "RECUSADO";
      data.notes = notes ?? null;
    } else if (action === "ENTREGAR") {
      if (mr.status !== "APROVADO") return NextResponse.json({ error: "É preciso aprovar antes de marcar como entregue" }, { status: 400 });
      data.status = "ENTREGUE";
      data.deliveredById = session.user.id;
      data.deliveredAt = new Date();
    }

    const updated = await db.materialRequest.update({ where: { id }, data });
    return NextResponse.json({ materialRequest: updated });
  } catch (err) {
    console.error("[api/materiais/[id]] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { db, cid } = getCampaignContext(session);
    const { id } = await params;

    const existing = await db.materialRequest.findFirst({ where: { id, campaignId: cid } });
    if (!existing) return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });

    await db.materialRequest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/materiais/[id]] DELETE erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
