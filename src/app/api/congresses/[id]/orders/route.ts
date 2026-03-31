import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await db.shirtOrder.findMany({
      where: {
        congressId: params.id,
        ...(session.user.role === "MEMBER" ? { createdBy: session.user.id } : {}),
      },
      include: { member: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { memberId, size, quantity, totalAmount, paidAmount, paymentMethod, notes, color } = body;

    if (!memberId || !size || !totalAmount) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
    }

    const order = await db.shirtOrder.create({
      data: {
        congressId: params.id,
        memberId,
        size,
        quantity: quantity ?? 1,
        color: color?.trim() || null,
        totalAmount: parseFloat(totalAmount),
        paidAmount: paidAmount ? parseFloat(paidAmount) : 0,
        paymentMethod: paymentMethod || null,
        paymentDate: paidAmount && parseFloat(paidAmount) > 0 ? new Date() : null,
        notes: notes?.trim() || null,
        createdBy: session.user?.id,
      },
      include: { member: { select: { id: true, name: true } } },
    });

    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
