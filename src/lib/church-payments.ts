import type { PrismaClient } from "@prisma/client";

export type MemberSlot = "member1" | "member2";

export type PendingAssignment = {
  assignmentId: string;
  churchName: string;
  deliveredAt: string | null;
  member: MemberSlot;
  payingEntityId: string | null;
  payingEntityName: string | null;
};
export type ReceiptSummary = {
  id: string;
  pdfUrl: string | null;
  emailStatus: "SKIPPED" | "SENT" | "FAILED";
  whatsappStatus: "SKIPPED" | "SENT" | "FAILED";
};
export type CollaboratorPaymentRow = {
  collaboratorId: string;
  name: string;
  deliveredCount: number;
  paidCount: number;
  pendingCount: number;
  amountPending: number;
  amountPaid: number;
  pendingAssignments: PendingAssignment[];
  latestReceipt: ReceiptSummary | null;
};
export type PaymentsReport = {
  rate: number;
  collaborators: CollaboratorPaymentRow[];
  totals: { amountPending: number; amountPaid: number };
};

/**
 * Filtro de fonte pagadora: undefined = todas; "DEFAULT" = só a fonte padrão
 * (payingEntityId nulo, candidato da própria campanha); string = fonte específica.
 */
export type PayingEntityFilter = string | "DEFAULT" | undefined;

/** Agregado financeiro por colaborador (entregas x pago x devido) + recibo mais recente. */
export async function getPaymentsReport(
  db: PrismaClient,
  campaignId: string,
  payingEntityFilter?: PayingEntityFilter,
): Promise<PaymentsReport> {
  const settings = await db.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", campaignName: "Base Andre Santos", updatedAt: new Date() },
    select: { deliveryPaymentValue: true },
  });
  const rate = settings.deliveryPaymentValue;

  const payingEntityWhere =
    payingEntityFilter === undefined
      ? {}
      : payingEntityFilter === "DEFAULT"
        ? { payingEntityId: null }
        : { payingEntityId: payingEntityFilter };

  const assignments = await db.churchAssignment.findMany({
    where: { status: "ENTREGUE", church: { campaignId }, ...payingEntityWhere },
    select: {
      id: true,
      deliveredAt: true,
      member1PaidAt: true,
      member2PaidAt: true,
      payingEntityId: true,
      payingEntity: { select: { name: true } },
      member1: { select: { id: true, name: true } },
      member2: { select: { id: true, name: true } },
      church: { select: { name: true } },
    },
  });

  const map = new Map<string, CollaboratorPaymentRow>();
  function touch(
    collaboratorId: string,
    name: string,
    paidAt: Date | null,
    assignmentId: string,
    churchName: string,
    deliveredAt: Date | null,
    member: MemberSlot,
    payingEntityId: string | null,
    payingEntityName: string | null,
  ) {
    let row = map.get(collaboratorId);
    if (!row) {
      row = {
        collaboratorId, name,
        deliveredCount: 0, paidCount: 0, pendingCount: 0,
        amountPending: 0, amountPaid: 0,
        pendingAssignments: [],
        latestReceipt: null,
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
        payingEntityId,
        payingEntityName,
      });
    }
  }

  for (const a of assignments) {
    const payingEntityName = a.payingEntity?.name ?? null;
    touch(a.member1.id, a.member1.name, a.member1PaidAt, a.id, a.church.name, a.deliveredAt, "member1", a.payingEntityId, payingEntityName);
    if (a.member2) {
      touch(a.member2.id, a.member2.name, a.member2PaidAt, a.id, a.church.name, a.deliveredAt, "member2", a.payingEntityId, payingEntityName);
    }
  }

  const collaboratorIds = Array.from(map.keys());
  if (collaboratorIds.length > 0) {
    const receipts = await db.paymentReceipt.findMany({
      where: { collaboratorId: { in: collaboratorIds }, ...payingEntityWhere },
      orderBy: { createdAt: "desc" },
      select: { id: true, collaboratorId: true, pdfUrl: true, emailStatus: true, whatsappStatus: true },
    });
    const seen = new Set<string>();
    for (const r of receipts) {
      if (seen.has(r.collaboratorId)) continue;
      seen.add(r.collaboratorId);
      const row = map.get(r.collaboratorId);
      if (row) {
        row.latestReceipt = { id: r.id, pdfUrl: r.pdfUrl, emailStatus: r.emailStatus, whatsappStatus: r.whatsappStatus };
      }
    }
  }

  const collaborators = Array.from(map.values()).sort((a, b) => b.amountPending - a.amountPending);
  const totals = collaborators.reduce(
    (acc, c) => ({
      amountPending: acc.amountPending + c.amountPending,
      amountPaid: acc.amountPaid + c.amountPaid,
    }),
    { amountPending: 0, amountPaid: 0 },
  );

  return { rate, collaborators, totals };
}

export type MarkPaidResult =
  | { ok: true; alreadyPaid: boolean }
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
      member2Id: true,
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
  if (member === "member2" && !assignment.member2Id) {
    return { ok: false, error: "Esta atribuição não tem uma segunda pessoa", status: 400 };
  }

  const alreadyPaid = member === "member1" ? assignment.member1PaidAt : assignment.member2PaidAt;
  if (alreadyPaid) return { ok: true, alreadyPaid: true };

  await db.churchAssignment.update({
    where: { id: assignmentId },
    data: member === "member1" ? { member1PaidAt: new Date() } : { member2PaidAt: new Date() },
  });
  return { ok: true, alreadyPaid: false };
}
