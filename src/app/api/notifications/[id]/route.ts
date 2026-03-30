import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const notification = await db.notification.updateMany({
      where: { id: params.id, userId: user.id },
      data: { read: true },
    });

    return NextResponse.json({ updated: notification.count });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
