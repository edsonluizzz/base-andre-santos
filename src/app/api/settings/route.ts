import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const settings = await db.settings.findUnique({ where: { id: "singleton" } });
    return NextResponse.json({
      churchName: settings?.churchName ?? "Minha Igreja",
      logoBase64: settings?.logoBase64 ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const settings = await db.settings.upsert({
      where: { id: "singleton" },
      update: {
        ...(body.churchName !== undefined && { churchName: body.churchName }),
        ...(body.logoBase64 !== undefined && { logoBase64: body.logoBase64 }),
      },
      create: {
        id: "singleton",
        churchName: body.churchName ?? "Minha Igreja",
        logoBase64: body.logoBase64 ?? null,
      },
    });

    return NextResponse.json({
      churchName: settings.churchName,
      logoBase64: settings.logoBase64,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
