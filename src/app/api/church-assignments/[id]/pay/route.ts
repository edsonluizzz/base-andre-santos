import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";
import { markAssignmentMemberPaid } from "@/lib/church-payments";
import { generateAndSendReceipt } from "@/lib/receipts";

const bodySchema = z.object({ member: z.enum(["member1", "member2"]) });

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

    const { db, cid: CID } = getCampaignContext(session);
    const result = await markAssignmentMemberPaid(db, params.id, parsed.data.member, CID);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (!result.alreadyPaid) {
      const assignment = await db.churchAssignment.findUnique({
        where: { id: params.id },
        select: { member1Id: true, member2Id: true },
      });
      const collaboratorId = parsed.data.member === "member1" ? assignment?.member1Id : assignment?.member2Id;
      if (collaboratorId) {
        await generateAndSendReceipt(db, collaboratorId, [params.id], CID);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/church-assignments/:id/pay] erro:", err);
    return NextResponse.json({ error: "Erro ao marcar pagamento" }, { status: 500 });
  }
}
