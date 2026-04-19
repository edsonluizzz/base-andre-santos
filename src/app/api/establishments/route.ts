import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const establishments = await db.establishment.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(establishments);
  } catch (err) {
    console.error("[establishments] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
