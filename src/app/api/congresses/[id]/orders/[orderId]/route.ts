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
    if (!["ADMIN", "LEADER"].includes(session.user?.role ?? ""))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { status, paidAmount, paymentMethod, deliveredAt, notes, size, quantity, totalAmount } = body;

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

    await db.shirtOrder.delete({ where: { id: params.orderId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
