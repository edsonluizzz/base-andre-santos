import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        member: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
