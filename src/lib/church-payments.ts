import type { PrismaClient } from "@prisma/client";

export type MemberSlot = "member1" | "member2";

export type MarkPaidResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function markAssignmentMemberPaid(
  db: PrismaClient,
  assignmentId: string,
  member: MemberSlot,
  campaignId: string,
): Promise<MarkPaidResult> {
  const assignment = await db.churchAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      status: true,
      member1PaidAt: true,
      member2PaidAt: true,
      church: { select: { campaignId: true } },
    },
  });
  if (!assignment || assignment.church.campaignId !== campaignId) {
    return { ok: false, error: "Atribuição não encontrada", status: 404 };
  }
  if (assignment.status !== "ENTREGUE") {
    return { ok: false, error: "Só é possível marcar como pago uma entrega confirmada", status: 400 };
  }

  const alreadyPaid = member === "member1" ? assignment.member1PaidAt : assignment.member2PaidAt;
  if (alreadyPaid) return { ok: true };

  await db.churchAssignment.update({
    where: { id: assignmentId },
    data: member === "member1" ? { member1PaidAt: new Date() } : { member2PaidAt: new Date() },
  });
  return { ok: true };
}
