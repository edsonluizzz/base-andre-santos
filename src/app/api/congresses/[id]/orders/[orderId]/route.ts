import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; orderId: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const congress = await db.congress.findFirst({ where: { id: params.id, establishmentId: eid } });
    if (!congress) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const role = session.user?.role ?? "";
    const isAdminOrLeader = ["ADMIN", "LEADER"].includes(role);
    const isMember = role === "MEMBER";

    const body = await req.json();

    // MEMBERs podem apenas enviar comprovante do próprio pedido
    if (isMember) {
      const { paymentProofUrl } = body;
      if (!paymentProofUrl) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const existing = await db.shirtOrder.findUnique({
        where: { id: params.orderId },
      });

      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const order = await db.shirtOrder.update({
        where: { id: params.orderId },
        data: {
          paymentProofUrl,
          paymentProofUploadedAt: new Date(),
        },
        include: { member: { select: { id: true, name: true } } },
      });

      return NextResponse.json(order);
    }

    if (!isAdminOrLeader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status, paidAmount, paymentMethod, deliveredAt, notes, size, quantity, totalAmount, paymentProofUrl } = body;

    const order = await db.shirtOrder.update({
      where: { id: params.orderId },
      data: {
        ...(status !== undefined && { status }),
        ...(paidAmount !== undefined && { paidAmount: parseFloat(paidAmount) }),
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(deliveredAt !== undefined && { deliveredAt: deliveredAt ? new Date(deliveredAt) : null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(size !== undefined && { size }),
        ...(quantity !== undefined && { quantity }),
        ...(totalAmount !== undefined && { totalAmount: parseFloat(totalAmount) }),
        ...(paymentProofUrl !== undefined && {
          paymentProofUrl: paymentProofUrl || null,
          paymentProofUploadedAt: paymentProofUrl ? new Date() : null,
        }),
        // Auto-set paymentDate when marking as paid
        ...(status === "PAID" && { paymentDate: new Date() }),
        // Auto-set deliveredAt when marking as delivered
        ...(status === "DELIVERED" && { deliveredAt: new Date() }),
      },
      include: { member: { select: { id: true, name: true } } },
    });

    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; orderId: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const congress = await db.congress.findFirst({ where: { id: params.id, establishmentId: eid } });
    if (!congress) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.shirtOrder.delete({ where: { id: params.orderId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
