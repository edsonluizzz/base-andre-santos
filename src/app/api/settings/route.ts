import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const settings = await db.settings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    churchName: settings?.churchName ?? "Porto Belo",
    logoBase64: settings?.logoBase64 ?? null,
  });
}

export async function PATCH(req: NextRequest) {
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
      churchName: body.churchName ?? "Porto Belo",
      logoBase64: body.logoBase64 ?? null,
    },
  });

  return NextResponse.json({
    churchName: settings.churchName,
    logoBase64: settings.logoBase64,
  });
}
