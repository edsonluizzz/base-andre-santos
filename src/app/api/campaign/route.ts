import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CAMPAIGN_ID = "andre-santos-2026";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const campaign = await db.campaign.findUnique({
      where: { id: CAMPAIGN_ID },
      select: { id: true, name: true, joinCode: true },
    });
    return NextResponse.json(campaign ?? {});
  } catch (err) {
    console.error("[campaign GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { joinCode } = await req.json();
    const campaign = await db.campaign.update({
      where: { id: CAMPAIGN_ID },
      data: { ...(joinCode !== undefined && { joinCode }) },
    });
    return NextResponse.json(campaign);
  } catch (err) {
    console.error("[campaign PUT]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
