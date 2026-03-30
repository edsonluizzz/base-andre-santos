import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json([], { status: 200 });

    // Find user by email to get id
    const user = await db.user.findUnique({
      where: { email: session.user.email ?? "" },
      select: { id: true },
    });

    if (!user) return NextResponse.json([]);

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: [{ read: "asc" }, { createdAt: "desc" }],
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
