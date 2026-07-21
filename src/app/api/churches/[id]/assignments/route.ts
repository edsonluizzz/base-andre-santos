import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { assertDistinctMembers } from "@/lib/churches";

const assignSchema = z.object({
  member1Id: z.string().min(1),
  member2Id: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem atribuir duplas" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { member1Id, member2Id } = parsed.data;

    try {
      assertDistinctMembers(member1Id, member2Id);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Dupla inválida" }, { status: 400 });
    }

    const { db, cid: CID } = getCampaignContext(session);

    const church = await db.church.findFirst({ where: { id: params.id, campaignId: CID }, select: { id: true } });
    if (!church) {
      return NextResponse.json({ error: "Igreja não encontrada" }, { status: 404 });
    }

    const [m1, m2] = await Promise.all([
      db.collaborator.findFirst({ where: { id: member1Id, campaignId: CID }, select: { id: true } }),
      db.collaborator.findFirst({ where: { id: member2Id, campaignId: CID }, select: { id: true } }),
    ]);
    if (!m1 || !m2) {
      return NextResponse.json({ error: "Colaborador inválido" }, { status: 400 });
    }

    const assignment = await db.churchAssignment.create({
      data: {
        churchId: church.id,
        member1Id,
        member2Id,
        assignedById: session.user.id,
        status: "PENDENTE",
      },
      select: { id: true },
    });

    return NextResponse.json({ id: assignment.id }, { status: 201 });
  } catch (err) {
    console.error("[api/churches/:id/assignments] erro:", err);
    return NextResponse.json({ error: "Erro ao atribuir dupla" }, { status: 500 });
  }
}
