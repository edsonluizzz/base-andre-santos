import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const settings = await db.settings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton", campaignName: "Base Andre Santos", updatedAt: new Date() },
    });
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[settings GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { campaignName, logoBase64, whatsappGroupLink } = await req.json();
    const settings = await db.settings.upsert({
      where: { id: "singleton" },
      update: {
        ...(campaignName && { campaignName }),
        ...(logoBase64 !== undefined && { logoBase64 }),
        ...(whatsappGroupLink !== undefined && { whatsappGroupLink: whatsappGroupLink || null }),
        updatedAt: new Date(),
      },
      create: {
        id: "singleton",
        campaignName: campaignName ?? "Base Andre Santos",
        logoBase64: logoBase64 ?? null,
        whatsappGroupLink: whatsappGroupLink ?? null,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[settings PUT]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
