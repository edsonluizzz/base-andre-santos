import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { markAssignmentMemberPaid } from "@/lib/church-payments";

const bodySchema = z.object({ collaboratorId: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem marcar pagamento" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const { collaboratorId } = parsed.data;
    const { db, cid: CID } = getCampaignContext(session);

    const pending = await db.churchAssignment.findMany({
      where: {
        status: "ENTREGUE",
        church: { campaignId: CID },
        OR: [
          { member1Id: collaboratorId, member1PaidAt: null },
          { member2Id: collaboratorId, member2PaidAt: null },
        ],
      },
      select: { id: true, member1Id: true },
    });

    for (const a of pending) {
      const member = a.member1Id === collaboratorId ? "member1" : "member2";
      await markAssignmentMemberPaid(db, a.id, member, CID);
    }

    return NextResponse.json({ ok: true, count: pending.length });
  } catch (err) {
    console.error("[api/church-assignments/pay-bulk] erro:", err);
    return NextResponse.json({ error: "Erro ao marcar pagamentos" }, { status: 500 });
  }
}
