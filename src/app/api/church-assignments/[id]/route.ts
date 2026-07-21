import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

const patchSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ENTREGUE"), photoUrl: z.string().url() }),
  z.object({ status: z.literal("NAO_FOI_POSSIVEL"), notes: z.string().max(500).optional() }),
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }

    const { db, cid: CID } = getCampaignContext(session);

    const collaborator = await db.collaborator.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!collaborator) {
      return NextResponse.json({ error: "Colaborador não encontrado para este usuário" }, { status: 403 });
    }

    const assignment = await db.churchAssignment.findUnique({
      where: { id: params.id },
      select: { member1Id: true, member2Id: true, churchId: true, church: { select: { campaignId: true } } },
    });
    if (!assignment || assignment.church.campaignId !== CID) {
      return NextResponse.json({ error: "Atribuição não encontrada" }, { status: 404 });
    }
    if (assignment.member1Id !== collaborator.id && assignment.member2Id !== collaborator.id) {
      return NextResponse.json({ error: "Você não faz parte desta dupla" }, { status: 403 });
    }

    const latest = await db.churchAssignment.findFirst({
      where: { churchId: assignment.churchId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latest?.id !== params.id) {
      return NextResponse.json(
        { error: "Esta atribuição foi substituída por uma redistribuição mais recente." },
        { status: 409 },
      );
    }

    const data = parsed.data;
    await db.churchAssignment.update({
      where: { id: params.id },
      data:
        data.status === "ENTREGUE"
          ? { status: "ENTREGUE", photoUrl: data.photoUrl, deliveredAt: new Date(), notes: null }
          : { status: "NAO_FOI_POSSIVEL", notes: data.notes?.trim() || null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/church-assignments/:id] erro:", err);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}
