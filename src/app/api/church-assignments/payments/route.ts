import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";

type PendingAssignment = {
  assignmentId: string;
  churchName: string;
  deliveredAt: string | null;
  member: "member1" | "member2";
};
type CollaboratorRow = {
  collaboratorId: string;
  name: string;
  deliveredCount: number;
  paidCount: number;
  pendingCount: number;
  amountPending: number;
  amountPaid: number;
  pendingAssignments: PendingAssignment[];
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem ver o financeiro" }, { status: 403 });
    }

    const { db, cid: CID } = getCampaignContext(session);

    const settings = await db.settings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton", campaignName: "Base Andre Santos", updatedAt: new Date() },
      select: { deliveryPaymentValue: true },
    });
    const rate = settings.deliveryPaymentValue;

    const assignments = await db.churchAssignment.findMany({
      where: { status: "ENTREGUE", church: { campaignId: CID } },
      select: {
        id: true,
        deliveredAt: true,
        member1PaidAt: true,
        member2PaidAt: true,
        member1: { select: { id: true, name: true } },
        member2: { select: { id: true, name: true } },
        church: { select: { name: true } },
      },
    });

    const map = new Map<string, CollaboratorRow>();
    function touch(
      collaboratorId: string,
      name: string,
      paidAt: Date | null,
      assignmentId: string,
      churchName: string,
      deliveredAt: Date | null,
      member: "member1" | "member2",
    ) {
      let row = map.get(collaboratorId);
      if (!row) {
        row = {
          collaboratorId, name,
          deliveredCount: 0, paidCount: 0, pendingCount: 0,
          amountPending: 0, amountPaid: 0,
          pendingAssignments: [],
        };
        map.set(collaboratorId, row);
      }
      row.deliveredCount++;
      if (paidAt) {
        row.paidCount++;
        row.amountPaid += rate;
      } else {
        row.pendingCount++;
        row.amountPending += rate;
        row.pendingAssignments.push({
          assignmentId, churchName,
          deliveredAt: deliveredAt ? deliveredAt.toISOString() : null,
          member,
        });
      }
    }

    for (const a of assignments) {
      touch(a.member1.id, a.member1.name, a.member1PaidAt, a.id, a.church.name, a.deliveredAt, "member1");
      touch(a.member2.id, a.member2.name, a.member2PaidAt, a.id, a.church.name, a.deliveredAt, "member2");
    }

    const collaborators = Array.from(map.values()).sort((a, b) => b.amountPending - a.amountPending);
    const totals = collaborators.reduce(
      (acc, c) => ({
        amountPending: acc.amountPending + c.amountPending,
        amountPaid: acc.amountPaid + c.amountPaid,
      }),
      { amountPending: 0, amountPaid: 0 },
    );

    return NextResponse.json({ rate, collaborators, totals });
  } catch (err) {
    console.error("[api/church-assignments/payments] erro:", err);
    return NextResponse.json({ error: "Erro ao gerar relatório financeiro" }, { status: 500 });
  }
}
