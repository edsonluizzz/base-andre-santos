import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eid = session.user.establishmentId ?? "default-porto-belo";
    const est = await db.establishment.findUnique({
      where: { id: eid },
      select: {
        plan: true,
        stripeStatus: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        stripeCustomerId: true,
      },
    });

    if (!est) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(est);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
