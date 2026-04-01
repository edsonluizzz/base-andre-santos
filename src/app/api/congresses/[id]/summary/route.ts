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

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const congress = await db.congress.findFirst({ where: { id: params.id, establishmentId: eid } });
    if (!congress) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const orders = await db.shirtOrder.findMany({
      where: { congressId: params.id },
      select: {
        size: true,
        quantity: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
      },
    });

    // Aggregation by size
    const bySize: Record<string, number> = {};
    for (const order of orders) {
      if (!["CANCELLED"].includes(order.status)) {
        bySize[order.size] = (bySize[order.size] ?? 0) + order.quantity;
      }
    }

    // Aggregation by status
    const byStatus: Record<string, number> = {};
    for (const order of orders) {
      byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
    }

    // Financial summary
    const activeOrders = orders.filter((o) => o.status !== "CANCELLED");
    const totalExpected = activeOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const totalPaid = activeOrders.reduce((s, o) => s + Number(o.paidAmount), 0);
    const totalPending = totalExpected - totalPaid;

    const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XXG"];
    const bySizeSorted = SIZE_ORDER
      .filter((s) => s in bySize)
      .map((s) => ({ size: s, quantity: bySize[s] }));

    return NextResponse.json({
      totalOrders: orders.length,
      activeOrders: activeOrders.length,
      bySize: bySizeSorted,
      byStatus,
      financial: { totalExpected, totalPaid, totalPending },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
