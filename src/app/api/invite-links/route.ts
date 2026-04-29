import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CAMPAIGN_ID = "andre-santos-2026";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const links = await db.inviteLink.findMany({
      where: { campaignId: CAMPAIGN_ID },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(links);
  } catch (err) {
    console.error("[invite-links GET] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { role, expiresAt } = await req.json();

    const link = await db.inviteLink.create({
      data: {
        campaignId: CAMPAIGN_ID,
        role: role ?? "MEMBER",
        createdBy: session.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (err) {
    console.error("[invite-links POST] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
